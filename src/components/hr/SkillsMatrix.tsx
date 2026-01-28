'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Filter, Download, Search } from 'lucide-react';

export interface SkillData {
  employeeId: string;
  employeeName: string;
  department: string;
  avatar?: string;
  skills: {
    [skillName: string]: number; // 0-5 proficiency level
  };
}

interface SkillsMatrixProps {
  data: SkillData[];
  skillCategories?: string[];
  className?: string;
  onCellClick?: (employee: string, skill: string, level: number) => void;
}

const getProficiencyColor = (level: number): string => {
  if (level === 0) return 'bg-gray-100';
  if (level === 1) return 'bg-red-200';
  if (level === 2) return 'bg-orange-200';
  if (level === 3) return 'bg-yellow-200';
  if (level === 4) return 'bg-lime-200';
  return 'bg-green-400';
};

const getProficiencyLabel = (level: number): string => {
  if (level === 0) return 'None';
  if (level === 1) return 'Beginner';
  if (level === 2) return 'Basic';
  if (level === 3) return 'Intermediate';
  if (level === 4) return 'Advanced';
  return 'Expert';
};

export const SkillsMatrix: React.FC<SkillsMatrixProps> = ({
  data,
  skillCategories,
  className = '',
  onCellClick,
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredCell, setHoveredCell] = useState<{ employee: string; skill: string } | null>(null);

  // Extract all unique skills
  const allSkills = skillCategories || Array.from(
    new Set(data.flatMap(emp => Object.keys(emp.skills)))
  ).sort();

  // Extract all unique departments
  const departments = ['all', ...Array.from(new Set(data.map(emp => emp.department)))];

  // Filter data
  const filteredData = data.filter(emp => {
    const matchesDept = selectedDepartment === 'all' || emp.department === selectedDepartment;
    const matchesSearch = emp.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const exportToCSV = () => {
    const headers = ['Employee', 'Department', ...allSkills];
    const rows = filteredData.map(emp => [
      emp.employeeName,
      emp.department,
      ...allSkills.map(skill => emp.skills[skill] || 0),
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'skills-matrix.csv';
    a.click();
  };

  return (
    <div className={`bg-white rounded-xl shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Skills & Competency Matrix</h2>
        <p className="text-purple-100 text-sm">Team capability overview across all departments</p>
      </div>

      {/* Controls */}
      <div className="p-4 bg-gray-50 border-b border-gray-200 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                aria-label="Search employees"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              aria-label="Filter by department"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept === 'all' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            aria-label="Export to CSV"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 items-center text-sm">
          <span className="font-medium text-gray-700">Proficiency Levels:</span>
          {[0, 1, 2, 3, 4, 5].map(level => (
            <div key={level} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded ${getProficiencyColor(level)} border border-gray-300`} />
              <span className="text-gray-600">{getProficiencyLabel(level)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Matrix */}
      <div className="overflow-auto max-h-[600px]">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-100 z-10">
            <tr>
              <th className="sticky left-0 bg-gray-100 px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300 min-w-[200px]">
                Employee
              </th>
              {allSkills.map(skill => (
                <th
                  key={skill}
                  className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300 min-w-[80px]"
                >
                  <div className="transform -rotate-45 origin-center whitespace-nowrap">
                    {skill}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {filteredData.map((employee, index) => (
                <motion.tr
                  key={employee.employeeId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.02 }}
                  className="border-b border-gray-200 hover:bg-purple-50 transition-colors"
                >
                  <td className="sticky left-0 bg-white px-4 py-3 border-r border-gray-200">
                    <div className="flex items-center gap-3">
                      {employee.avatar ? (
                        <img
                          src={employee.avatar}
                          alt={employee.employeeName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                          {employee.employeeName.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{employee.employeeName}</div>
                        <div className="text-xs text-gray-500 truncate">{employee.department}</div>
                      </div>
                    </div>
                  </td>
                  {allSkills.map(skill => {
                    const level = employee.skills[skill] || 0;
                    const isHovered = hoveredCell?.employee === employee.employeeId && hoveredCell?.skill === skill;
                    
                    return (
                      <td
                        key={skill}
                        className="px-2 py-3 text-center relative"
                        onMouseEnter={() => setHoveredCell({ employee: employee.employeeId, skill })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <motion.div
                          whileHover={{ scale: 1.2 }}
                          className={`w-12 h-12 mx-auto rounded-lg ${getProficiencyColor(level)} border-2 ${
                            isHovered ? 'border-purple-500' : 'border-gray-300'
                          } cursor-pointer flex items-center justify-center font-semibold transition-all`}
                          onClick={() => onCellClick?.(employee.employeeName, skill, level)}
                        >
                          {level > 0 && <span className="text-gray-700">{level}</span>}
                        </motion.div>

                        <AnimatePresence>
                          {isHovered && level > 0 && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="absolute z-20 top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white rounded-lg shadow-xl p-2 whitespace-nowrap text-xs"
                            >
                              {employee.employeeName}<br />
                              <span className="text-purple-300">{skill}</span><br />
                              <span className="font-semibold">{getProficiencyLabel(level)}</span>
                              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="text-center py-12">
            <Info className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No employees match your search criteria</p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-lg p-3">
            <div className="text-gray-600">Total Employees</div>
            <div className="text-2xl font-bold text-purple-600">{filteredData.length}</div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-gray-600">Total Skills Tracked</div>
            <div className="text-2xl font-bold text-blue-600">{allSkills.length}</div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-gray-600">Average Skill Level</div>
            <div className="text-2xl font-bold text-green-600">
              {(
                filteredData.reduce((sum, emp) => 
                  sum + Object.values(emp.skills).reduce((a, b) => a + b, 0) / Object.keys(emp.skills).length
                , 0) / (filteredData.length || 1)
              ).toFixed(1)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillsMatrix;
