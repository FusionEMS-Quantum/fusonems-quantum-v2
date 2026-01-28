'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, CheckCircle, AlertCircle, Clock, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  dateObtained: string;
  expiryDate?: string;
  status: 'active' | 'expiring-soon' | 'expired' | 'pending';
  employeeName: string;
  documentUrl?: string;
  renewalRequired?: boolean;
}

interface CertificationTimelineProps {
  certifications: Certification[];
  employeeFilter?: string;
  className?: string;
  onCertificationClick?: (cert: Certification) => void;
}

const getStatusConfig = (status: Certification['status']) => {
  const configs = {
    active: {
      bg: 'bg-green-500',
      icon: CheckCircle,
      label: 'Active',
      color: 'text-green-700',
      bgLight: 'bg-green-50',
    },
    'expiring-soon': {
      bg: 'bg-yellow-500',
      icon: AlertCircle,
      label: 'Expiring Soon',
      color: 'text-yellow-700',
      bgLight: 'bg-yellow-50',
    },
    expired: {
      bg: 'bg-red-500',
      icon: AlertCircle,
      label: 'Expired',
      color: 'text-red-700',
      bgLight: 'bg-red-50',
    },
    pending: {
      bg: 'bg-blue-500',
      icon: Clock,
      label: 'Pending',
      color: 'text-blue-700',
      bgLight: 'bg-blue-50',
    },
  };
  return configs[status];
};

const getDaysUntilExpiry = (expiryDate: string): number => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const CertificationTimeline: React.FC<CertificationTimelineProps> = ({
  certifications,
  employeeFilter,
  className = '',
  onCertificationClick,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedCert, setSelectedCert] = useState<Certification | null>(null);

  const filteredCerts = employeeFilter
    ? certifications.filter(cert => cert.employeeName === employeeFilter)
    : certifications;

  // Sort by date
  const sortedCerts = [...filteredCerts].sort(
    (a, b) => new Date(a.dateObtained).getTime() - new Date(b.dateObtained).getTime()
  );

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleCertClick = (cert: Certification) => {
    setSelectedCert(cert);
    onCertificationClick?.(cert);
  };

  return (
    <div className={`bg-white rounded-xl shadow-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Certification Timeline</h2>
            <p className="text-emerald-100 text-sm">
              Tracking {sortedCerts.length} certification{sortedCerts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Award className="w-12 h-12 text-white opacity-50" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-200">
        {['active', 'expiring-soon', 'expired', 'pending'].map(status => {
          const count = sortedCerts.filter(c => c.status === status).length;
          const config = getStatusConfig(status as Certification['status']);
          return (
            <div key={status} className={`${config.bgLight} rounded-lg p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${config.bg}`} />
                <span className="text-xs text-gray-600">{config.label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Timeline Navigation */}
      <div className="relative">
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>

        {/* Timeline */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto scrollbar-hide p-8"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="relative min-w-max">
            {/* Timeline Line */}
            <div className="absolute top-12 left-0 right-0 h-1 bg-gradient-to-r from-emerald-200 via-teal-200 to-blue-200" />

            {/* Timeline Items */}
            <div className="flex gap-8">
              {sortedCerts.map((cert, index) => {
                const config = getStatusConfig(cert.status);
                const daysUntilExpiry = cert.expiryDate ? getDaysUntilExpiry(cert.expiryDate) : null;
                const StatusIcon = config.icon;

                return (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative flex flex-col items-center min-w-[240px]"
                  >
                    {/* Timeline Dot */}
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                      className={`${config.bg} w-8 h-8 rounded-full flex items-center justify-center shadow-lg cursor-pointer z-10`}
                      onClick={() => handleCertClick(cert)}
                    >
                      <StatusIcon className="w-5 h-5 text-white" />
                    </motion.div>

                    {/* Card */}
                    <motion.div
                      whileHover={{ scale: 1.05, y: -5 }}
                      className={`mt-6 ${config.bgLight} rounded-lg p-4 shadow-md border-2 ${
                        selectedCert?.id === cert.id ? 'border-emerald-500' : 'border-transparent'
                      } cursor-pointer transition-all`}
                      onClick={() => handleCertClick(cert)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                            {cert.name}
                          </h3>
                          <Award className={`w-4 h-4 flex-shrink-0 ${config.color}`} />
                        </div>

                        <p className="text-xs text-gray-600">{cert.issuer}</p>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>Obtained: {new Date(cert.dateObtained).toLocaleDateString()}</span>
                          </div>
                          
                          {cert.expiryDate && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              <span>Expires: {new Date(cert.expiryDate).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {daysUntilExpiry !== null && (
                          <div className={`text-xs font-medium ${config.color} mt-2`}>
                            {daysUntilExpiry > 0
                              ? `${daysUntilExpiry} days remaining`
                              : daysUntilExpiry === 0
                              ? 'Expires today'
                              : `Expired ${Math.abs(daysUntilExpiry)} days ago`}
                          </div>
                        )}

                        <div className="text-xs text-gray-700 font-medium pt-2 border-t border-gray-200">
                          {cert.employeeName}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedCert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedCert(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`${getStatusConfig(selectedCert.status).bg} p-3 rounded-lg`}>
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{selectedCert.name}</h3>
                    <p className="text-sm text-gray-600">{selectedCert.issuer}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCert(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Employee</span>
                  <span className="text-sm font-medium text-gray-900">{selectedCert.employeeName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Date Obtained</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(selectedCert.dateObtained).toLocaleDateString()}
                  </span>
                </div>
                {selectedCert.expiryDate && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Expiry Date</span>
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(selectedCert.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`text-sm font-medium ${getStatusConfig(selectedCert.status).color}`}>
                    {getStatusConfig(selectedCert.status).label}
                  </span>
                </div>
                {selectedCert.renewalRequired && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Renewal Required</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Please initiate renewal process before expiry
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {selectedCert.documentUrl && (
                <button className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors">
                  View Certificate
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CertificationTimeline;
