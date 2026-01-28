'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Phone, MapPin, Calendar, Award, Edit2, MessageSquare, MoreVertical, Star } from 'lucide-react';

export interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
  email: string;
  phone?: string;
  avatar?: string;
  location?: string;
  hireDate?: string;
  status: 'active' | 'on-leave' | 'inactive';
  badges?: string[];
  stats?: {
    label: string;
    value: string | number;
    icon?: React.ReactNode;
  }[];
  rating?: number;
}

interface EmployeeCardProps {
  employee: Employee;
  onEdit?: (employee: Employee) => void;
  onMessage?: (employee: Employee) => void;
  onViewProfile?: (employee: Employee) => void;
  className?: string;
  compact?: boolean;
}

const statusConfig = {
  active: { bg: 'bg-green-500', label: 'Active' },
  'on-leave': { bg: 'bg-yellow-500', label: 'On Leave' },
  inactive: { bg: 'bg-gray-500', label: 'Inactive' },
};

const badgeColors = [
  'bg-blue-100 text-blue-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-green-100 text-green-800',
  'bg-yellow-100 text-yellow-800',
  'bg-red-100 text-red-800',
];

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  onEdit,
  onMessage,
  onViewProfile,
  className = '',
  compact = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getYearsOfService = (hireDate?: string): string => {
    if (!hireDate) return 'N/A';
    const hire = new Date(hireDate);
    const now = new Date();
    const years = now.getFullYear() - hire.getFullYear();
    const months = now.getMonth() - hire.getMonth();
    if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`;
    return `${years} year${years !== 1 ? 's' : ''}`;
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`bg-white rounded-lg shadow-md p-3 border border-gray-200 hover:border-blue-300 transition-all cursor-pointer ${className}`}
        onClick={() => onViewProfile?.(employee)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {employee.avatar ? (
              <img
                src={employee.avatar}
                alt={employee.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            )}
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${statusConfig[employee.status].bg} rounded-full border-2 border-white`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{employee.name}</h3>
            <p className="text-xs text-gray-600 truncate">{employee.position}</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className={`bg-white rounded-xl shadow-lg overflow-hidden border-2 border-transparent hover:border-blue-400 transition-all ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with gradient background */}
      <div className="relative h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
        <div className="absolute inset-0 bg-black opacity-10" />
        
        {/* Action Menu */}
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-2 rounded-lg transition-colors"
            aria-label="More options"
          >
            <MoreVertical className="w-4 h-4 text-white" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 mt-2 bg-white rounded-lg shadow-xl py-1 min-w-[150px] border border-gray-200"
                onMouseLeave={() => setShowMenu(false)}
              >
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit(employee);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </button>
                )}
                {onMessage && (
                  <button
                    onClick={() => {
                      onMessage(employee);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Send Message
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <div className={`${statusConfig[employee.status].bg} text-white text-xs font-medium px-3 py-1 rounded-full shadow-lg`}>
            {statusConfig[employee.status].label}
          </div>
        </div>
      </div>

      {/* Avatar */}
      <div className="relative -mt-12 px-6">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="relative inline-block"
        >
          {employee.avatar ? (
            <img
              src={employee.avatar}
              alt={employee.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-white shadow-lg">
              <User className="w-12 h-12 text-white" />
            </div>
          )}
          <div className={`absolute bottom-1 right-1 w-4 h-4 ${statusConfig[employee.status].bg} rounded-full border-2 border-white`} />
        </motion.div>
      </div>

      {/* Content */}
      <div className="px-6 pb-6 pt-2">
        {/* Name and Position */}
        <div className="mb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-gray-900 truncate">{employee.name}</h3>
              <p className="text-sm text-gray-600 truncate">{employee.position}</p>
              <p className="text-xs text-gray-500 truncate">{employee.department}</p>
            </div>
            {employee.rating && (
              <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-semibold text-gray-900">{employee.rating}</span>
              </div>
            )}
          </div>
        </div>

        {/* Badges */}
        {employee.badges && employee.badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {employee.badges.slice(0, 3).map((badge, index) => (
              <span
                key={badge}
                className={`text-xs font-medium px-2 py-1 rounded-full ${badgeColors[index % badgeColors.length]}`}
              >
                {badge}
              </span>
            ))}
            {employee.badges.length > 3 && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                +{employee.badges.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Contact Info */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="truncate">{employee.email}</span>
          </div>
          {employee.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>{employee.phone}</span>
            </div>
          )}
          {employee.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="truncate">{employee.location}</span>
            </div>
          )}
          {employee.hireDate && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span>{getYearsOfService(employee.hireDate)} of service</span>
            </div>
          )}
        </div>

        {/* Stats */}
        {employee.stats && employee.stats.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {employee.stats.map((stat, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-2 text-center">
                {stat.icon && <div className="flex justify-center mb-1">{stat.icon}</div>}
                <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-600 truncate">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {onViewProfile && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onViewProfile(employee)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              View Profile
            </motion.button>
          )}
          {onMessage && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onMessage(employee)}
              className="bg-gray-200 hover:bg-gray-300 p-2 rounded-lg transition-colors"
              aria-label="Send message"
            >
              <MessageSquare className="w-5 h-5 text-gray-700" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Hover Effect Overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 pointer-events-none"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EmployeeCard;
