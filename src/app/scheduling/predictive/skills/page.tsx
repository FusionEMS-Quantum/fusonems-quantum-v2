'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Target,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  User,
  RefreshCw,
  Search,
  BookOpen,
  Award,
  Clock,
} from 'lucide-react';

interface SkillDecay {
  user_id: number;
  skill_name: string;
  last_performed: string | null;
  days_since_use: number;
  decay_level: string;
  recommended_action: string;
}

interface CrewMember {
  id: number;
  name: string;
  skills: SkillDecay[];
}

const SKILL_DISPLAY_NAMES: Record<string, string> = {
  cardiac_arrest_management: 'Cardiac Arrest',
  advanced_airway: 'Advanced Airway',
  pediatric_resuscitation: 'Pediatric Resus',
  trauma_assessment: 'Trauma',
  medication_administration: 'Medications',
  iv_access: 'IV Access',
  ecg_interpretation: 'ECG Interp',
  childbirth_delivery: 'OB Delivery',
  psychiatric_emergency: 'Psych Emergency',
  hazmat_response: 'HazMat',
};

export default function SkillsMatrix() {
  const [crewData, setCrewData] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDecay, setFilterDecay] = useState<string>('all');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');

  useEffect(() => {
    fetchSkillsData();
  }, []);

  const fetchSkillsData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      const usersRes = await fetch('/api/v1/users?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!usersRes.ok) {
        setLoading(false);
        return;
      }
      
      const users = await usersRes.json();
      const crewWithSkills: CrewMember[] = [];
      
      for (const user of users.slice(0, 20)) {
        try {
          const skillsRes = await fetch(`/api/v1/scheduling/predictive/skills/${user.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          
          if (skillsRes.ok) {
            const skills = await skillsRes.json();
            crewWithSkills.push({
              id: user.id,
              name: user.full_name || `User ${user.id}`,
              skills,
            });
          }
        } catch {
          continue;
        }
      }
      
      setCrewData(crewWithSkills);
    } catch (error) {
      console.error('Failed to fetch skills data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDecayColor = (level: string) => {
    switch (level) {
      case 'expired': return 'bg-red-500 text-white';
      case 'refresher_required': return 'bg-orange-500 text-white';
      case 'refresher_recommended': return 'bg-yellow-500 text-black';
      case 'current': return 'bg-green-500 text-white';
      default: return 'bg-zinc-600 text-white';
    }
  };

  const getDecayBgColor = (level: string) => {
    switch (level) {
      case 'expired': return 'bg-red-500/20';
      case 'refresher_required': return 'bg-orange-500/20';
      case 'refresher_recommended': return 'bg-yellow-500/20';
      case 'current': return 'bg-green-500/20';
      default: return 'bg-zinc-700';
    }
  };

  const skills = Object.keys(SKILL_DISPLAY_NAMES);

  const filteredCrew = crewData
    .filter(crew => 
      searchTerm === '' || 
      crew.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(crew => {
      if (filterDecay === 'all') return true;
      return crew.skills.some(s => s.decay_level === filterDecay);
    });

  const getSkillStats = () => {
    const stats: Record<string, Record<string, number>> = {};
    skills.forEach(skill => {
      stats[skill] = { current: 0, refresher_recommended: 0, refresher_required: 0, expired: 0 };
    });
    
    crewData.forEach(crew => {
      crew.skills.forEach(skill => {
        if (stats[skill.skill_name]) {
          stats[skill.skill_name][skill.decay_level] = 
            (stats[skill.skill_name][skill.decay_level] || 0) + 1;
        }
      });
    });
    
    return stats;
  };

  const skillStats = getSkillStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Target className="w-8 h-8 text-blue-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-full mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/scheduling/predictive" className="text-zinc-400 hover:text-white flex items-center mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Target className="w-8 h-8 text-blue-500" />
              <span>Skills Matrix</span>
            </h1>
            <p className="text-zinc-400 mt-1">Skill Decay Tracking System</p>
          </div>
          <button
            onClick={fetchSkillsData}
            className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-8">
          {skills.slice(0, 5).map(skill => {
            const stats = skillStats[skill] || {};
            const total = Object.values(stats).reduce((a, b) => a + b, 0);
            const needsAttention = (stats.refresher_required || 0) + (stats.expired || 0);
            
            return (
              <div
                key={skill}
                className={`p-4 rounded-xl border ${
                  needsAttention > 0 ? 'border-orange-500/50 bg-orange-500/10' : 'border-zinc-700 bg-zinc-900'
                }`}
              >
                <h3 className="font-medium text-sm mb-2">{SKILL_DISPLAY_NAMES[skill]}</h3>
                <div className="flex items-baseline space-x-1">
                  <span className="text-2xl font-bold text-green-400">{stats.current || 0}</span>
                  <span className="text-zinc-400 text-sm">/ {total}</span>
                </div>
                {needsAttention > 0 && (
                  <p className="text-xs text-orange-400 mt-1">
                    {needsAttention} need training
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search crew..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 flex-1 text-sm"
              />
            </div>
            <select
              value={filterDecay}
              onChange={(e) => setFilterDecay(e.target.value)}
              className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="expired">Expired</option>
              <option value="refresher_required">Refresher Required</option>
              <option value="refresher_recommended">Refresher Recommended</option>
              <option value="current">Current</option>
            </select>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-4 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <span className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded bg-green-500"></span>
              <span className="text-xs text-zinc-400">Current</span>
            </span>
            <span className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded bg-yellow-500"></span>
              <span className="text-xs text-zinc-400">Refresher Recommended</span>
            </span>
            <span className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded bg-orange-500"></span>
              <span className="text-xs text-zinc-400">Refresher Required</span>
            </span>
            <span className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded bg-red-500"></span>
              <span className="text-xs text-zinc-400">Expired</span>
            </span>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left p-3 sticky left-0 bg-zinc-900 z-10">Crew Member</th>
                  {skills.map(skill => (
                    <th key={skill} className="p-3 text-center text-xs whitespace-nowrap">
                      {SKILL_DISPLAY_NAMES[skill]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredCrew.length === 0 ? (
                  <tr>
                    <td colSpan={skills.length + 1} className="p-8 text-center text-zinc-500">
                      <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      No crew data available
                    </td>
                  </tr>
                ) : (
                  filteredCrew.map(crew => (
                    <tr key={crew.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                      <td className="p-3 sticky left-0 bg-zinc-900 z-10">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-zinc-400" />
                          <span className="font-medium">{crew.name}</span>
                        </div>
                      </td>
                      {skills.map(skillName => {
                        const skill = crew.skills.find(s => s.skill_name === skillName);
                        if (!skill) {
                          return (
                            <td key={skillName} className="p-3 text-center">
                              <span className="w-6 h-6 inline-block rounded bg-zinc-700 text-zinc-500 text-xs leading-6">
                                -
                              </span>
                            </td>
                          );
                        }
                        
                        return (
                          <td key={skillName} className="p-3 text-center">
                            <div
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${getDecayColor(skill.decay_level)}`}
                              title={`${skill.days_since_use >= 0 ? `${skill.days_since_use} days` : 'Never'} - ${skill.recommended_action}`}
                            >
                              {skill.days_since_use >= 0 ? skill.days_since_use : '?'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-zinc-900 rounded-xl border border-zinc-700 hover:border-orange-500 transition-colors text-left">
            <BookOpen className="w-6 h-6 text-blue-400 mb-2" />
            <h3 className="font-medium">Schedule Training</h3>
            <p className="text-sm text-zinc-400">Assign refresher courses</p>
          </button>
          <button className="p-4 bg-zinc-900 rounded-xl border border-zinc-700 hover:border-orange-500 transition-colors text-left">
            <Award className="w-6 h-6 text-yellow-400 mb-2" />
            <h3 className="font-medium">Certification Report</h3>
            <p className="text-sm text-zinc-400">Export compliance status</p>
          </button>
          <button className="p-4 bg-zinc-900 rounded-xl border border-zinc-700 hover:border-orange-500 transition-colors text-left">
            <Clock className="w-6 h-6 text-green-400 mb-2" />
            <h3 className="font-medium">Simulation Lab</h3>
            <p className="text-sm text-zinc-400">Book hands-on practice</p>
          </button>
        </div>
      </div>
    </div>
  );
}
