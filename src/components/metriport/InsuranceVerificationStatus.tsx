/**
 * Insurance Verification Status Component
 * Displays patient insurance verification status and details
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';

interface Insurance {
  id: number;
  payer_name: string;
  member_id: string;
  coverage_type: string;
  verification_status: string;
  is_active: boolean;
  verified_at: string | null;
  copay_amount: string;
  deductible_amount: string;
  plan_name: string;
}

interface InsuranceVerificationStatusProps {
  patientId: number;
  patientType?: 'master' | 'epcr';
  onVerificationComplete?: () => void;
}

export default function InsuranceVerificationStatus({
  patientId,
  patientType = 'master',
  onVerificationComplete
}: InsuranceVerificationStatusProps) {
  const [insurance, setInsurance] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsurance();
  }, [patientId, patientType]);

  const fetchInsurance = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/metriport/insurance/${patientId}?patient_type=${patientType}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch insurance data');
      }

      const data = await response.json();
      setInsurance(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleRetryVerification = async (insuranceId: number) => {
    try {
      setRetrying(insuranceId);
      const response = await fetch(
        `/api/metriport/insurance/${insuranceId}/retry`,
        {
          method: 'POST',
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Verification retry failed');
      }

      const result = await response.json();
      
      // Refresh insurance data
      await fetchInsurance();
      
      if (onVerificationComplete) {
        onVerificationComplete();
      }

      alert(result.eligible ? 'Patient is eligible!' : 'Verification completed but patient is not eligible');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setRetrying(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'manual_review':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'expired':
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'manual_review':
        return 'bg-orange-100 text-orange-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getCoverageTypeBadge = (type: string) => {
    switch (type) {
      case 'primary':
        return 'bg-blue-100 text-blue-800';
      case 'secondary':
        return 'bg-purple-100 text-purple-800';
      case 'tertiary':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading insurance data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center text-red-600">
          <XCircle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchInsurance}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (insurance.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium">No Insurance on File</p>
          <p className="text-sm mt-1">Insurance verification has not been performed for this patient.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Insurance Verification</h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        {insurance.map((ins) => (
          <div key={ins.id} className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                {getStatusIcon(ins.verification_status)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-lg font-medium text-gray-900">{ins.payer_name}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCoverageTypeBadge(ins.coverage_type)}`}>
                      {ins.coverage_type.charAt(0).toUpperCase() + ins.coverage_type.slice(1)}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(ins.verification_status)}`}>
                      {ins.verification_status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-gray-500">Member ID:</span>
                      <span className="ml-2 text-gray-900 font-medium">{ins.member_id}</span>
                    </div>
                    {ins.plan_name && (
                      <div>
                        <span className="text-gray-500">Plan:</span>
                        <span className="ml-2 text-gray-900">{ins.plan_name}</span>
                      </div>
                    )}
                    {ins.copay_amount && (
                      <div>
                        <span className="text-gray-500">Copay:</span>
                        <span className="ml-2 text-gray-900">${ins.copay_amount}</span>
                      </div>
                    )}
                    {ins.deductible_amount && (
                      <div>
                        <span className="text-gray-500">Deductible:</span>
                        <span className="ml-2 text-gray-900">${ins.deductible_amount}</span>
                      </div>
                    )}
                  </div>

                  {ins.verified_at && (
                    <div className="mt-2 text-xs text-gray-500">
                      Verified: {new Date(ins.verified_at).toLocaleString()}
                    </div>
                  )}

                  {ins.is_active ? (
                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">
                      Coverage Active
                    </div>
                  ) : (
                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded bg-red-50 text-red-700 text-xs font-medium">
                      Coverage Inactive
                    </div>
                  )}
                </div>
              </div>

              {ins.verification_status === 'failed' && (
                <button
                  onClick={() => handleRetryVerification(ins.id)}
                  disabled={retrying === ins.id}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {retrying === ins.id ? (
                    <>
                      <RefreshCw className="animate-spin -ml-0.5 mr-2 h-4 w-4" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="-ml-0.5 mr-2 h-4 w-4" />
                      Retry Verification
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
