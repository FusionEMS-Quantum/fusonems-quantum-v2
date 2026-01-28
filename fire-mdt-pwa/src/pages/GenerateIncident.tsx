import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFireMDTStore } from '../lib/store';
import { api } from '../lib/api';
import type { FireIncident } from '../types';

export const GenerateIncident: React.FC = () => {
  const navigate = useNavigate();
  const { config, setActiveIncident, setState, setGeofences } = useFireMDTStore();
  
  const [formData, setFormData] = useState({
    type: 'STRUCTURE_FIRE',
    address: '',
    priority: 'HIGH',
    notes: '',
    lat: '',
    lng: '',
    destinationName: '',
    destinationAddress: '',
    destinationLat: '',
    destinationLng: '',
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const incident: FireIncident = {
        id: `INC-${Date.now()}`,
        incidentNumber: `${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
        type: formData.type,
        address: formData.address,
        location: {
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng),
        },
        dispatchTime: new Date(),
        priority: formData.priority,
        notes: formData.notes || undefined,
        destination: formData.destinationName
          ? {
              name: formData.destinationName,
              address: formData.destinationAddress,
              location: {
                lat: parseFloat(formData.destinationLat),
                lng: parseFloat(formData.destinationLng),
              },
            }
          : undefined,
      };

      // Create incident via API (will queue if offline)
      await api.createIncident(incident);

      // Update local state
      setActiveIncident(incident);
      setState('DISPATCHED');

      // Set up geofences
      const geofences = [
        {
          id: 'scene-geofence',
          type: 'scene' as const,
          center: incident.location,
          radiusMeters: config?.geofenceRadius || 100,
          triggerState: 'ON_SCENE' as const,
        },
      ];

      if (incident.destination) {
        geofences.push({
          id: 'destination-geofence',
          type: 'destination' as const,
          center: incident.destination.location,
          radiusMeters: config?.geofenceRadius || 100,
          triggerState: 'AT_HOSPITAL' as const,
        });
      }

      if (config?.stationLocation) {
        geofences.push({
          id: 'station-geofence',
          type: 'station' as const,
          center: config.stationLocation,
          radiusMeters: config.geofenceRadius || 100,
          triggerState: 'AVAILABLE' as const,
        });
      }

      setGeofences(geofences);

      navigate('/incident');
    } catch (error) {
      console.error('Failed to create incident', error);
      alert('Failed to create incident. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="generate-incident-page">
      <div className="page-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← Back
        </button>
        <h1 className="page-title">Generate Incident</h1>
      </div>

      <form onSubmit={handleSubmit} className="incident-form">
        <div className="form-group">
          <label>Incident Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            required
          >
            <option value="STRUCTURE_FIRE">Structure Fire</option>
            <option value="VEHICLE_FIRE">Vehicle Fire</option>
            <option value="BRUSH_FIRE">Brush Fire</option>
            <option value="EMS_ASSIST">EMS Assist</option>
            <option value="HAZMAT">Hazmat</option>
            <option value="RESCUE">Rescue</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            required
          >
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div className="form-group">
          <label>Address</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Latitude</label>
            <input
              type="number"
              step="any"
              value={formData.lat}
              onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Longitude</label>
            <input
              type="number"
              step="any"
              value={formData.lng}
              onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </div>

        <div className="form-section">
          <h3>Transport Destination (Optional)</h3>
          
          <div className="form-group">
            <label>Facility Name</label>
            <input
              type="text"
              value={formData.destinationName}
              onChange={(e) =>
                setFormData({ ...formData, destinationName: e.target.value })
              }
            />
          </div>

          {formData.destinationName && (
            <>
              <div className="form-group">
                <label>Facility Address</label>
                <input
                  type="text"
                  value={formData.destinationAddress}
                  onChange={(e) =>
                    setFormData({ ...formData, destinationAddress: e.target.value })
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.destinationLat}
                    onChange={(e) =>
                      setFormData({ ...formData, destinationLat: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.destinationLng}
                    onChange={(e) =>
                      setFormData({ ...formData, destinationLng: e.target.value })
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Creating...' : 'Create Incident'}
        </button>
      </form>
    </div>
  );
};
