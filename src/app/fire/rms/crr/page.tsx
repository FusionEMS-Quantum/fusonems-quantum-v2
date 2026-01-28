"use client";

import { useState, useEffect } from "react";

interface CRRProgram {
  id: number;
  program_name: string;
  program_type: string;
  target_audience: string;
  start_date: string;
  end_date?: string;
  status: string;
  coordinator: string;
  total_contacts: number;
  smoke_alarms_installed: number;
  co_detectors_installed: number;
  home_visits: number;
  presentations: number;
  fire_extinguishers_distributed: number;
  materials_distributed: number;
  risk_reduction_score: number;
  community_area: string;
  budget_allocated: number;
  budget_spent: number;
  notes: string;
}

interface RiskAssessment {
  id: number;
  address: string;
  assessment_date: string;
  assessor: string;
  risk_level: string;
  risk_factors: string[];
  recommendations: string[];
  smoke_alarms_needed: number;
  smoke_alarms_installed: number;
  co_detectors_needed: number;
  co_detectors_installed: number;
  follow_up_required: boolean;
  follow_up_date?: string;
  elderly_resident: boolean;
  disabled_resident: boolean;
  children_present: boolean;
  pets_present: boolean;
  heating_type: string;
  notes: string;
}

const PROGRAM_TYPES = [
  { id: "smoke_alarm", name: "Smoke Alarm Program", icon: "🔔", color: "red" },
  { id: "home_safety", name: "Home Safety Visit", icon: "🏠", color: "blue" },
  { id: "fire_prevention", name: "Fire Prevention Education", icon: "📚", color: "orange" },
  { id: "school_program", name: "School Program", icon: "🏫", color: "green" },
  { id: "senior_outreach", name: "Senior Citizen Outreach", icon: "👴", color: "purple" },
  { id: "juvenile_firesetter", name: "Juvenile Firesetter Intervention", icon: "🧒", color: "yellow" },
  { id: "cpr_training", name: "CPR/First Aid Training", icon: "❤️", color: "pink" },
  { id: "car_seat", name: "Car Seat Installation", icon: "🚗", color: "cyan" },
  { id: "open_house", name: "Fire Station Open House", icon: "🚒", color: "amber" },
  { id: "community_event", name: "Community Event", icon: "🎪", color: "indigo" },
];

const RISK_FACTORS = [
  { id: "smoking", name: "Smoking in Home", severity: "high" },
  { id: "cooking_unattended", name: "Unattended Cooking", severity: "high" },
  { id: "space_heaters", name: "Space Heater Use", severity: "high" },
  { id: "electrical_issues", name: "Electrical Issues", severity: "high" },
  { id: "hoarding", name: "Hoarding Conditions", severity: "critical" },
  { id: "no_smoke_alarm", name: "No Working Smoke Alarm", severity: "critical" },
  { id: "blocked_exits", name: "Blocked Exit Routes", severity: "critical" },
  { id: "candle_use", name: "Candle Use", severity: "medium" },
  { id: "extension_cords", name: "Overloaded Extension Cords", severity: "medium" },
  { id: "dryer_lint", name: "Dryer Lint Buildup", severity: "medium" },
  { id: "bbq_proximity", name: "BBQ Near Structure", severity: "medium" },
  { id: "fireworks", name: "Fireworks Storage", severity: "high" },
];

export default function CommunityRiskReductionPage() {
  const [programs, setPrograms] = useState<CRRProgram[]>([]);
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"programs" | "assessments" | "analytics">("programs");
  const [showNewProgram, setShowNewProgram] = useState(false);
  const [showNewAssessment, setShowNewAssessment] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<CRRProgram | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [programsRes, assessmentsRes] = await Promise.all([
        fetch("/api/fire/rms/crr/programs"),
        fetch("/api/fire/rms/crr/assessments"),
      ]);
      if (programsRes.ok) {
        const data = await programsRes.json();
        setPrograms(data.programs || []);
      }
      if (assessmentsRes.ok) {
        const data = await assessmentsRes.json();
        setAssessments(data.assessments || []);
      }
    } catch (err) {
      console.error("Failed to fetch CRR data:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    activePrograms: programs.filter(p => p.status === "active").length,
    totalContacts: programs.reduce((sum, p) => sum + p.total_contacts, 0),
    smokeAlarmsInstalled: programs.reduce((sum, p) => sum + p.smoke_alarms_installed, 0),
    homeVisits: programs.reduce((sum, p) => sum + p.home_visits, 0),
    highRiskHomes: assessments.filter(a => a.risk_level === "high" || a.risk_level === "critical").length,
    followUpsNeeded: assessments.filter(a => a.follow_up_required).length,
  };

  const getRiskBadge = (level: string) => {
    const styles: Record<string, string> = {
      low: "bg-green-100 text-green-800 border-green-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      high: "bg-orange-100 text-orange-800 border-orange-300",
      critical: "bg-red-100 text-red-800 border-red-300",
    };
    return styles[level] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-green-700 to-teal-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏘️</span>
            <div>
              <h1 className="text-2xl font-bold">Community Risk Reduction</h1>
              <p className="text-green-100 text-sm">Prevention Programs & Risk Assessments</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewAssessment(true)}
              className="px-4 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition-colors"
            >
              + Risk Assessment
            </button>
            <button
              onClick={() => setShowNewProgram(true)}
              className="px-4 py-2 bg-white text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors"
            >
              + New Program
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border-l-4 border-green-500 shadow-sm">
            <div className="text-2xl font-bold text-green-600">{stats.activePrograms}</div>
            <div className="text-sm text-gray-600">Active Programs</div>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{stats.totalContacts.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Community Contacts</div>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-red-500 shadow-sm">
            <div className="text-2xl font-bold text-red-600">{stats.smokeAlarmsInstalled.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Smoke Alarms Installed</div>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">{stats.homeVisits.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Home Visits</div>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-orange-500 shadow-sm">
            <div className="text-2xl font-bold text-orange-600">{stats.highRiskHomes}</div>
            <div className="text-sm text-gray-600">High Risk Homes</div>
          </div>
          <div className="bg-white rounded-lg p-4 border-l-4 border-yellow-500 shadow-sm">
            <div className="text-2xl font-bold text-yellow-600">{stats.followUpsNeeded}</div>
            <div className="text-sm text-gray-600">Follow-ups Needed</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b">
            <div className="flex">
              {(["programs", "assessments", "analytics"] as const).map(view => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={`px-6 py-3 text-sm font-medium capitalize ${activeView === view ? "border-b-2 border-green-500 text-green-700 bg-green-50" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
                >
                  {view === "programs" ? "Prevention Programs" : view === "assessments" ? "Risk Assessments" : "Analytics"}
                </button>
              ))}
            </div>
          </div>

          {activeView === "programs" && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map(program => {
                  const programType = PROGRAM_TYPES.find(t => t.id === program.program_type);
                  return (
                    <div
                      key={program.id}
                      onClick={() => setSelectedProgram(program)}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{programType?.icon || "📋"}</span>
                          <div>
                            <div className="font-semibold text-gray-900">{program.program_name}</div>
                            <div className="text-sm text-gray-500">{programType?.name}</div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${program.status === "active" ? "bg-green-100 text-green-700" : program.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                          {program.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">👥</span>
                          <span className="font-medium">{program.total_contacts}</span>
                          <span className="text-gray-500">contacts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">🏠</span>
                          <span className="font-medium">{program.home_visits}</span>
                          <span className="text-gray-500">visits</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">🔔</span>
                          <span className="font-medium">{program.smoke_alarms_installed}</span>
                          <span className="text-gray-500">alarms</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📊</span>
                          <span className="font-medium">{program.risk_reduction_score}%</span>
                          <span className="text-gray-500">score</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{program.community_area}</span>
                          <span className="text-gray-500">{program.coordinator}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {programs.length === 0 && !loading && (
                <div className="p-12 text-center text-gray-500">
                  <span className="text-5xl">🏘️</span>
                  <p className="mt-4">No prevention programs yet</p>
                </div>
              )}
            </div>
          )}

          {activeView === "assessments" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Risk Level</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Risk Factors</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vulnerable</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Alarms</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Follow-up</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assessments.map(assessment => (
                    <tr key={assessment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{assessment.address}</div>
                        <div className="text-sm text-gray-500">Assessed by {assessment.assessor}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {new Date(assessment.assessment_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase border ${getRiskBadge(assessment.risk_level)}`}>
                          {assessment.risk_level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(assessment.risk_factors || []).slice(0, 3).map(factor => {
                            const rf = RISK_FACTORS.find(r => r.id === factor);
                            return (
                              <span key={factor} className={`px-1.5 py-0.5 rounded text-xs ${rf?.severity === "critical" ? "bg-red-100 text-red-700" : rf?.severity === "high" ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>
                                {rf?.name || factor}
                              </span>
                            );
                          })}
                          {(assessment.risk_factors || []).length > 3 && (
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              +{assessment.risk_factors.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {assessment.elderly_resident && <span title="Elderly" className="text-lg">👴</span>}
                          {assessment.disabled_resident && <span title="Disabled" className="text-lg">♿</span>}
                          {assessment.children_present && <span title="Children" className="text-lg">👶</span>}
                          {assessment.pets_present && <span title="Pets" className="text-lg">🐕</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={assessment.smoke_alarms_installed >= assessment.smoke_alarms_needed ? "text-green-600" : "text-red-600"}>
                            🔔 {assessment.smoke_alarms_installed}/{assessment.smoke_alarms_needed}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {assessment.follow_up_required ? (
                          <div className="text-sm">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                              Due: {assessment.follow_up_date ? new Date(assessment.follow_up_date).toLocaleDateString() : "TBD"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-green-500">✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assessments.length === 0 && !loading && (
                <div className="p-12 text-center text-gray-500">
                  <span className="text-5xl">📋</span>
                  <p className="mt-4">No risk assessments recorded</p>
                </div>
              )}
            </div>
          )}

          {activeView === "analytics" && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>📊</span> Program Performance
                  </h3>
                  <div className="space-y-3">
                    {PROGRAM_TYPES.slice(0, 5).map(type => {
                      const typePrograms = programs.filter(p => p.program_type === type.id);
                      const totalContacts = typePrograms.reduce((sum, p) => sum + p.total_contacts, 0);
                      const maxContacts = Math.max(...programs.map(p => p.total_contacts), 1);
                      return (
                        <div key={type.id}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="flex items-center gap-2">
                              <span>{type.icon}</span>
                              <span>{type.name}</span>
                            </span>
                            <span className="font-medium">{totalContacts.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${(totalContacts / (maxContacts * PROGRAM_TYPES.length)) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>⚠️</span> Risk Factor Distribution
                  </h3>
                  <div className="space-y-3">
                    {RISK_FACTORS.slice(0, 6).map(factor => {
                      const count = assessments.filter(a => (a.risk_factors || []).includes(factor.id)).length;
                      return (
                        <div key={factor.id}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span>{factor.name}</span>
                            <span className={`font-medium ${factor.severity === "critical" ? "text-red-600" : factor.severity === "high" ? "text-orange-600" : "text-yellow-600"}`}>
                              {count}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${factor.severity === "critical" ? "bg-red-500" : factor.severity === "high" ? "bg-orange-500" : "bg-yellow-500"}`}
                              style={{ width: `${assessments.length ? (count / assessments.length) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>🔔</span> Smoke Alarm Impact
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">{stats.smokeAlarmsInstalled}</div>
                      <div className="text-sm text-gray-600">Installed</div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">
                        {assessments.reduce((sum, a) => sum + (a.smoke_alarms_needed - a.smoke_alarms_installed), 0)}
                      </div>
                      <div className="text-sm text-gray-600">Still Needed</div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <span>👥</span> Vulnerable Populations
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                      <span className="text-2xl">👴</span>
                      <div>
                        <div className="font-bold text-purple-700">{assessments.filter(a => a.elderly_resident).length}</div>
                        <div className="text-xs text-gray-600">Elderly</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <span className="text-2xl">♿</span>
                      <div>
                        <div className="font-bold text-blue-700">{assessments.filter(a => a.disabled_resident).length}</div>
                        <div className="text-xs text-gray-600">Disabled</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                      <span className="text-2xl">👶</span>
                      <div>
                        <div className="font-bold text-pink-700">{assessments.filter(a => a.children_present).length}</div>
                        <div className="text-xs text-gray-600">Children</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                      <span className="text-2xl">🐕</span>
                      <div>
                        <div className="font-bold text-amber-700">{assessments.filter(a => a.pets_present).length}</div>
                        <div className="text-xs text-gray-600">Pets</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewProgram && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b bg-green-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-green-900">Create Prevention Program</h3>
              <button onClick={() => setShowNewProgram(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Fall 2024 Smoke Alarm Blitz" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program Type</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    {PROGRAM_TYPES.map(type => (
                      <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>General Public</option>
                    <option>Senior Citizens</option>
                    <option>Low-Income Families</option>
                    <option>School Children</option>
                    <option>Business Owners</option>
                    <option>Multi-Family Residents</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Community Area</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="e.g., Downtown, North District" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program Coordinator</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Allocated</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-lg" placeholder="$" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Program Goals/Notes</label>
                <textarea className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder="Describe program objectives and methods" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowNewProgram(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                  Create Program
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewAssessment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b bg-orange-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-orange-900">New Risk Assessment</h3>
              <button onClick={() => setShowNewAssessment(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="Full address" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Risk Factors Present</label>
                <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
                  {RISK_FACTORS.map(factor => (
                    <label key={factor.id} className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-white ${factor.severity === "critical" ? "text-red-700" : factor.severity === "high" ? "text-orange-700" : "text-yellow-700"}`}>
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm">{factor.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vulnerable Residents</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    <span>👴</span><span className="text-sm">Elderly</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    <span>♿</span><span className="text-sm">Disabled</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    <span>👶</span><span className="text-sm">Children</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    <span>🐕</span><span className="text-sm">Pets</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Smoke Alarms Needed</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-lg" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Smoke Alarms Installed</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-lg" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CO Detectors Needed</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-lg" min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CO Detectors Installed</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-lg" min="0" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heating Type</label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>Central Gas</option>
                  <option>Central Electric</option>
                  <option>Space Heater</option>
                  <option>Wood Stove</option>
                  <option>Fireplace</option>
                  <option>Kerosene Heater</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm font-medium">Follow-up Required</span>
                </label>
                <input type="date" className="px-3 py-2 border rounded-lg text-sm" placeholder="Follow-up date" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes/Recommendations</label>
                <textarea className="w-full px-3 py-2 border rounded-lg" rows={3} />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowNewAssessment(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium">
                  Save Assessment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
