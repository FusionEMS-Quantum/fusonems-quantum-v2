import {
  Unit,
  Incident,
  CrewRequirements,
  UnitCapabilities,
  CrewCredentials,
  FatigueRiskLevel,
  UUID,
  Point
} from '../types';

export interface UnitScore {
  unit: Unit;
  totalScore: number;
  distanceScore: number;
  qualificationScore: number;
  performanceScore: number;
  fatigueScore: number;
  distanceMiles: number;
  reasoning: string[];
  warnings: string[];
}

export interface AssignmentRecommendation {
  recommendations: UnitScore[];
  timestamp: Date;
  incidentId: UUID;
}

export class AssignmentEngine {
  // Scoring weights
  private static readonly WEIGHT_DISTANCE = 0.35;
  private static readonly WEIGHT_QUALIFICATIONS = 0.30;
  private static readonly WEIGHT_PERFORMANCE = 0.20;
  private static readonly WEIGHT_FATIGUE = 0.15;

  // Distance scoring parameters
  private static readonly MAX_DISTANCE_MILES = 100;
  private static readonly OPTIMAL_DISTANCE_MILES = 10;

  // Fatigue risk scoring
  private static readonly MAX_SHIFT_HOURS = 24;
  private static readonly FATIGUE_THRESHOLD_HOURS = 12;

  /**
   * Find and score the top 3 unit recommendations for an incident
   */
  async findBestUnits(
    incident: Incident,
    availableUnits: Unit[],
    maxRecommendations: number = 3
  ): Promise<AssignmentRecommendation> {
    // Filter units that are actually available
    const eligibleUnits = availableUnits.filter(unit => 
      unit.status === 'AVAILABLE' && 
      unit.organization_id === incident.organization_id
    );

    // Score each unit
    const scoredUnits: UnitScore[] = [];

    for (const unit of eligibleUnits) {
      const score = await this.scoreUnit(unit, incident);
      scoredUnits.push(score);
    }

    // Sort by total score (descending)
    scoredUnits.sort((a, b) => b.totalScore - a.totalScore);

    // Return top N recommendations
    const topRecommendations = scoredUnits.slice(0, maxRecommendations);

    return {
      recommendations: topRecommendations,
      timestamp: new Date(),
      incidentId: incident.id
    };
  }

  /**
   * Score a single unit for an incident
   */
  private async scoreUnit(unit: Unit, incident: Incident): Promise<UnitScore> {
    const reasoning: string[] = [];
    const warnings: string[] = [];

    // Calculate distance score
    const distanceResult = this.calculateDistanceScore(unit, incident);
    reasoning.push(distanceResult.reasoning);
    if (distanceResult.warning) warnings.push(distanceResult.warning);

    // Calculate qualification score
    const qualificationResult = this.calculateQualificationScore(unit, incident);
    reasoning.push(qualificationResult.reasoning);
    warnings.push(...qualificationResult.warnings);

    // Calculate performance score
    const performanceResult = this.calculatePerformanceScore(unit);
    reasoning.push(performanceResult.reasoning);

    // Calculate fatigue score
    const fatigueResult = this.calculateFatigueScore(unit);
    reasoning.push(fatigueResult.reasoning);
    if (fatigueResult.warning) warnings.push(fatigueResult.warning);

    // Calculate total weighted score
    const totalScore = 
      (distanceResult.score * AssignmentEngine.WEIGHT_DISTANCE) +
      (qualificationResult.score * AssignmentEngine.WEIGHT_QUALIFICATIONS) +
      (performanceResult.score * AssignmentEngine.WEIGHT_PERFORMANCE) +
      (fatigueResult.score * AssignmentEngine.WEIGHT_FATIGUE);

    return {
      unit,
      totalScore: Math.round(totalScore * 100) / 100,
      distanceScore: distanceResult.score,
      qualificationScore: qualificationResult.score,
      performanceScore: performanceResult.score,
      fatigueScore: fatigueResult.score,
      distanceMiles: distanceResult.distanceMiles,
      reasoning,
      warnings
    };
  }

  /**
   * Calculate distance-based score (0-100)
   */
  private calculateDistanceScore(
    unit: Unit,
    incident: Incident
  ): { score: number; distanceMiles: number; reasoning: string; warning?: string } {
    // If we don't have unit location, give neutral score
    if (!unit.current_location) {
      return {
        score: 50,
        distanceMiles: 0,
        reasoning: 'Distance: Unknown (no GPS data)',
        warning: 'Unit location unavailable - GPS tracking recommended'
      };
    }

    // Calculate distance (simplified - in production, use proper geospatial calculation)
    const distanceMiles = this.calculateDistance(unit.current_location, incident);

    // Score calculation: exponential decay from optimal distance
    let score: number;
    if (distanceMiles <= AssignmentEngine.OPTIMAL_DISTANCE_MILES) {
      // Within optimal range: 100 score
      score = 100;
    } else if (distanceMiles >= AssignmentEngine.MAX_DISTANCE_MILES) {
      // Beyond max range: 0 score
      score = 0;
    } else {
      // Linear decay between optimal and max
      const range = AssignmentEngine.MAX_DISTANCE_MILES - AssignmentEngine.OPTIMAL_DISTANCE_MILES;
      const position = distanceMiles - AssignmentEngine.OPTIMAL_DISTANCE_MILES;
      score = 100 * (1 - (position / range));
    }

    const reasoning = `Distance: ${distanceMiles.toFixed(1)} miles (score: ${score.toFixed(0)})`;
    const warning = distanceMiles > 50 ? 'Unit is far from incident location' : undefined;

    return { score, distanceMiles, reasoning, warning };
  }

  /**
   * Calculate qualification match score (0-100)
   */
  private calculateQualificationScore(
    unit: Unit,
    incident: Incident
  ): { score: number; reasoning: string; warnings: string[] } {
    const warnings: string[] = [];
    let score = 100; // Start at 100, deduct for mismatches
    const matches: string[] = [];
    const mismatches: string[] = [];

    const requirements = incident.crew_requirements || {};
    const capabilities = unit.capabilities || {};
    const credentials = unit.crew_credentials || {};

    // Check transport type match
    switch (incident.transport_type) {
      case 'CCT':
        if (unit.unit_type !== 'CCT' && !capabilities.can_do_cct) {
          score -= 40;
          mismatches.push('CCT capability required');
          warnings.push('Unit lacks CCT capability for this transport');
        } else {
          matches.push('CCT capable');
        }
        break;

      case 'HEMS':
        if (unit.unit_type !== 'HEMS') {
          score -= 50;
          mismatches.push('HEMS unit required');
          warnings.push('Non-HEMS unit assigned to HEMS transport');
        } else {
          matches.push('HEMS unit');
        }
        break;

      case 'BARIATRIC':
        if (!capabilities.can_do_bariatric) {
          score -= 40;
          mismatches.push('Bariatric capability required');
          warnings.push('Unit lacks bariatric capability');
        } else {
          matches.push('Bariatric capable');
        }
        break;

      case 'ALS':
        if (!capabilities.can_do_als) {
          score -= 30;
          mismatches.push('ALS capability required');
          warnings.push('Unit may not meet ALS requirements');
        } else {
          matches.push('ALS capable');
        }
        break;
    }

    // Check crew requirements
    if (requirements.requires_paramedic && !credentials.has_paramedic) {
      score -= 25;
      mismatches.push('Paramedic required');
      warnings.push('No paramedic on crew');
    } else if (credentials.has_paramedic) {
      matches.push('Paramedic on crew');
    }

    if (requirements.requires_cct && !credentials.has_cct_certified) {
      score -= 30;
      mismatches.push('CCT certification required');
      warnings.push('Crew lacks CCT certification');
    } else if (credentials.has_cct_certified) {
      matches.push('CCT certified');
    }

    if (requirements.requires_ventilator && !capabilities.has_ventilator) {
      score -= 20;
      mismatches.push('Ventilator required');
      warnings.push('Unit lacks ventilator');
    } else if (capabilities.has_ventilator) {
      matches.push('Ventilator equipped');
    }

    if (requirements.requires_bariatric && !capabilities.can_do_bariatric) {
      score -= 25;
      mismatches.push('Bariatric equipment required');
      warnings.push('Unit lacks bariatric equipment');
    }

    // Check weight capacity for bariatric
    if (incident.patient_weight_lbs && capabilities.max_weight_capacity_lbs) {
      if (incident.patient_weight_lbs > capabilities.max_weight_capacity_lbs) {
        score -= 40;
        mismatches.push(`Weight capacity exceeded (${capabilities.max_weight_capacity_lbs} lbs max)`);
        warnings.push(`Patient weight (${incident.patient_weight_lbs} lbs) exceeds unit capacity`);
      }
    }

    // Ensure score doesn't go below 0
    score = Math.max(0, score);

    const reasoning = mismatches.length > 0
      ? `Qualifications: ${mismatches.join(', ')} (score: ${score.toFixed(0)})`
      : `Qualifications: ${matches.join(', ')} (score: ${score.toFixed(0)})`;

    return { score, reasoning, warnings };
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculatePerformanceScore(unit: Unit): { score: number; reasoning: string } {
    let score = 50; // Neutral baseline
    const factors: string[] = [];

    // On-time arrival percentage
    if (unit.on_time_arrival_pct !== undefined) {
      const onTimeBonus = (unit.on_time_arrival_pct - 50) / 2; // Scale 0-100% to -25 to +25
      score += onTimeBonus;
      factors.push(`${unit.on_time_arrival_pct.toFixed(0)}% on-time`);
    }

    // Compliance audit score
    if (unit.compliance_audit_score !== undefined) {
      const complianceBonus = (unit.compliance_audit_score - 50) / 2;
      score += complianceBonus;
      factors.push(`${unit.compliance_audit_score.toFixed(0)}% compliance`);
    }

    // Average response time
    if (unit.average_response_time_min !== undefined) {
      if (unit.average_response_time_min < 10) {
        score += 10;
        factors.push('fast response');
      } else if (unit.average_response_time_min > 20) {
        score -= 10;
        factors.push('slow response');
      }
    }

    // Experience factor (total incidents completed)
    if (unit.total_incidents_completed !== undefined) {
      if (unit.total_incidents_completed > 1000) {
        score += 10;
        factors.push('highly experienced');
      } else if (unit.total_incidents_completed < 50) {
        score -= 5;
        factors.push('limited experience');
      }
    }

    // Ensure score is within 0-100
    score = Math.max(0, Math.min(100, score));

    const reasoning = `Performance: ${factors.join(', ')} (score: ${score.toFixed(0)})`;
    return { score, reasoning };
  }

  /**
   * Calculate fatigue score (0-100)
   */
  private calculateFatigueScore(unit: Unit): { score: number; reasoning: string; warning?: string } {
    let score = 100; // Start at 100, deduct for fatigue
    let warning: string | undefined;

    const hoursWorked = unit.hours_worked_today || 0;
    const transportHours = unit.transport_hours_today || 0;
    const incidentsToday = unit.incidents_completed_today || 0;

    // Hours worked deduction
    if (hoursWorked > AssignmentEngine.FATIGUE_THRESHOLD_HOURS) {
      const excessHours = hoursWorked - AssignmentEngine.FATIGUE_THRESHOLD_HOURS;
      const fatigueDeduction = (excessHours / AssignmentEngine.MAX_SHIFT_HOURS) * 50;
      score -= fatigueDeduction;
    }

    // Transport hours deduction (more strenuous)
    if (transportHours > 6) {
      score -= ((transportHours - 6) / 12) * 30;
    }

    // Incidents count deduction
    if (incidentsToday > 8) {
      score -= ((incidentsToday - 8) / 12) * 20;
    }

    // Explicit fatigue risk level
    if (unit.fatigue_risk_level) {
      switch (unit.fatigue_risk_level) {
        case 'MODERATE':
          score -= 15;
          break;
        case 'HIGH':
          score -= 35;
          warning = 'Unit has high fatigue risk level';
          break;
        case 'CRITICAL':
          score -= 60;
          warning = 'Unit has CRITICAL fatigue risk - recommend rest period';
          break;
      }
    }

    // Last break time consideration
    if (unit.last_break_time) {
      const hoursSinceBreak = (Date.now() - new Date(unit.last_break_time).getTime()) / (1000 * 60 * 60);
      if (hoursSinceBreak > 6) {
        score -= 10;
        if (!warning) warning = 'No break in over 6 hours';
      }
    }

    // Ensure score is within 0-100
    score = Math.max(0, score);

    const reasoning = `Fatigue: ${hoursWorked.toFixed(1)}h worked, ${incidentsToday} calls today (score: ${score.toFixed(0)})`;
    return { score, reasoning, warning };
  }

  /**
   * Calculate distance between unit and incident (simplified)
   * In production, use proper geospatial library like turf.js
   */
  private calculateDistance(unitLocation: Point, incident: Incident): number {
    // This is a simplified calculation
    // In production, use Haversine formula or geospatial library
    
    // For now, return a mock distance based on unit coordinates
    // Real implementation would calculate from incident origin coordinates
    const [lon, lat] = unitLocation.coordinates;
    
    // Mock calculation - replace with actual geospatial distance
    // Using simple Euclidean distance as placeholder
    const mockDistance = Math.sqrt(
      Math.pow(lon - (-74.0), 2) + Math.pow(lat - 40.7, 2)
    ) * 69; // Rough miles conversion
    
    return Math.max(1, Math.min(mockDistance, 200)); // Clamp between 1-200 miles
  }

  /**
   * Get detailed explanation for an assignment recommendation
   */
  getAssignmentExplanation(score: UnitScore): string {
    const parts: string[] = [
      `Recommendation for ${score.unit.unit_id_display}:`,
      '',
      `Overall Score: ${score.totalScore.toFixed(1)}/100`,
      '',
      'Breakdown:',
      ...score.reasoning.map(r => `  • ${r}`),
    ];

    if (score.warnings.length > 0) {
      parts.push('');
      parts.push('Warnings:');
      parts.push(...score.warnings.map(w => `  ⚠ ${w}`));
    }

    return parts.join('\n');
  }

  /**
   * Check if a unit assignment is acceptable (meets minimum thresholds)
   */
  isAssignmentAcceptable(score: UnitScore): boolean {
    // Minimum total score threshold
    if (score.totalScore < 40) {
      return false;
    }

    // Must meet basic qualifications (at least 60%)
    if (score.qualificationScore < 60) {
      return false;
    }

    // Distance must be reasonable (< 100 miles)
    if (score.distanceMiles > 100) {
      return false;
    }

    // Critical fatigue is unacceptable
    if (score.unit.fatigue_risk_level === 'CRITICAL') {
      return false;
    }

    return true;
  }
}
