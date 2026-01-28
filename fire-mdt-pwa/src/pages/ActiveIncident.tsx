import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFireMDTStore } from '../lib/store';
import { TimelineView } from '../components/TimelineView';
import { MapView } from '../components/MapView';
import { StateIndicator } from '../components/StateIndicator';
import { OfflineIndicator } from '../components/OfflineIndicator';
import { getNextStates, canTransition } from '../lib/state-machine';
import { format } from 'date-fns';

export const ActiveIncident: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeIncident,
    currentState,
    setState,
    events,
    addEvent,
    currentLocation,
    breadcrumbs,
    geofences,
    isOnline,
    queueSize,
  } = useFireMDTStore();

  useEffect(() => {
    if (!activeIncident) {
      navigate('/dashboard');
    }
  }, [activeIncident, navigate]);

  const handleStateChange = (newState: any) => {
    if (canTransition(currentState, newState)) {
      setState(newState);
      addEvent({
        incidentId: activeIncident!.id,
        eventType: newState,
        timestamp: new Date(),
        source: 'manual',
        location: currentLocation || undefined,
      });
    }
  };

  if (!activeIncident) {
    return null;
  }

  const nextStates = getNextStates(currentState);
  const mapCenter: [number, number] = currentLocation
    ? [currentLocation.lat, currentLocation.lng]
    : [activeIncident.location.lat, activeIncident.location.lng];

  return (
    <div className="active-incident-page">
      <OfflineIndicator isOnline={isOnline} queueSize={queueSize} />
      
      <div className="page-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← Back
        </button>
        <div>
          <h1 className="page-title">{activeIncident.incidentNumber}</h1>
          <p className="text-sm text-gray-400">{activeIncident.type}</p>
        </div>
      </div>

      <div className="incident-content">
        {/* Current State */}
        <section className="state-section">
          <StateIndicator state={currentState} />
        </section>

        {/* Incident Details */}
        <section className="details-section">
          <h2 className="section-title">Incident Details</h2>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Address:</span>
              <span className="detail-value">{activeIncident.address}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Priority:</span>
              <span className="detail-value">{activeIncident.priority}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Dispatched:</span>
              <span className="detail-value">
                {format(new Date(activeIncident.dispatchTime), 'HH:mm:ss')}
              </span>
            </div>
            {activeIncident.notes && (
              <div className="detail-item">
                <span className="detail-label">Notes:</span>
                <span className="detail-value">{activeIncident.notes}</span>
              </div>
            )}
            {activeIncident.destination && (
              <div className="detail-item">
                <span className="detail-label">Destination:</span>
                <span className="detail-value">
                  {activeIncident.destination.name}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* State Transitions */}
        <section className="transitions-section">
          <h2 className="section-title">Change Status</h2>
          <div className="state-buttons">
            {nextStates.map((state) => (
              <button
                key={state}
                onClick={() => handleStateChange(state)}
                className="state-button"
              >
                {state.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </section>

        {/* Map */}
        <section className="map-section">
          <h2 className="section-title">Map</h2>
          <div className="map-container" style={{ height: '400px' }}>
            <MapView
              center={mapCenter}
              currentLocation={currentLocation || undefined}
              breadcrumbs={breadcrumbs.filter(
                (b) => b.incidentId === activeIncident.id
              )}
              geofences={geofences}
              sceneLocation={activeIncident.location}
              destinationLocation={activeIncident.destination?.location}
            />
          </div>
        </section>

        {/* Timeline */}
        <section className="timeline-section">
          <TimelineView
            events={events.filter((e) => e.incidentId === activeIncident.id)}
          />
        </section>
      </div>
    </div>
  );
};
