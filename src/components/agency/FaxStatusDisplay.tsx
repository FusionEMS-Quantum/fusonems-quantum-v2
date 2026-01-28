"use client";

import { Clock, CheckCircle, FileSearch, Eye, AlertCircle } from 'lucide-react';

interface FaxRequest {
  id: string;
  documentType: string;
  requestedAt: string;
  status: 'Document Requested' | 'Waiting on Sender' | 'Document Received' | 'Under Review' | 'Complete';
  recipientRole: string;
}

interface FaxStatusDisplayProps {
  incidentId: string;
  requests: FaxRequest[];
}

const statusConfig = {
  'Document Requested': {
    icon: <Clock className="w-5 h-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  'Waiting on Sender': {
    icon: <Clock className="w-5 h-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200'
  },
  'Document Received': {
    icon: <FileSearch className="w-5 h-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  'Under Review': {
    icon: <Eye className="w-5 h-5" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  'Complete': {
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  }
};

export default function FaxStatusDisplay({ incidentId, requests }: FaxStatusDisplayProps) {
  if (!requests || requests.length === 0) {
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileSearch className="w-6 h-6 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-900">Document Requests</h3>
      </div>

      <div className="space-y-3">
        {requests.map((request) => {
          const config = statusConfig[request.status];
          
          return (
            <div
              key={request.id}
              className={`border rounded-lg p-4 ${config.borderColor} ${config.bgColor}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={config.color}>{config.icon}</span>
                    <span className={`font-medium ${config.color}`}>
                      {request.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-900 font-medium mb-1">
                    {request.documentType}
                  </p>
                  
                  <p className="text-sm text-gray-600">
                    From: {request.recipientRole}
                  </p>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Requested: {formatDate(request.requestedAt)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900">
            Document requests are handled automatically. You'll see status updates here as they progress.
          </p>
        </div>
      </div>
    </div>
  );
}
