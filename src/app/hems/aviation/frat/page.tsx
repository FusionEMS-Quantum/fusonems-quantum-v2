"use client";

import { useState, useEffect } from "react";

interface FRATAssessment {
  id: number;
  flight_id?: number;
  aircraft_tail: string;
  pic_name: string;
  assessment_date: string;
  mission_type: string;
  total_score: number;
  risk_level: string;
  approved: boolean;
  approved_by?: string;
  categories: FRATCategory[];
  mitigations?: string[];
  notes?: string;
}

interface FRATCategory {
  id: string;
  name: string;
  score: number;
  items: FRATItem[];
}

interface FRATItem {
  id: string;
  description: string;
  points: number;
  selected: boolean;
}

const FRAT_TEMPLATE: FRATCategory[] = [
  {
    id: "pilot",
    name: "Pilot Factors",
    score: 0,
    items: [
      { id: "p1", description: "Less than 8 hours of sleep in last 24 hours", points: 3, selected: false },
      { id: "p2", description: "More than 10 hours of duty time today", points: 2, selected: false },
      { id: "p3", description: "Flew more than 6 hours today", points: 3, selected: false },
      { id: "p4", description: "Less than 50 hours in aircraft type (last 90 days)", points: 2, selected: false },
      { id: "p5", description: "First flight in over 7 days", points: 1, selected: false },
      { id: "p6", description: "Personal stress or distraction", points: 3, selected: false },
      { id: "p7", description: "Feeling rushed or pressured", points: 2, selected: false },
      { id: "p8", description: "Illness or medication use", points: 4, selected: false },
    ],
  },
  {
    id: "weather",
    name: "Weather Factors",
    score: 0,
    items: [
      { id: "w1", description: "Ceiling below 1500 feet", points: 3, selected: false },
      { id: "w2", description: "Visibility below 3 miles", points: 3, selected: false },
      { id: "w3", description: "Crosswind > 15 knots", points: 2, selected: false },
      { id: "w4", description: "Gusting winds", points: 2, selected: false },
      { id: "w5", description: "Rain or precipitation", points: 1, selected: false },
      { id: "w6", description: "Thunderstorms in area", points: 4, selected: false },
      { id: "w7", description: "IFR conditions", points: 2, selected: false },
      { id: "w8", description: "Icing conditions", points: 4, selected: false },
      { id: "w9", description: "Mountain obscuration", points: 3, selected: false },
    ],
  },
  {
    id: "environment",
    name: "Environmental Factors",
    score: 0,
    items: [
      { id: "e1", description: "Night operation", points: 2, selected: false },
      { id: "e2", description: "Unfamiliar landing zone", points: 3, selected: false },
      { id: "e3", description: "Confined area operation", points: 2, selected: false },
      { id: "e4", description: "High-density altitude (>5000 ft)", points: 2, selected: false },
      { id: "e5", description: "Obstacle-rich environment", points: 2, selected: false },
      { id: "e6", description: "Limited emergency landing options", points: 3, selected: false },
      { id: "e7", description: "High terrain", points: 2, selected: false },
    ],
  },
  {
    id: "mission",
    name: "Mission Factors",
    score: 0,
    items: [
      { id: "m1", description: "Scene flight (vs interfacility)", points: 2, selected: false },
      { id: "m2", description: "Critical patient condition", points: 2, selected: false },
      { id: "m3", description: "Time-sensitive mission", points: 2, selected: false },
      { id: "m4", description: "Multiple stops required", points: 1, selected: false },
      { id: "m5", description: "Flight > 100 nm one way", points: 1, selected: false },
      { id: "m6", description: "Heavy patient weight", points: 2, selected: false },
    ],
  },
  {
    id: "aircraft",
    name: "Aircraft Factors",
    score: 0,
    items: [
      { id: "a1", description: "MEL items in effect", points: 2, selected: false },
      { id: "a2", description: "Approaching maintenance due", points: 1, selected: false },
      { id: "a3", description: "Recent maintenance performed", points: 1, selected: false },
      { id: "a4", description: "Equipment inoperative", points: 2, selected: false },
    ],
  },
];

const RISK_LEVELS = [
  { max: 15, level: "low", label: "Low Risk", color: "green", action: "PIC discretion - proceed" },
  { max: 25, level: "medium", label: "Medium Risk", color: "yellow", action: "Mitigate risks - consider alternatives" },
  { max: 35, level: "elevated", label: "Elevated Risk", color: "orange", action: "Requires supervisor approval" },
  { max: 999, level: "high", label: "High Risk", color: "red", action: "Flight not recommended - DO NOT fly without Director approval" },
];

export default function FRATPage() {
  const [assessments, setAssessments] = useState<FRATAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"new" | "history">("new");
  const [categories, setCategories] = useState<FRATCategory[]>(JSON.parse(JSON.stringify(FRAT_TEMPLATE)));
  const [selectedAssessment, setSelectedAssessment] = useState<FRATAssessment | null>(null);

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hems/aviation/frat");
      if (res.ok) {
        const data = await res.json();
        setAssessments(data.assessments || []);
      }
    } catch (err) {
      console.error("Failed to fetch FRAT assessments:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (categoryId: string, itemId: string) => {
    setCategories(prev => prev.map(cat => {
      if (cat.id !== categoryId) return cat;
      const newItems = cat.items.map(item => {
        if (item.id !== itemId) return item;
        return { ...item, selected: !item.selected };
      });
      return {
        ...cat,
        items: newItems,
        score: newItems.filter(i => i.selected).reduce((sum, i) => sum + i.points, 0),
      };
    }));
  };

  const totalScore = categories.reduce((sum, cat) => sum + cat.score, 0);
  const riskLevel = RISK_LEVELS.find(r => totalScore <= r.max) || RISK_LEVELS[RISK_LEVELS.length - 1];

  const resetAssessment = () => {
    setCategories(JSON.parse(JSON.stringify(FRAT_TEMPLATE)));
  };

  const getRiskBadgeStyle = (level: string) => {
    switch (level) {
      case "low": return "bg-green-100 text-green-800 border-green-300";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "elevated": return "bg-orange-100 text-orange-800 border-orange-300";
      case "high": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-red-700 to-rose-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <h1 className="text-2xl font-bold">Flight Risk Assessment Tool</h1>
              <p className="text-red-100 text-sm">FRAT - Pre-Flight Risk Evaluation</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveView("new")}
                className={`px-6 py-3 text-sm font-medium ${activeView === "new" ? "border-b-2 border-red-500 text-red-700 bg-red-50" : "text-gray-600 hover:text-gray-900"}`}
              >
                New Assessment
              </button>
              <button
                onClick={() => setActiveView("history")}
                className={`px-6 py-3 text-sm font-medium ${activeView === "history" ? "border-b-2 border-red-500 text-red-700 bg-red-50" : "text-gray-600 hover:text-gray-900"}`}
              >
                Assessment History
              </button>
            </div>
          </div>

          {activeView === "new" && (
            <div className="p-6">
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aircraft</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>N123HM</option>
                    <option>N456HM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mission Type</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>Scene Response</option>
                    <option>Interfacility Transfer</option>
                    <option>Training</option>
                    <option>Positioning</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIC</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    <option>Select pilot...</option>
                  </select>
                </div>
              </div>

              <div className={`mb-6 p-6 rounded-xl border-2 ${riskLevel.color === "green" ? "bg-green-50 border-green-300" : riskLevel.color === "yellow" ? "bg-yellow-50 border-yellow-300" : riskLevel.color === "orange" ? "bg-orange-50 border-orange-300" : "bg-red-50 border-red-300"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600 uppercase font-medium">Total Risk Score</div>
                    <div className={`text-5xl font-bold ${riskLevel.color === "green" ? "text-green-700" : riskLevel.color === "yellow" ? "text-yellow-700" : riskLevel.color === "orange" ? "text-orange-700" : "text-red-700"}`}>
                      {totalScore}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${riskLevel.color === "green" ? "text-green-700" : riskLevel.color === "yellow" ? "text-yellow-700" : riskLevel.color === "orange" ? "text-orange-700" : "text-red-700"}`}>
                      {riskLevel.label}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{riskLevel.action}</div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex gap-1">
                    {[0, 15, 25, 35].map((threshold, i) => (
                      <div key={i} className="flex-1 relative">
                        <div className={`h-3 ${i === 0 ? "bg-green-400 rounded-l" : i === 1 ? "bg-yellow-400" : i === 2 ? "bg-orange-400" : "bg-red-400 rounded-r"}`} />
                        <div className="absolute -top-5 left-0 text-xs text-gray-500">{threshold}</div>
                      </div>
                    ))}
                    <div className="absolute right-0 -top-5 text-xs text-gray-500">35+</div>
                  </div>
                  <div
                    className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-transparent border-b-gray-800 transition-all relative -top-1"
                    style={{ marginLeft: `${Math.min((totalScore / 45) * 100, 100)}%`, transform: "translateX(-50%)" }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                {categories.map(category => (
                  <div key={category.id} className="border rounded-xl overflow-hidden">
                    <div className="p-4 bg-gray-50 flex items-center justify-between">
                      <div className="font-semibold text-gray-900">{category.name}</div>
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${category.score === 0 ? "bg-gray-100 text-gray-600" : category.score <= 5 ? "bg-green-100 text-green-700" : category.score <= 10 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                        {category.score} pts
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {category.items.map(item => (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${item.selected ? "bg-red-50 border border-red-200" : "bg-gray-50 hover:bg-gray-100 border border-transparent"}`}
                        >
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleItem(category.id, item.id)}
                            className="w-5 h-5 rounded"
                          />
                          <span className={`flex-1 text-sm ${item.selected ? "text-red-800" : "text-gray-700"}`}>
                            {item.description}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.selected ? "bg-red-200 text-red-800" : "bg-gray-200 text-gray-600"}`}>
                            +{item.points}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {totalScore >= 25 && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                  <h3 className="font-semibold text-orange-800 mb-2">Risk Mitigations Required</h3>
                  <textarea
                    className="w-full px-3 py-2 border border-orange-300 rounded-lg bg-white"
                    rows={3}
                    placeholder="Document specific mitigations to reduce identified risks..."
                  />
                </div>
              )}

              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                  <textarea className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="Optional notes..." />
                </div>
                <div className="flex justify-between items-center">
                  <button
                    onClick={resetAssessment}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Reset Assessment
                  </button>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100">
                      Save Draft
                    </button>
                    <button className={`px-6 py-2 text-white rounded-lg font-medium ${totalScore > 35 ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
                      {totalScore > 35 ? "Submit for Approval" : "Complete Assessment"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === "history" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aircraft</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">PIC</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Mission</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Risk Level</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assessments.map(assessment => (
                    <tr
                      key={assessment.id}
                      onClick={() => setSelectedAssessment(assessment)}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm">
                        {new Date(assessment.assessment_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{assessment.aircraft_tail}</td>
                      <td className="px-4 py-3 text-sm">{assessment.pic_name}</td>
                      <td className="px-4 py-3 text-sm">{assessment.mission_type}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded font-bold text-sm ${assessment.total_score <= 15 ? "bg-green-100 text-green-700" : assessment.total_score <= 25 ? "bg-yellow-100 text-yellow-700" : assessment.total_score <= 35 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"}`}>
                          {assessment.total_score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getRiskBadgeStyle(assessment.risk_level)}`}>
                          {assessment.risk_level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${assessment.approved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {assessment.approved ? "Approved" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assessments.length === 0 && !loading && (
                <div className="p-12 text-center text-gray-500">
                  <span className="text-5xl">⚠️</span>
                  <p className="mt-4">No FRAT assessments on record</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedAssessment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between sticky top-0">
              <div>
                <h3 className="text-lg font-bold">FRAT Assessment Details</h3>
                <p className="text-sm text-gray-500">{new Date(selectedAssessment.assessment_date).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedAssessment(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-gray-500">Aircraft</div>
                  <div className="font-mono font-medium">{selectedAssessment.aircraft_tail}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">PIC</div>
                  <div className="font-medium">{selectedAssessment.pic_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Mission Type</div>
                  <div className="font-medium">{selectedAssessment.mission_type}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${selectedAssessment.approved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {selectedAssessment.approved ? `Approved by ${selectedAssessment.approved_by}` : "Pending Approval"}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-xl mb-6 ${selectedAssessment.total_score <= 15 ? "bg-green-50" : selectedAssessment.total_score <= 25 ? "bg-yellow-50" : selectedAssessment.total_score <= 35 ? "bg-orange-50" : "bg-red-50"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Total Score</div>
                    <div className={`text-4xl font-bold ${selectedAssessment.total_score <= 15 ? "text-green-700" : selectedAssessment.total_score <= 25 ? "text-yellow-700" : selectedAssessment.total_score <= 35 ? "text-orange-700" : "text-red-700"}`}>
                      {selectedAssessment.total_score}
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-lg text-lg font-bold ${getRiskBadgeStyle(selectedAssessment.risk_level)}`}>
                    {selectedAssessment.risk_level.toUpperCase()}
                  </span>
                </div>
              </div>

              {selectedAssessment.categories?.map(cat => (
                <div key={cat.id} className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{cat.name}</span>
                    <span className="text-sm font-bold text-gray-600">{cat.score} pts</span>
                  </div>
                  <div className="space-y-1">
                    {cat.items.filter(i => i.selected).map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-red-50 rounded text-sm">
                        <span className="text-red-800">{item.description}</span>
                        <span className="font-medium text-red-700">+{item.points}</span>
                      </div>
                    ))}
                    {cat.items.filter(i => i.selected).length === 0 && (
                      <div className="text-sm text-gray-500 italic">No items selected</div>
                    )}
                  </div>
                </div>
              ))}

              {selectedAssessment.mitigations && selectedAssessment.mitigations.length > 0 && (
                <div className="mt-6 p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">Mitigations</h4>
                  <ul className="list-disc list-inside text-sm text-orange-700">
                    {selectedAssessment.mitigations.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAssessment.notes && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600">{selectedAssessment.notes}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end sticky bottom-0">
              <button onClick={() => setSelectedAssessment(null)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
