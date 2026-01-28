"use client";

import { useState, useEffect } from "react";

interface Checklist {
  id: number;
  name: string;
  checklist_type: string;
  aircraft_type: string;
  version: string;
  items: ChecklistItem[];
  is_active: boolean;
}

interface ChecklistItem {
  id: string;
  section: string;
  item: string;
  response_type: "check" | "value" | "select";
  options?: string[];
  critical: boolean;
  order: number;
}

interface ChecklistCompletion {
  id: number;
  checklist_id: number;
  checklist_name: string;
  aircraft_tail: string;
  completed_by: string;
  completed_at: string;
  flight_id?: number;
  responses: Record<string, any>;
  all_items_checked: boolean;
  signature: string;
  notes?: string;
}

const CHECKLIST_TYPES = [
  { id: "preflight", name: "Pre-Flight", icon: "🔍" },
  { id: "before_start", name: "Before Engine Start", icon: "🔑" },
  { id: "engine_start", name: "Engine Start", icon: "⚡" },
  { id: "before_takeoff", name: "Before Takeoff", icon: "✈️" },
  { id: "cruise", name: "Cruise", icon: "🌤️" },
  { id: "before_landing", name: "Before Landing", icon: "🛬" },
  { id: "after_landing", name: "After Landing", icon: "🅿️" },
  { id: "shutdown", name: "Shutdown", icon: "🔒" },
  { id: "postflight", name: "Post-Flight", icon: "📋" },
  { id: "emergency", name: "Emergency", icon: "🚨" },
];

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [completions, setCompletions] = useState<ChecklistCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [activeView, setActiveView] = useState<"library" | "history" | "complete">("library");
  const [completingChecklist, setCompletingChecklist] = useState<Checklist | null>(null);
  const [checklistResponses, setChecklistResponses] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [checklistsRes, completionsRes] = await Promise.all([
        fetch("/api/hems/aviation/checklists"),
        fetch("/api/hems/aviation/checklists/completions?limit=50"),
      ]);
      if (checklistsRes.ok) {
        const data = await checklistsRes.json();
        setChecklists(data.checklists || []);
      }
      if (completionsRes.ok) {
        const data = await completionsRes.json();
        setCompletions(data.completions || []);
      }
    } catch (err) {
      console.error("Failed to fetch checklists:", err);
    } finally {
      setLoading(false);
    }
  };

  const startChecklist = (checklist: Checklist) => {
    setCompletingChecklist(checklist);
    setChecklistResponses({});
    setActiveView("complete");
  };

  const handleResponseChange = (itemId: string, value: any) => {
    setChecklistResponses(prev => ({ ...prev, [itemId]: value }));
  };

  const getCompletionProgress = () => {
    if (!completingChecklist) return 0;
    const totalItems = completingChecklist.items.length;
    const completedItems = Object.keys(checklistResponses).length;
    return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
  };

  const groupedItems = completingChecklist?.items.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = [];
    acc[item.section].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-purple-700 to-indigo-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <div>
              <h1 className="text-2xl font-bold">Flight Checklists</h1>
              <p className="text-purple-100 text-sm">Pre/Post-Flight & Safety Checklists</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b">
            <div className="flex">
              {(["library", "history"] as const).map(view => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={`px-6 py-3 text-sm font-medium capitalize ${activeView === view || (activeView === "complete" && view === "library") ? "border-b-2 border-purple-500 text-purple-700 bg-purple-50" : "text-gray-600 hover:text-gray-900"}`}
                >
                  {view === "library" ? "Checklist Library" : "Completion History"}
                </button>
              ))}
            </div>
          </div>

          {activeView === "library" && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CHECKLIST_TYPES.map(type => {
                  const typeChecklists = checklists.filter(c => c.checklist_type === type.id && c.is_active);
                  return (
                    <div key={type.id} className="border rounded-xl overflow-hidden">
                      <div className="p-4 bg-gray-50 border-b">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{type.icon}</span>
                          <span className="font-semibold text-gray-900">{type.name}</span>
                        </div>
                      </div>
                      <div className="p-4">
                        {typeChecklists.length > 0 ? (
                          <div className="space-y-2">
                            {typeChecklists.map(cl => (
                              <div
                                key={cl.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-purple-50 cursor-pointer transition-colors"
                                onClick={() => setSelectedChecklist(cl)}
                              >
                                <div>
                                  <div className="font-medium text-sm">{cl.name}</div>
                                  <div className="text-xs text-gray-500">{cl.aircraft_type} • v{cl.version}</div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startChecklist(cl);
                                  }}
                                  className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                                >
                                  Start
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 text-center py-4">
                            No checklists available
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeView === "history" && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date/Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Checklist</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Aircraft</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Completed By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {completions.map(completion => (
                    <tr key={completion.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div>{new Date(completion.completed_at).toLocaleDateString()}</div>
                        <div className="text-gray-500">{new Date(completion.completed_at).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{completion.checklist_name}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{completion.aircraft_tail}</td>
                      <td className="px-4 py-3 text-sm">{completion.completed_by}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${completion.all_items_checked ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {completion.all_items_checked ? "Complete" : "Partial"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                        {completion.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {completions.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <span className="text-5xl">📋</span>
                  <p className="mt-4">No completion history</p>
                </div>
              )}
            </div>
          )}

          {activeView === "complete" && completingChecklist && (
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{completingChecklist.name}</h2>
                    <p className="text-gray-500">{completingChecklist.aircraft_type} • Version {completingChecklist.version}</p>
                  </div>
                  <button
                    onClick={() => {
                      setCompletingChecklist(null);
                      setActiveView("library");
                    }}
                    className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aircraft</label>
                    <select className="w-full px-3 py-2 border rounded-lg">
                      <option>N123HM</option>
                      <option>N456HM</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Associated Flight</label>
                    <select className="w-full px-3 py-2 border rounded-lg">
                      <option value="">None</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg mb-6">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-purple-800">Progress</span>
                      <span className="text-sm font-bold text-purple-800">{getCompletionProgress()}%</span>
                    </div>
                    <div className="w-full h-3 bg-purple-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full transition-all"
                        style={{ width: `${getCompletionProgress()}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-purple-700">
                    {Object.keys(checklistResponses).length} / {completingChecklist.items.length} items
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {groupedItems && Object.entries(groupedItems).map(([section, items]) => (
                  <div key={section} className="border rounded-xl overflow-hidden">
                    <div className="p-3 bg-gray-100 font-semibold text-gray-700 uppercase text-sm">
                      {section}
                    </div>
                    <div className="divide-y">
                      {items.sort((a, b) => a.order - b.order).map(item => (
                        <div
                          key={item.id}
                          className={`p-4 flex items-center justify-between ${item.critical ? "bg-red-50" : ""}`}
                        >
                          <div className="flex items-center gap-3">
                            {item.critical && <span className="text-red-500 font-bold">!</span>}
                            <span className={item.critical ? "font-medium text-red-800" : ""}>{item.item}</span>
                          </div>
                          <div>
                            {item.response_type === "check" && (
                              <button
                                onClick={() => handleResponseChange(item.id, !checklistResponses[item.id])}
                                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${checklistResponses[item.id] ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-purple-500"}`}
                              >
                                {checklistResponses[item.id] && "✓"}
                              </button>
                            )}
                            {item.response_type === "value" && (
                              <input
                                type="text"
                                value={checklistResponses[item.id] || ""}
                                onChange={(e) => handleResponseChange(item.id, e.target.value)}
                                className="w-32 px-3 py-1 border rounded-lg text-sm"
                                placeholder="Enter value"
                              />
                            )}
                            {item.response_type === "select" && item.options && (
                              <select
                                value={checklistResponses[item.id] || ""}
                                onChange={(e) => handleResponseChange(item.id, e.target.value)}
                                className="px-3 py-1 border rounded-lg text-sm"
                              >
                                <option value="">Select...</option>
                                {item.options.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="Optional notes..." />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Electronic Signature</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-lg" placeholder="Type your name to sign" />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setCompletingChecklist(null);
                      setActiveView("library");
                    }}
                    className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
                    Complete Checklist
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedChecklist && activeView === "library" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between sticky top-0">
              <div>
                <h3 className="text-lg font-bold">{selectedChecklist.name}</h3>
                <p className="text-sm text-gray-500">{selectedChecklist.aircraft_type} • v{selectedChecklist.version}</p>
              </div>
              <button onClick={() => setSelectedChecklist(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-4">
              {Object.entries(selectedChecklist.items.reduce((acc, item) => {
                if (!acc[item.section]) acc[item.section] = [];
                acc[item.section].push(item);
                return acc;
              }, {} as Record<string, ChecklistItem[]>)).map(([section, items]) => (
                <div key={section} className="mb-4">
                  <div className="font-semibold text-gray-700 uppercase text-sm mb-2 pb-1 border-b">{section}</div>
                  <div className="space-y-1">
                    {items.sort((a, b) => a.order - b.order).map(item => (
                      <div key={item.id} className={`flex items-center gap-2 text-sm py-1 ${item.critical ? "text-red-700 font-medium" : ""}`}>
                        {item.critical && <span className="text-red-500">!</span>}
                        <span>{item.item}</span>
                        <span className="text-gray-400 ml-auto">
                          {item.response_type === "check" ? "Check" : item.response_type === "value" ? "Enter Value" : "Select"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0">
              <button onClick={() => setSelectedChecklist(null)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-100">
                Close
              </button>
              <button
                onClick={() => {
                  startChecklist(selectedChecklist);
                  setSelectedChecklist(null);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                Start Checklist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
