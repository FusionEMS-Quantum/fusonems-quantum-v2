'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ArrowLeft,
  Calendar,
  Users,
  Sun,
  Cloud,
  Snowflake,
  PartyPopper,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface DemandPrediction {
  date: string;
  predicted_calls: number;
  confidence: number;
  recommended_staff: number;
  factors: string[];
}

interface ForecastData {
  period_start: string;
  period_end: string;
  total_predicted_calls: number;
  avg_daily_calls: number;
  peak_day: string;
  min_day: string;
  daily_staffing: DemandPrediction[];
}

export default function DemandForecast() {
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [days, setDays] = useState(14);

  useEffect(() => {
    fetchForecast();
  }, [startDate, days]);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        `/api/v1/scheduling/predictive/demand/forecast?start_date=${startDate}&days=${days}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        setForecast(await res.json());
      }
    } catch (error) {
      console.error('Failed to fetch forecast:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFactorIcon = (factor: string) => {
    if (factor.toLowerCase().includes('weekend')) return <Calendar className="w-3 h-3" />;
    if (factor.toLowerCase().includes('holiday')) return <PartyPopper className="w-3 h-3" />;
    if (factor.toLowerCase().includes('seasonal')) return <Sun className="w-3 h-3" />;
    if (factor.toLowerCase().includes('winter')) return <Snowflake className="w-3 h-3" />;
    return <Cloud className="w-3 h-3" />;
  };

  const handlePrevious = () => {
    const date = new Date(startDate);
    date.setDate(date.getDate() - days);
    setStartDate(date.toISOString().split('T')[0]);
  };

  const handleNext = () => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + days);
    setStartDate(date.toISOString().split('T')[0]);
  };

  const getCallsBarHeight = (calls: number) => {
    const maxCalls = forecast?.daily_staffing
      ? Math.max(...forecast.daily_staffing.map(d => d.predicted_calls))
      : 100;
    return Math.max(10, (calls / maxCalls) * 100);
  };

  const isHighDemand = (calls: number) => calls > 50;
  const isLowDemand = (calls: number) => calls < 35;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <TrendingUp className="w-8 h-8 text-green-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/scheduling/predictive" className="text-zinc-400 hover:text-white flex items-center mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <span>Demand Forecast</span>
            </h1>
            <p className="text-zinc-400 mt-1">AI-Powered Call Volume Prediction</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
            <button
              onClick={fetchForecast}
              className="flex items-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {forecast && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                <p className="text-sm text-zinc-400 mb-1">Total Predicted</p>
                <p className="text-3xl font-bold text-green-400">
                  {Math.round(forecast.total_predicted_calls)}
                </p>
                <p className="text-xs text-zinc-500">calls this period</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
                <p className="text-sm text-zinc-400 mb-1">Daily Average</p>
                <p className="text-3xl font-bold text-blue-400">
                  {Math.round(forecast.avg_daily_calls)}
                </p>
                <p className="text-xs text-zinc-500">calls per day</p>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/50 rounded-xl p-4">
                <p className="text-sm text-zinc-400 mb-1">Peak Day</p>
                <p className="text-lg font-bold text-orange-400">
                  {new Date(forecast.peak_day).toLocaleDateString('en-US', { 
                    weekday: 'short', month: 'short', day: 'numeric' 
                  })}
                </p>
                <p className="text-xs text-zinc-500">highest volume</p>
              </div>
              <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-4">
                <p className="text-sm text-zinc-400 mb-1">Lowest Day</p>
                <p className="text-lg font-bold text-green-400">
                  {new Date(forecast.min_day).toLocaleDateString('en-US', { 
                    weekday: 'short', month: 'short', day: 'numeric' 
                  })}
                </p>
                <p className="text-xs text-zinc-500">lowest volume</p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={handlePrevious}
                  className="p-2 hover:bg-zinc-800 rounded-lg"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-semibold">
                  {new Date(forecast.period_start).toLocaleDateString('en-US', { 
                    month: 'long', day: 'numeric' 
                  })} - {new Date(forecast.period_end).toLocaleDateString('en-US', { 
                    month: 'long', day: 'numeric', year: 'numeric' 
                  })}
                </h2>
                <button
                  onClick={handleNext}
                  className="p-2 hover:bg-zinc-800 rounded-lg"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="relative h-64 flex items-end justify-between gap-1">
                {forecast.daily_staffing.map((day) => {
                  const date = new Date(day.date);
                  const barHeight = getCallsBarHeight(day.predicted_calls);
                  const highDemand = isHighDemand(day.predicted_calls);
                  const lowDemand = isLowDemand(day.predicted_calls);
                  
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center group">
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                        <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-3 shadow-lg whitespace-nowrap">
                          <p className="font-medium">{Math.round(day.predicted_calls)} calls</p>
                          <p className="text-sm text-zinc-400">
                            {day.recommended_staff} staff recommended
                          </p>
                          <p className="text-xs text-zinc-500">
                            {Math.round(day.confidence * 100)}% confidence
                          </p>
                          {day.factors.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-zinc-700">
                              {day.factors.map((f, i) => (
                                <p key={i} className="text-xs text-orange-400 flex items-center space-x-1">
                                  {getFactorIcon(f)}
                                  <span>{f}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div
                        className={`w-full rounded-t transition-all cursor-pointer ${
                          highDemand ? 'bg-orange-500 hover:bg-orange-400' :
                          lowDemand ? 'bg-blue-500 hover:bg-blue-400' :
                          'bg-green-500 hover:bg-green-400'
                        }`}
                        style={{ height: `${barHeight}%` }}
                      />
                      
                      <div className="mt-2 text-center">
                        <p className="text-xs text-zinc-400">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {date.getDate()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center space-x-6 mt-6 pt-4 border-t border-zinc-700">
                <span className="flex items-center space-x-2 text-sm">
                  <span className="w-3 h-3 rounded bg-orange-500"></span>
                  <span className="text-zinc-400">High Demand (&gt;50)</span>
                </span>
                <span className="flex items-center space-x-2 text-sm">
                  <span className="w-3 h-3 rounded bg-green-500"></span>
                  <span className="text-zinc-400">Normal (35-50)</span>
                </span>
                <span className="flex items-center space-x-2 text-sm">
                  <span className="w-3 h-3 rounded bg-blue-500"></span>
                  <span className="text-zinc-400">Low Demand (&lt;35)</span>
                </span>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-700">
                <h2 className="text-lg font-semibold">Staffing Recommendations</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-700 text-left">
                      <th className="p-3 text-sm text-zinc-400">Date</th>
                      <th className="p-3 text-sm text-zinc-400">Predicted Calls</th>
                      <th className="p-3 text-sm text-zinc-400">Recommended Staff</th>
                      <th className="p-3 text-sm text-zinc-400">Confidence</th>
                      <th className="p-3 text-sm text-zinc-400">Factors</th>
                      <th className="p-3 text-sm text-zinc-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.daily_staffing.map((day) => {
                      const date = new Date(day.date);
                      const highDemand = isHighDemand(day.predicted_calls);
                      
                      return (
                        <tr key={day.date} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                          <td className="p-3">
                            <div>
                              <p className="font-medium">
                                {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`text-lg font-bold ${
                              highDemand ? 'text-orange-400' : 'text-white'
                            }`}>
                              {Math.round(day.predicted_calls)}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              <Users className="w-4 h-4 text-zinc-400" />
                              <span className="font-medium">{day.recommended_staff}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 h-2 bg-zinc-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-green-500 rounded-full"
                                  style={{ width: `${day.confidence * 100}%` }}
                                />
                              </div>
                              <span className="text-sm text-zinc-400">
                                {Math.round(day.confidence * 100)}%
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {day.factors.map((f, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 text-xs bg-zinc-700 rounded flex items-center space-x-1"
                                >
                                  {getFactorIcon(f)}
                                  <span>{f.split(' ')[0]}</span>
                                </span>
                              ))}
                              {day.factors.length === 0 && (
                                <span className="text-xs text-zinc-500">Normal</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            {highDemand ? (
                              <span className="flex items-center space-x-1 text-orange-400">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-sm">High</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-1 text-green-400">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm">Normal</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
