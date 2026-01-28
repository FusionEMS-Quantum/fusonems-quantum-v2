'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Users, Award } from 'lucide-react';

export interface PerformanceMetric {
  category: string;
  value: number;
  maxValue?: number;
  previousValue?: number;
}

export interface PerformanceData {
  employeeId: string;
  employeeName: string;
  avatar?: string;
  department: string;
  metrics: PerformanceMetric[];
}

interface PerformanceRadarProps {
  data: PerformanceData[];
  selectedEmployees?: string[];
  className?: string;
  showComparison?: boolean;
}

const getTrendIcon = (current: number, previous?: number) => {
  if (!previous) return <Minus className="w-4 h-4 text-gray-400" />;
  if (current > previous) return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (current < previous) return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
};

const getTrendColor = (current: number, previous?: number): string => {
  if (!previous) return 'text-gray-600';
  if (current > previous) return 'text-green-600';
  if (current < previous) return 'text-red-600';
  return 'text-gray-600';
};

const COLORS = [
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
];

export const PerformanceRadar: React.FC<PerformanceRadarProps> = ({
  data,
  selectedEmployees,
  className = '',
  showComparison = false,
}) => {
  const [activeEmployees, setActiveEmployees] = useState<string[]>(
    selectedEmployees || (data.length > 0 ? [data[0].employeeId] : [])
  );
  const [hoveredEmployee, setHoveredEmployee] = useState<string | null>(null);

  const toggleEmployee = (employeeId: string) => {
    if (activeEmployees.includes(employeeId)) {
      setActiveEmployees(activeEmployees.filter(id => id !== employeeId));
    } else if (activeEmployees.length < 5) {
      setActiveEmployees([...activeEmployees, employeeId]);
    }
  };

  // Transform data for radar chart
  const chartData = data
    .find(emp => activeEmployees.includes(emp.employeeId))
    ?.metrics.map(metric => {
      const dataPoint: any = {
        category: metric.category,
        fullMark: metric.maxValue || 100,
      };
      
      activeEmployees.forEach(empId => {
        const employee = data.find(e => e.employeeId === empId);
        if (employee) {
          const empMetric = employee.metrics.find(m => m.category === metric.category);
          dataPoint[employee.employeeName] = empMetric?.value || 0;
        }
      });
      
      return dataPoint;
    }) || [];

  const activeEmployeesData = data.filter(emp => activeEmployees.includes(emp.employeeId));

  return (
    <div className={`bg-white rounded-xl shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Performance Analysis</h2>
            <p className="text-indigo-100 text-sm">Multi-dimensional performance metrics</p>
          </div>
          <Award className="w-12 h-12 text-white opacity-50" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Employee Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Select Employees
            </h3>
            <span className="text-xs text-gray-500">{activeEmployees.length}/5</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {data.map((employee, index) => {
              const isActive = activeEmployees.includes(employee.employeeId);
              const isHovered = hoveredEmployee === employee.employeeId;
              
              return (
                <motion.div
                  key={employee.employeeId}
                  whileHover={{ scale: 1.02 }}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                  onClick={() => toggleEmployee(employee.employeeId)}
                  onMouseEnter={() => setHoveredEmployee(employee.employeeId)}
                  onMouseLeave={() => setHoveredEmployee(null)}
                >
                  <div className="flex items-center gap-3">
                    {employee.avatar ? (
                      <img
                        src={employee.avatar}
                        alt={employee.employeeName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      >
                        {employee.employeeName.split(' ').map(n => n[0]).join('')}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{employee.employeeName}</div>
                      <div className="text-xs text-gray-500 truncate">{employee.department}</div>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[activeEmployees.indexOf(employee.employeeId) % COLORS.length] }} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Radar Chart */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-50 rounded-xl p-6 min-h-[400px]">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={chartData}>
                <PolarGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <PolarAngleAxis 
                  dataKey="category" 
                  tick={{ fill: '#475569', fontSize: 12 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                {activeEmployeesData.map((employee, index) => (
                  <Radar
                    key={employee.employeeId}
                    name={employee.employeeName}
                    dataKey={employee.employeeName}
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={hoveredEmployee === employee.employeeId ? 0.8 : 0.3}
                    strokeWidth={2}
                  />
                ))}
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Metrics */}
          {showComparison && activeEmployeesData.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Detailed Metrics</h3>
              {activeEmployeesData[0].metrics.map((metric) => (
                <div key={metric.category} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{metric.category}</span>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(metric.value, metric.previousValue)}
                      {metric.previousValue && (
                        <span className={`text-sm font-medium ${getTrendColor(metric.value, metric.previousValue)}`}>
                          {metric.value > metric.previousValue ? '+' : ''}
                          {(metric.value - metric.previousValue).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {activeEmployeesData.map((employee, index) => {
                      const empMetric = employee.metrics.find(m => m.category === metric.category);
                      const value = empMetric?.value || 0;
                      const maxValue = empMetric?.maxValue || 100;
                      const percentage = (value / maxValue) * 100;
                      
                      return (
                        <div key={employee.employeeId} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{employee.employeeName}</span>
                            <span className="font-semibold text-gray-900">{value.toFixed(1)}</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceRadar;
