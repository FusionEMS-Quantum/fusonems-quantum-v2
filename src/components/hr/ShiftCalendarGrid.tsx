'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, AlertTriangle, Users, Clock, Plus, Edit2, Trash2 } from 'lucide-react';

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime: string;
  role: string;
  location?: string;
  status: 'scheduled' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  conflicts?: string[];
}

interface ShiftCalendarGridProps {
  shifts: Shift[];
  startDate?: Date;
  onShiftClick?: (shift: Shift) => void;
  onAddShift?: (date: Date, hour: number) => void;
  onEditShift?: (shift: Shift) => void;
  onDeleteShift?: (shiftId: string) => void;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_TO_SHOW = 7;

const getShiftColor = (status: Shift['status'], hasConflicts: boolean): string => {
  if (hasConflicts) return 'bg-red-500 border-red-700';
  switch (status) {
    case 'scheduled': return 'bg-blue-500 border-blue-700';
    case 'confirmed': return 'bg-green-500 border-green-700';
    case 'in-progress': return 'bg-purple-500 border-purple-700';
    case 'completed': return 'bg-gray-500 border-gray-700';
    case 'cancelled': return 'bg-red-400 border-red-600';
    default: return 'bg-blue-500 border-blue-700';
  }
};

export const ShiftCalendarGrid: React.FC<ShiftCalendarGridProps> = ({
  shifts,
  startDate = new Date(),
  onShiftClick,
  onAddShift,
  onEditShift,
  onDeleteShift,
  className = '',
}) => {
  const [currentWeekStart, setCurrentWeekStart] = useState(
    new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  );
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number } | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const weekDays = Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentWeekStart(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  const getShiftsForCell = (date: Date, hour: number): Shift[] => {
    return shifts.filter(shift => {
      const shiftStart = new Date(shift.startTime);
      const shiftHour = shiftStart.getHours();
      return (
        shiftStart.toDateString() === date.toDateString() &&
        shiftHour === hour
      );
    });
  };

  const handleCellClick = (date: Date, hour: number) => {
    const cellShifts = getShiftsForCell(date, hour);
    if (cellShifts.length === 1) {
      setSelectedShift(cellShifts[0]);
      onShiftClick?.(cellShifts[0]);
    } else if (cellShifts.length === 0) {
      onAddShift?.(date, hour);
    }
  };

  const calculateShiftHeight = (shift: Shift): number => {
    const start = new Date(shift.startTime);
    const end = new Date(shift.endTime);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.max(durationHours * 60, 30); // Minimum 30px height
  };

  const conflictCount = shifts.filter(s => s.conflicts && s.conflicts.length > 0).length;

  return (
    <div className={`bg-white rounded-xl shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Shift Schedule</h2>
            <p className="text-cyan-100 text-sm">
              {currentWeekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <Clock className="w-12 h-12 text-white opacity-50" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousWeek}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToToday}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Today
            </button>
            <button
              onClick={goToNextWeek}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {conflictCount > 0 && (
            <div className="flex items-center gap-2 bg-red-500/20 px-3 py-2 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">{conflictCount} Conflict{conflictCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 border-b border-gray-200">
        {['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled'].map(status => {
          const count = shifts.filter(s => s.status === status).length;
          return (
            <div key={status} className="text-center">
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-600 capitalize">{status.replace('-', ' ')}</div>
            </div>
          );
        })}
      </div>

      {/* Calendar Grid */}
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr>
              <th className="border border-gray-300 px-2 py-3 text-xs font-semibold text-gray-700 uppercase w-20">
                Time
              </th>
              {weekDays.map((date, index) => {
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <th
                    key={index}
                    className={`border border-gray-300 px-2 py-3 text-center min-w-[120px] ${
                      isToday ? 'bg-cyan-100' : ''
                    }`}
                  >
                    <div className="text-xs font-semibold text-gray-700 uppercase">
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`text-lg font-bold ${isToday ? 'text-cyan-600' : 'text-gray-900'}`}>
                      {date.getDate()}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {HOURS.map(hour => (
              <tr key={hour}>
                <td className="border border-gray-300 px-2 py-1 text-xs text-gray-600 text-center bg-gray-50">
                  {hour.toString().padStart(2, '0')}:00
                </td>
                {weekDays.map((date, dayIndex) => {
                  const cellShifts = getShiftsForCell(date, hour);
                  const hasConflicts = cellShifts.some(s => s.conflicts && s.conflicts.length > 0);
                  const isHovered = hoveredCell?.day === dayIndex && hoveredCell?.hour === hour;

                  return (
                    <td
                      key={dayIndex}
                      className={`border border-gray-300 p-1 relative h-16 ${
                        isHovered ? 'bg-blue-50' : ''
                      } cursor-pointer transition-colors`}
                      onMouseEnter={() => setHoveredCell({ day: dayIndex, hour })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => handleCellClick(date, hour)}
                    >
                      {cellShifts.map((shift, shiftIndex) => (
                        <motion.div
                          key={shift.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.05, zIndex: 20 }}
                          className={`absolute inset-0 m-0.5 rounded-lg border-2 ${getShiftColor(
                            shift.status,
                            !!shift.conflicts?.length
                          )} text-white p-2 overflow-hidden cursor-pointer`}
                          style={{
                            height: `${calculateShiftHeight(shift)}px`,
                            zIndex: 10 + shiftIndex,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedShift(shift);
                            onShiftClick?.(shift);
                          }}
                        >
                          <div className="text-xs font-semibold truncate">{shift.employeeName}</div>
                          <div className="text-xs opacity-90 truncate">{shift.role}</div>
                          {shift.conflicts && shift.conflicts.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span className="text-xs">Conflict</span>
                            </div>
                          )}
                        </motion.div>
                      ))}

                      {cellShifts.length === 0 && isHovered && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <Plus className="w-6 h-6 text-gray-400" />
                        </motion.div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Shift Detail Modal */}
      <AnimatePresence>
        {selectedShift && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedShift(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedShift.employeeName}</h3>
                  <p className="text-sm text-gray-600">{selectedShift.role}</p>
                </div>
                <button
                  onClick={() => setSelectedShift(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Start Time</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(selectedShift.startTime).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">End Time</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(selectedShift.endTime).toLocaleString()}
                  </span>
                </div>
                {selectedShift.location && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Location</span>
                    <span className="text-sm font-medium text-gray-900">{selectedShift.location}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {selectedShift.status.replace('-', ' ')}
                  </span>
                </div>

                {selectedShift.conflicts && selectedShift.conflicts.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-900 mb-1">Scheduling Conflicts</p>
                        <ul className="text-xs text-red-700 space-y-1">
                          {selectedShift.conflicts.map((conflict, index) => (
                            <li key={index}>• {conflict}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                {onEditShift && (
                  <button
                    onClick={() => {
                      onEditShift(selectedShift);
                      setSelectedShift(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                )}
                {onDeleteShift && (
                  <button
                    onClick={() => {
                      onDeleteShift(selectedShift.id);
                      setSelectedShift(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShiftCalendarGrid;
