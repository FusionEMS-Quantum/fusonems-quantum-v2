'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Filter,
  Download,
  Upload,
  UserPlus,
  Grid3x3,
  List,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  DollarSign,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Award,
  Clock,
  TrendingUp,
  Building,
} from 'lucide-react';

// Mock employee data
const mockEmployees = [
  {
    id: 1,
    employeeId: 'EMP001',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@fusionems.com',
    phone: '(555) 123-4567',
    jobTitle: 'Paramedic',
    department: 'Operations',
    station: 'Station 1',
    shift: 'A-Shift',
    hireDate: '2020-03-15',
    status: 'active',
    hourlyRate: 32.50,
    certifications: ['Paramedic', 'ACLS', 'PALS'],
    avatar: null,
  },
  {
    id: 2,
    employeeId: 'EMP002',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@fusionems.com',
    phone: '(555) 234-5678',
    jobTitle: 'EMT-B',
    department: 'Operations',
    station: 'Station 2',
    shift: 'B-Shift',
    hireDate: '2021-06-20',
    status: 'active',
    hourlyRate: 24.75,
    certifications: ['EMT-B', 'BLS'],
    avatar: null,
  },
  {
    id: 3,
    employeeId: 'EMP003',
    firstName: 'Michael',
    lastName: 'Chen',
    email: 'michael.chen@fusionems.com',
    phone: '(555) 345-6789',
    jobTitle: 'Operations Manager',
    department: 'Management',
    station: 'HQ',
    shift: 'Day',
    hireDate: '2018-01-10',
    status: 'active',
    hourlyRate: 45.00,
    certifications: ['Paramedic', 'ACLS', 'PALS', 'PHTLS'],
    avatar: null,
  },
  {
    id: 4,
    employeeId: 'EMP004',
    firstName: 'Emily',
    lastName: 'Rodriguez',
    email: 'emily.rodriguez@fusionems.com',
    phone: '(555) 456-7890',
    jobTitle: 'Critical Care Paramedic',
    department: 'Operations',
    station: 'Station 1',
    shift: 'C-Shift',
    hireDate: '2019-09-05',
    status: 'active',
    hourlyRate: 38.50,
    certifications: ['CCP', 'ACLS', 'PALS', 'PHTLS', 'FP-C'],
    avatar: null,
  },
  {
    id: 5,
    employeeId: 'EMP005',
    firstName: 'David',
    lastName: 'Thompson',
    email: 'david.thompson@fusionems.com',
    phone: '(555) 567-8901',
    jobTitle: 'EMT-A',
    department: 'Operations',
    station: 'Station 3',
    shift: 'A-Shift',
    hireDate: '2022-02-14',
    status: 'on_leave',
    hourlyRate: 27.50,
    certifications: ['EMT-A', 'ACLS'],
    avatar: null,
  },
];

const PersonnelDirectory = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStation, setFilterStation] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return mockEmployees.filter((emp) => {
      const matchesSearch =
        emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment =
        filterDepartment === 'all' || emp.department === filterDepartment;

      const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;

      const matchesStation = filterStation === 'all' || emp.station === filterStation;

      return matchesSearch && matchesDepartment && matchesStatus && matchesStation;
    });
  }, [searchTerm, filterDepartment, filterStatus, filterStation]);

  const departments = Array.from(new Set(mockEmployees.map((e) => e.department)));
  const stations = Array.from(new Set(mockEmployees.map((e) => e.station)));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'on_leave':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'suspended':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Personnel Directory
            </h1>
            <p className="text-slate-600 mt-1">
              {filteredEmployees.length} personnel found
            </p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-purple-400 transition-colors flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              <span>Import</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-purple-400 transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              <span>Export</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              <span>Add Personnel</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100"
        >
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 transition-colors"
              />
            </div>

            {/* Filter Toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-3 rounded-xl border transition-colors flex items-center gap-2 ${
                showFilters
                  ? 'bg-purple-100 border-purple-400 text-purple-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-purple-400'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </motion.button>

            {/* View Mode Toggle */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-slate-600 hover:text-purple-600'
                }`}
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-slate-600 hover:text-purple-600'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filter Options */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Department
                  </label>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Station
                  </label>
                  <select
                    value={filterStation}
                    onChange={(e) => setFilterStation(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400"
                  >
                    <option value="all">All Stations</option>
                    {stations.map((station) => (
                      <option key={station} value={station}>
                        {station}
                      </option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Employee Grid/List */}
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredEmployees.map((employee, idx) => (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ y: -4, shadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                  className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100 hover:border-purple-200 transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedEmployee(employee);
                    setShowDetails(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">
                        {getInitials(employee.firstName, employee.lastName)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {employee.firstName} {employee.lastName}
                        </h3>
                        <p className="text-sm text-slate-600">{employee.employeeId}</p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        employee.status
                      )}`}
                    >
                      {employee.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Briefcase className="w-4 h-4" />
                      <span>{employee.jobTitle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Building className="w-4 h-4" />
                      <span>{employee.department}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span>{employee.station} - {employee.shift}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Certifications</span>
                      <span className="text-sm font-medium text-purple-600">
                        {employee.certifications.length} active
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                        Employee
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                        Job Title
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                        Department
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                        Station
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map((employee) => (
                      <motion.tr
                        key={employee.id}
                        whileHover={{ backgroundColor: '#faf5ff' }}
                        className="transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm">
                              {getInitials(employee.firstName, employee.lastName)}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="text-xs text-slate-600">{employee.employeeId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {employee.jobTitle}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {employee.department}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {employee.station}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              employee.status
                            )}`}
                          >
                            {employee.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setShowDetails(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Employee Detail Modal */}
        <AnimatePresence>
          {showDetails && selectedEmployee && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowDetails(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-2xl">
                      {getInitials(selectedEmployee.firstName, selectedEmployee.lastName)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">
                        {selectedEmployee.firstName} {selectedEmployee.lastName}
                      </h2>
                      <p className="text-slate-600">{selectedEmployee.jobTitle}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Employee ID</label>
                    <p className="text-slate-900 mt-1">{selectedEmployee.employeeId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Department</label>
                    <p className="text-slate-900 mt-1">{selectedEmployee.department}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Email</label>
                    <p className="text-slate-900 mt-1">{selectedEmployee.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Phone</label>
                    <p className="text-slate-900 mt-1">{selectedEmployee.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Station</label>
                    <p className="text-slate-900 mt-1">{selectedEmployee.station}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Shift</label>
                    <p className="text-slate-900 mt-1">{selectedEmployee.shift}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Hire Date</label>
                    <p className="text-slate-900 mt-1">{selectedEmployee.hireDate}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Hourly Rate</label>
                    <p className="text-slate-900 mt-1">${selectedEmployee.hourlyRate}/hr</p>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="text-sm font-medium text-slate-600">Certifications</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedEmployee.certifications.map((cert: string) => (
                      <span
                        key={cert}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PersonnelDirectory;
