/**
 * Medical History Documents Component
 * Displays synced medical documents from Metriport
 */

import React, { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw, AlertCircle, Clock, CheckCircle } from 'lucide-react';

interface Document {
  id: number;
  document_id: string;
  document_type: string;
  title: string;
  description: string;
  document_date: string | null;
  facility_name: string;
  sync_status: string;
  downloaded_at: string | null;
  created_at: string;
}

interface MedicalHistoryDocumentsProps {
  patientId: number;
  patientType?: 'master' | 'epcr';
}

export default function MedicalHistoryDocuments({
  patientId,
  patientType = 'master'
}: MedicalHistoryDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [patientId, patientType]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/metriport/documents/${patientId}?patient_type=${patientType}`,
        {
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      setDocuments(data.documents || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDocuments = async () => {
    try {
      setSyncing(true);
      const payload: any = {};

      if (patientType === 'master') {
        payload.master_patient_id = patientId;
      } else {
        payload.epcr_patient_id = patientId;
      }

      const response = await fetch('/api/metriport/documents/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to sync documents');
      }

      const result = await response.json();
      
      // Refresh documents list
      await fetchDocuments();
      
      alert(`Synced ${result.synced} of ${result.total_available} documents`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading documents...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center text-red-600 mb-4">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchDocuments}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Medical History Documents</h3>
          <p className="text-sm text-gray-500 mt-1">
            {documents.length} document{documents.length !== 1 ? 's' : ''} synced from health information exchanges
          </p>
        </div>
        <button
          onClick={handleSyncDocuments}
          disabled={syncing}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {syncing ? (
            <>
              <RefreshCw className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="-ml-1 mr-2 h-4 w-4" />
              Sync Documents
            </>
          )}
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Documents</h3>
          <p className="mt-1 text-sm text-gray-500">
            No medical history documents have been synced for this patient.
          </p>
          <div className="mt-6">
            <button
              onClick={handleSyncDocuments}
              disabled={syncing}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="-ml-1 mr-2 h-5 w-5" />
              Sync Documents Now
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {documents.map((doc) => (
            <div key={doc.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start">
                <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{doc.title || 'Untitled Document'}</h4>
                      {doc.description && (
                        <p className="text-sm text-gray-500 mt-1">{doc.description}</p>
                      )}
                    </div>
                    <div className="flex items-center ml-4">
                      {getStatusIcon(doc.sync_status)}
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-4 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">Type:</span>{' '}
                      <span className="text-gray-900">{doc.document_type}</span>
                    </div>
                    {doc.facility_name && (
                      <div>
                        <span className="font-medium">Facility:</span>{' '}
                        <span className="text-gray-900">{doc.facility_name}</span>
                      </div>
                    )}
                    {doc.document_date && (
                      <div>
                        <span className="font-medium">Document Date:</span>{' '}
                        <span className="text-gray-900">{formatDate(doc.document_date)}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Downloaded:</span>{' '}
                      <span className="text-gray-900">{formatDate(doc.downloaded_at)}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex space-x-3">
                    <button className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700 font-medium">
                      <Download className="w-3 h-3 mr-1" />
                      View Document
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
