import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFireMDTStore } from '../lib/store';
import { StateIndicator } from '../components/StateIndicator';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentState,
    activeIncident,
    config,
    obdData,
    currentLocation,
    isOnline,
    queueSize,
  } = useFireMDTStore();

  return (
    <div className="dashboard-page">
      <OfflineIndicator isOnline={isOnline} queueSize={queueSize} />
      
      <div className="dashboard-header">
        <h1 className="text-2xl font-bold">Fire MDT</h1>
        <div className="text-sm text-gray-400">
          Unit: {config?.unitId || 'Not configured'}
        </div>
      </div>

      <div className="dashboard-content">
        {/* Current State */}
        <section className="state-section">
          <StateIndicator state={currentState} />
        </section>

        {/* Active Incident */}
        <section className="incident-section">
          <h2 className="section-title">Active Incident</h2>
          {activeIncident ? (
            <div
              className="incident-card"
              onClick={() => navigate('/incident')}
            >
              <div className="incident-number">{activeIncident.incidentNumber}</div>
              <div className="incident-type">{activeIncident.type}</div>
              <div className="incident-address">{activeIncident.address}</div>
              <div className="incident-time">
                Dispatched: {format(new Date(activeIncident.dispatchTime), 'HH:mm:ss')}
              </div>
            </div>
          ) : (
            <div className="no-incident">
              <p className="text-gray-400 mb-4">No active incident</p>
              <button
                className="generate-button"
                onClick={() => navigate('/generate')}
              >
                Generate Incident
              </button>
            </div>
          )}
        </section>

        {/* OBD Data */}
        {config?.obdEnabled && obdData && (
          <section className="obd-section">
            <h2 className="section-title">Vehicle Status</h2>
            <div className="obd-data">
              <div className="obd-item">
                <span className="obd-label">Ignition:</span>
                <span className="obd-value">{obdData.ignition ? '🟢 ON' : '🔴 OFF'}</span>
              </div>
              <div className="obd-item">
                <span className="obd-label">Gear:</span>
                <span className="obd-value">{obdData.gear}</span>
              </div>
              <div className="obd-item">
                <span className="obd-label">Speed:</span>
                <span className="obd-value">{obdData.speed.toFixed(1)} mph</span>
              </div>
              {obdData.rpm && (
                <div className="obd-item">
                  <span className="obd-label">RPM:</span>
                  <span className="obd-value">{obdData.rpm.toFixed(0)}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* GPS Status */}
        <section className="gps-section">
          <h2 className="section-title">GPS Status</h2>
          {currentLocation ? (
            <div className="gps-data">
              <div className="text-sm">
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </div>
            </div>
          ) : (
            <div className="text-gray-400">Waiting for GPS...</div>
          )}
        </section>

        {/* Navigation */}
        <nav className="dashboard-nav">
          <button
            className="nav-button"
            onClick={() => navigate('/history')}
          >
            History
          </button>
          <button
            className="nav-button"
            onClick={() => navigate('/settings')}
          >
            Settings
          </button>
        </nav>
      </div>
    </div>
  );
};
