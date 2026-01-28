'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Check,
  X,
  ChevronRight,
  Bell,
  User,
  CalendarPlus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface MyShift {
  assignment_id: number;
  shift_id: number;
  date: string;
  start_time: string;
  end_time: string;
  station: string | null;
  unit: string | null;
  status: string;
  role: string | null;
  acknowledged: boolean;
  is_overtime: boolean;
}

interface TimeOffRequest {
  id: number;
  request_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string | null;
}

export default function CrewSchedulePage() {
  const [mySchedule, setMySchedule] = useState<MyShift[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'schedule' | 'requests' | 'availability'>('schedule');
  const [loading, setLoading] = useState(true);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);

  const fetchMySchedule = async () => {
    try {
      const res = await fetch('/api/v1/scheduling/my-schedule', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMySchedule(data);
      }
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    }
  };

  const fetchTimeOffRequests = async () => {
    try {
      const res = await fetch('/api/v1/scheduling/time-off', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTimeOffRequests(data);
      }
    } catch (err) {
      console.error('Failed to fetch time-off requests:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMySchedule(), fetchTimeOffRequests()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const acknowledgeShift = async (assignmentId: number) => {
    try {
      const res = await fetch(`/api/v1/scheduling/assignments/${assignmentId}/acknowledge`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        await fetchMySchedule();
      }
    } catch (err) {
      console.error('Failed to acknowledge shift:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-600';
      case 'pending': return 'bg-yellow-600';
      case 'approved': return 'bg-green-600';
      case 'denied': return 'bg-red-600';
      default: return 'bg-zinc-600';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const upcomingShifts = mySchedule.filter(s => new Date(s.date) >= new Date());
  const pendingAcknowledgments = upcomingShifts.filter(s => !s.acknowledged && s.status === 'pending');

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <header className="sticky top-0 z-40 bg-zinc-900 border-b border-zinc-800 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              <span className="text-orange-500">My</span> Schedule
            </h1>
            <p className="text-zinc-400 text-sm">FusionEMS Quantum</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchMySchedule(); fetchTimeOffRequests(); }}
              className="p-2 bg-zinc-800 rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button className="p-2 bg-zinc-800 rounded-lg relative">
              <Bell className="w-5 h-5" />
              {pendingAcknowledgments.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {pendingAcknowledgments.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex mt-4 bg-zinc-800 rounded-lg p-1">
          {[
            { key: 'schedule', label: 'Schedule', icon: Calendar },
            { key: 'requests', label: 'Requests', icon: CalendarPlus },
            { key: 'availability', label: 'Availability', icon: Clock },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'schedule' | 'requests' | 'availability')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${activeTab === tab.key ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-500" />
            <p className="mt-2 text-zinc-400">Loading...</p>
          </div>
        ) : (
          <>
            {activeTab === 'schedule' && (
              <div className="space-y-4">
                {pendingAcknowledgments.length > 0 && (
                  <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      <span className="font-medium text-yellow-400">Action Required</span>
                    </div>
                    <p className="text-sm text-zinc-300">
                      You have {pendingAcknowledgments.length} shift{pendingAcknowledgments.length > 1 ? 's' : ''} requiring acknowledgment
                    </p>
                  </div>
                )}

                <h2 className="text-lg font-semibold text-zinc-300">Upcoming Shifts</h2>

                {upcomingShifts.length === 0 ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
                    <p className="text-zinc-400">No upcoming shifts scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingShifts.map((shift) => (
                      <div
                        key={shift.assignment_id}
                        className={`bg-zinc-900 border rounded-xl p-4 ${!shift.acknowledged ? 'border-orange-600/50' : 'border-zinc-800'}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-lg font-bold">{formatDate(shift.date)}</p>
                            <p className="text-orange-500 font-medium">
                              {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {shift.is_overtime && (
                              <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 text-xs rounded-lg">
                                OVERTIME
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs rounded-lg text-white ${getStatusColor(shift.status)}`}>
                              {shift.status.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-zinc-400">
                            <MapPin className="w-4 h-4" />
                            <span>{shift.station || 'No station assigned'}</span>
                          </div>
                          {shift.unit && (
                            <div className="flex items-center gap-2 text-zinc-400">
                              <User className="w-4 h-4" />
                              <span>Unit: {shift.unit}</span>
                            </div>
                          )}
                          {shift.role && (
                            <div className="flex items-center gap-2 text-zinc-400">
                              <CheckCircle className="w-4 h-4" />
                              <span>Role: {shift.role}</span>
                            </div>
                          )}
                        </div>

                        {!shift.acknowledged && shift.status === 'pending' && (
                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => acknowledgeShift(shift.assignment_id)}
                              className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              Acknowledge
                            </button>
                          </div>
                        )}

                        {shift.acknowledged && (
                          <div className="mt-3 flex items-center gap-2 text-green-500 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span>Acknowledged</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-300">Time-Off Requests</h2>
                  <button
                    onClick={() => setShowTimeOffModal(true)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  >
                    <CalendarPlus className="w-4 h-4" />
                    New Request
                  </button>
                </div>

                {timeOffRequests.length === 0 ? (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
                    <CalendarPlus className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
                    <p className="text-zinc-400">No time-off requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timeOffRequests.map((request) => (
                      <div
                        key={request.id}
                        className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium capitalize">{request.request_type.replace('_', ' ')}</p>
                            <p className="text-sm text-zinc-400">
                              {formatDate(request.start_date)} - {formatDate(request.end_date)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-lg text-white ${getStatusColor(request.status)}`}>
                            {request.status.toUpperCase()}
                          </span>
                        </div>
                        {request.reason && (
                          <p className="text-sm text-zinc-500 mt-2">{request.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'availability' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-300">My Availability</h2>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
                  <Clock className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
                  <p className="text-zinc-400 mb-4">Set your availability for upcoming weeks</p>
                  <button className="px-6 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium transition-colors">
                    Update Availability
                  </button>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                  <h3 className="font-medium mb-3">Quick Set</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
                      Available All Week
                    </button>
                    <button className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
                      Weekdays Only
                    </button>
                    <button className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
                      Weekends Only
                    </button>
                    <button className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
                      Custom Hours
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showTimeOffModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50" onClick={() => setShowTimeOffModal(false)}>
          <div
            className="bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-2xl sm:rounded-xl p-6 w-full sm:max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Request Time Off</h3>
              <button onClick={() => setShowTimeOffModal(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Request Type</label>
                <select className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white">
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal</option>
                  <option value="bereavement">Bereavement</option>
                  <option value="comp_time">Comp Time</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Start Date</label>
                  <input type="date" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">End Date</label>
                  <input type="date" className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Reason (Optional)</label>
                <textarea
                  rows={3}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white resize-none"
                  placeholder="Provide a reason for your request..."
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-orange-600 hover:bg-orange-500 rounded-lg font-medium transition-colors"
              >
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
