'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle, CheckCircle, User, Users as UsersIcon } from 'lucide-react';

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  avatar?: string;
  type: 'vacation' | 'sick' | 'personal' | 'other';
  startDate: string;
  endDate: string;
  status: 'approved' | 'pending' | 'rejected';
  department: string;
}

interface TimeOffCalendarProps {
  requests: TimeOffRequest[];
  onRequestClick?: (request: TimeOffRequest) => void;
  className?: string;
  highlightConflicts?: boolean;
}

const typeColors = {
  vacation: { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-100' },
  sick: { bg: 'bg-red-500', text: 'text-red-700', light: 'bg-red-100' },
  personal: { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-100' },
  other: { bg: 'bg-gray-500', text: 'text-gray-700', light: 'bg-gray-100' },
};

const getDaysInMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

const getFirstDayOfMonth = (date: Date): number => {
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isDateInRange = (date: Date, startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  const check = new Date(date);
  check.setHours(12, 0, 0, 0);
  return check >= start && check <= end;
};

export const TimeOffCalendar: React.FC<TimeOffCalendarProps> = ({
  requests,
  onRequestClick,
  className = '',
  highlightConflicts = true,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const today = new Date();

  // Generate calendar grid
  const calendarDays: (Date | null)[] = [];
  
  // Add empty cells for days before the first day of month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  }

  const getRequestsForDate = (date: Date): TimeOffRequest[] => {
    return requests.filter(req => 
      isDateInRange(date, req.startDate, req.endDate) && req.status === 'approved'
    );
  };

  const checkCoverageGap = (date: Date): boolean => {
    if (!highlightConflicts) return false;
    const dayRequests = getRequestsForDate(date);
    const departments = new Set(dayRequests.map(r => r.department));
    
    // Check if more than 30% of any department is out
    for (const dept of departments) {
      const deptRequests = dayRequests.filter(r => r.department === dept);
      const totalInDept = requests.filter(r => r.department === dept).length;
      if (deptRequests.length / totalInDept > 0.3) return true;
    }
    return false;
  };

  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className={`bg-white rounded-xl shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Team Availability</h2>
            <p className="text-indigo-100 text-sm">Time-off calendar and coverage overview</p>
          </div>
          <Calendar className="w-12 h-12 text-white opacity-50" />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousMonth}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 py-2 bg-white/20 rounded-lg min-w-[200px] text-center">
              <span className="font-bold text-lg">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <button
              onClick={goToNextMonth}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors ml-2"
            >
              Today
            </button>
          </div>

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span>{approvedCount} Approved</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span>{pendingCount} Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 text-sm">
          {Object.entries(typeColors).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${colors.bg}`} />
              <span className="capitalize text-gray-700">{type}</span>
            </div>
          ))}
          {highlightConflicts && (
            <div className="flex items-center gap-2 ml-4">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-gray-700">Coverage Gap</span>
            </div>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        <div className="grid grid-cols-7 gap-2">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center font-semibold text-gray-700 text-sm py-2">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayRequests = getRequestsForDate(date);
            const isToday = isSameDay(date, today);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const hasCoverageGap = checkCoverageGap(date);

            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className={`aspect-square border-2 rounded-lg p-2 cursor-pointer transition-all ${
                  isToday ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'
                } ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
                onClick={() => setSelectedDate(date)}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-1">
                    <span className={`text-sm font-semibold ${isToday ? 'text-indigo-600' : 'text-gray-900'}`}>
                      {date.getDate()}
                    </span>
                    {hasCoverageGap && (
                      <AlertTriangle className="w-3 h-3 text-orange-500" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1 overflow-hidden">
                    {dayRequests.slice(0, 3).map((request, idx) => {
                      const colors = typeColors[request.type];
                      return (
                        <motion.div
                          key={request.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`${colors.light} ${colors.text} text-xs px-1 py-0.5 rounded truncate cursor-pointer hover:shadow-md transition-shadow`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestClick?.(request);
                          }}
                        >
                          {request.employeeName.split(' ')[0]}
                        </motion.div>
                      );
                    })}
                    {dayRequests.length > 3 && (
                      <div className="text-xs text-gray-500 px-1">
                        +{dayRequests.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 bg-gray-50"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  {selectedDate.toLocaleDateString('default', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {getRequestsForDate(selectedDate).length > 0 ? (
                <div className="space-y-2">
                  {getRequestsForDate(selectedDate).map(request => {
                    const colors = typeColors[request.type];
                    return (
                      <motion.div
                        key={request.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`${colors.light} border-2 ${colors.bg.replace('bg-', 'border-')} rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow`}
                        onClick={() => onRequestClick?.(request)}
                      >
                        <div className="flex items-center gap-3">
                          {request.avatar ? (
                            <img
                              src={request.avatar}
                              alt={request.employeeName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center`}>
                              <User className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{request.employeeName}</div>
                            <div className="text-xs text-gray-600">{request.department}</div>
                          </div>
                          <div className="text-right">
                            <div className={`${colors.text} text-xs font-medium capitalize`}>
                              {request.type}
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <UsersIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No time-off requests for this day</p>
                  <p className="text-sm text-gray-400 mt-1">Full team availability</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TimeOffCalendar;
