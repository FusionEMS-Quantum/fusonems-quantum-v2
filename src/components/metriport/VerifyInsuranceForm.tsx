/**
 * Insurance Verification Form Component
 * Form to verify patient insurance through Metriport
 */

import React, { useState } from 'react';
import { Search, AlertCircle, CheckCircle } from 'lucide-react';

interface VerifyInsuranceFormProps {
  patientId: number;
  patientType?: 'master' | 'epcr';
  metriportPatientId?: string;
  onVerificationComplete?: () => void;
}

export default function VerifyInsuranceForm({
  patientId,
  patientType = 'master',
  metriportPatientId,
  onVerificationComplete
}: VerifyInsuranceFormProps) {
  const [payerId, setPayerId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [coverageType, setCoverageType] = useState<'primary' | 'secondary' | 'tertiary'>('primary');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!payerId || !memberId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const payload: any = {
        payer_id: payerId,
        member_id: memberId,
        coverage_type: coverageType
      };

      if (metriportPatientId) {
        payload.metriport_patient_id = metriportPatientId;
      } else if (patientType === 'master') {
        payload.master_patient_id = patientId;
      } else {
        payload.epcr_patient_id = patientId;
      }

      const response = await fetch('/api/metriport/insurance/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Verification failed');
      }

      const data = await response.json();
      setResult(data);

      if (onVerificationComplete) {
        onVerificationComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPayerId('');
    setMemberId('');
    setCoverageType('primary');
    setResult(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Verify Insurance</h3>
        <p className="text-sm text-gray-500 mt-1">
          Enter insurance details to verify patient eligibility
        </p>
      </div>

      {result ? (
        <div className={`p-4 rounded-lg mb-6 ${result.eligible ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center">
            {result.eligible ? (
              <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 mr-3" />
            )}
            <div className="flex-1">
              <p className={`font-medium ${result.eligible ? 'text-green-900' : 'text-red-900'}`}>
                {result.eligible ? 'Patient is Eligible' : 'Patient is Not Eligible'}
              </p>
              {result.message && (
                <p className={`text-sm mt-1 ${result.eligible ? 'text-green-700' : 'text-red-700'}`}>
                  {result.message}
                </p>
              )}
            </div>
          </div>

          {result.coverage && Object.keys(result.coverage).length > 0 && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Coverage Details</h4>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                {result.coverage.payerName && (
                  <div>
                    <dt className="text-gray-500">Payer:</dt>
                    <dd className="text-gray-900 font-medium">{result.coverage.payerName}</dd>
                  </div>
                )}
                {result.coverage.planName && (
                  <div>
                    <dt className="text-gray-500">Plan:</dt>
                    <dd className="text-gray-900">{result.coverage.planName}</dd>
                  </div>
                )}
                {result.coverage.copay && (
                  <div>
                    <dt className="text-gray-500">Copay:</dt>
                    <dd className="text-gray-900">${result.coverage.copay}</dd>
                  </div>
                )}
                {result.coverage.deductible && (
                  <div>
                    <dt className="text-gray-500">Deductible:</dt>
                    <dd className="text-gray-900">${result.coverage.deductible}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          <button
            onClick={handleReset}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Verify Another Insurance
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="flex items-center text-red-800">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="payer_id" className="block text-sm font-medium text-gray-700 mb-1">
                Payer ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="payer_id"
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 00001"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                5-digit payer identification number
              </p>
            </div>

            <div>
              <label htmlFor="member_id" className="block text-sm font-medium text-gray-700 mb-1">
                Member ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="member_id"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Patient's insurance member ID"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="coverage_type" className="block text-sm font-medium text-gray-700 mb-1">
                Coverage Type
              </label>
              <select
                id="coverage_type"
                value={coverageType}
                onChange={(e) => setCoverageType(e.target.value as 'primary' | 'secondary' | 'tertiary')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="tertiary">Tertiary</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex space-x-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Verify Insurance
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
