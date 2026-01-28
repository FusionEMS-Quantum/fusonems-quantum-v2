'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Zap,
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Settings,
  Brain,
  Target,
  TrendingUp,
} from 'lucide-react';

interface OptimizationSettings {
  balanceFairness: boolean;
  respectPreferences: boolean;
  minimizeFatigue: boolean;
  optimizeSkillMix: boolean;
  fillCriticalFirst: boolean;
  maxOvertimePerPerson: number;
  targetCoverage: number;
}

interface OptimizationResult {
  shiftsOptimized: number;
  assignmentsCreated: number;
  coverageImprovement: number;
  fatigueReduction: number;
  skillGapsClosed: number;
  warnings: string[];
}

export default function AutoOptimizer() {
  const [settings, setSettings] = useState<OptimizationSettings>({
    balanceFairness: true,
    respectPreferences: true,
    minimizeFatigue: true,
    optimizeSkillMix: true,
    fillCriticalFirst: true,
    maxOvertimePerPerson: 20,
    targetCoverage: 100,
  });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');

  const runOptimization = async () => {
    setRunning(true);
    setResult(null);

    await new Promise(resolve => setTimeout(resolve, 3000));

    setResult({
      shiftsOptimized: 42,
      assignmentsCreated: 67,
      coverageImprovement: 15,
      fatigueReduction: 23,
      skillGapsClosed: 8,
      warnings: [
        '3 shifts still need manual review due to certification requirements',
        '2 employees at maximum overtime threshold',
      ],
    });

    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/scheduling/predictive" className="text-zinc-400 hover:text-white flex items-center mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Zap className="w-8 h-8 text-yellow-500" />
              <span>Auto-Optimizer</span>
            </h1>
            <p className="text-zinc-400 mt-1">One-Click AI Schedule Optimization</p>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <span>Select Schedule Period</span>
          </h2>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-3"
          >
            <option value="">Choose a schedule period to optimize...</option>
            <option value="current">Current Week (Jan 27 - Feb 2)</option>
            <option value="next">Next Week (Feb 3 - Feb 9)</option>
            <option value="month">February 2026</option>
          </select>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-700 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-zinc-400" />
            <span>Optimization Settings</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700">
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-purple-400" />
                <span>Balance Fairness</span>
              </div>
              <input
                type="checkbox"
                checked={settings.balanceFairness}
                onChange={(e) => setSettings({ ...settings, balanceFairness: e.target.checked })}
                className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-orange-500 focus:ring-orange-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>Respect Preferences</span>
              </div>
              <input
                type="checkbox"
                checked={settings.respectPreferences}
                onChange={(e) => setSettings({ ...settings, respectPreferences: e.target.checked })}
                className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-orange-500 focus:ring-orange-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700">
              <div className="flex items-center space-x-3">
                <Brain className="w-5 h-5 text-orange-400" />
                <span>Minimize Fatigue</span>
              </div>
              <input
                type="checkbox"
                checked={settings.minimizeFatigue}
                onChange={(e) => setSettings({ ...settings, minimizeFatigue: e.target.checked })}
                className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-orange-500 focus:ring-orange-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700">
              <div className="flex items-center space-x-3">
                <Target className="w-5 h-5 text-blue-400" />
                <span>Optimize Skill Mix</span>
              </div>
              <input
                type="checkbox"
                checked={settings.optimizeSkillMix}
                onChange={(e) => setSettings({ ...settings, optimizeSkillMix: e.target.checked })}
                className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-orange-500 focus:ring-orange-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <span>Fill Critical First</span>
              </div>
              <input
                type="checkbox"
                checked={settings.fillCriticalFirst}
                onChange={(e) => setSettings({ ...settings, fillCriticalFirst: e.target.checked })}
                className="w-5 h-5 rounded bg-zinc-700 border-zinc-600 text-orange-500 focus:ring-orange-500"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-3 bg-zinc-800 rounded-lg">
              <label className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Max Overtime (hrs/person)</span>
                <span className="font-bold">{settings.maxOvertimePerPerson}h</span>
              </label>
              <input
                type="range"
                min="0"
                max="40"
                value={settings.maxOvertimePerPerson}
                onChange={(e) => setSettings({ ...settings, maxOvertimePerPerson: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div className="p-3 bg-zinc-800 rounded-lg">
              <label className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Target Coverage</span>
                <span className="font-bold">{settings.targetCoverage}%</span>
              </label>
              <input
                type="range"
                min="80"
                max="120"
                value={settings.targetCoverage}
                onChange={(e) => setSettings({ ...settings, targetCoverage: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <button
          onClick={runOptimization}
          disabled={!selectedPeriod || running}
          className="w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:from-zinc-700 disabled:to-zinc-700 rounded-xl text-lg font-semibold flex items-center justify-center space-x-3 transition-all"
        >
          {running ? (
            <>
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Optimizing Schedule...</span>
            </>
          ) : (
            <>
              <Zap className="w-6 h-6" />
              <span>Run Optimization</span>
            </>
          )}
        </button>

        {result && (
          <div className="mt-6 bg-zinc-900 rounded-xl border border-green-500 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h2 className="text-lg font-semibold">Optimization Complete</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-green-400">{result.shiftsOptimized}</p>
                <p className="text-xs text-zinc-400">Shifts Optimized</p>
              </div>
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{result.assignmentsCreated}</p>
                <p className="text-xs text-zinc-400">Assignments Made</p>
              </div>
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-purple-400">+{result.coverageImprovement}%</p>
                <p className="text-xs text-zinc-400">Coverage Improved</p>
              </div>
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-orange-400">-{result.fatigueReduction}%</p>
                <p className="text-xs text-zinc-400">Fatigue Reduced</p>
              </div>
              <div className="text-center p-3 bg-zinc-800 rounded-lg">
                <p className="text-2xl font-bold text-yellow-400">{result.skillGapsClosed}</p>
                <p className="text-xs text-zinc-400">Skill Gaps Closed</p>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-400 mb-2">Attention Required</p>
                    <ul className="space-y-1">
                      {result.warnings.map((w, i) => (
                        <li key={i} className="text-sm text-zinc-300">• {w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium">
                Review & Publish
              </button>
              <button className="flex-1 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium">
                View Changes
              </button>
              <button className="px-6 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-medium">
                Undo
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold mb-3 flex items-center space-x-2">
            <Brain className="w-5 h-5 text-orange-400" />
            <span>How Auto-Optimization Works</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-400">
            <div className="flex items-start space-x-3">
              <TrendingUp className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Demand-Based Staffing</p>
                <p>Uses AI predictions to match staffing levels with expected call volume</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Users className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Fair Distribution</p>
                <p>Balances hours and shift types across all crew members</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Target className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Skill Optimization</p>
                <p>Ensures each shift has the right mix of certifications and experience</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Fatigue Prevention</p>
                <p>Avoids consecutive long shifts and maintains rest requirements</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
