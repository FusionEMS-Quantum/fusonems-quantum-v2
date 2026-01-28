import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useFireMDTStore } from '../lib/store';
import { format } from 'date-fns';

export const History: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useFireMDTStore();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      if (!config?.unitId) return;
      
      try {
        const data = await api.getIncidentHistory(config.unitId);
        setIncidents(data);
      } catch (error) {
        console.error('Failed to load history', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [config?.unitId]);

  return (
    <div className="history-page">
      <div className="page-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← Back
        </button>
        <h1 className="page-title">Incident History</h1>
      </div>

      <div className="history-content">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : incidents.length === 0 ? (
          <div className="no-data">No incident history</div>
        ) : (
          <div className="incident-list">
            {incidents.map((incident) => (
              <div key={incident.id} className="incident-card">
                <div className="incident-header">
                  <span className="incident-number">{incident.incidentNumber}</span>
                  <span className="incident-type">{incident.type}</span>
                </div>
                <div className="incident-address">{incident.address}</div>
                <div className="incident-time">
                  {format(new Date(incident.dispatchTime), 'MMM d, yyyy HH:mm')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
