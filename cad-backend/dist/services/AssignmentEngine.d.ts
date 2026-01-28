import { Unit, Incident, UUID } from '../types';
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
export declare class AssignmentEngine {
    private static readonly WEIGHT_DISTANCE;
    private static readonly WEIGHT_QUALIFICATIONS;
    private static readonly WEIGHT_PERFORMANCE;
    private static readonly WEIGHT_FATIGUE;
    private static readonly MAX_DISTANCE_MILES;
    private static readonly OPTIMAL_DISTANCE_MILES;
    private static readonly MAX_SHIFT_HOURS;
    private static readonly FATIGUE_THRESHOLD_HOURS;
    /**
     * Find and score the top 3 unit recommendations for an incident
     */
    findBestUnits(incident: Incident, availableUnits: Unit[], maxRecommendations?: number): Promise<AssignmentRecommendation>;
    /**
     * Score a single unit for an incident
     */
    private scoreUnit;
    /**
     * Calculate distance-based score (0-100)
     */
    private calculateDistanceScore;
    /**
     * Calculate qualification match score (0-100)
     */
    private calculateQualificationScore;
    /**
     * Calculate performance score (0-100)
     */
    private calculatePerformanceScore;
    /**
     * Calculate fatigue score (0-100)
     */
    private calculateFatigueScore;
    /**
     * Calculate distance between unit and incident (simplified)
     * In production, use proper geospatial library like turf.js
     */
    private calculateDistance;
    /**
     * Get detailed explanation for an assignment recommendation
     */
    getAssignmentExplanation(score: UnitScore): string;
    /**
     * Check if a unit assignment is acceptable (meets minimum thresholds)
     */
    isAssignmentAcceptable(score: UnitScore): boolean;
}
//# sourceMappingURL=AssignmentEngine.d.ts.map