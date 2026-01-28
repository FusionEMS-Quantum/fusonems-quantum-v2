import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFireMDTStore } from '../lib/store';
import { api } from '../lib/api';
import { obdAdapter } from '../lib/obd';
import type { DeviceConfig } from '../types';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { config, setConfig, setOBDData } = useFireMDTStore();
  
  const [formData, setFormData] = useState<DeviceConfig>({
    unitId: config?.unitId || '',
    stationLocation: config?.stationLocation,
    geofenceRadius: config?.geofenceRadius || 100,
    gpsUpdateInterval: config?.gpsUpdateInterval || 5000,
    obdEnabled: config?.obdEnabled || false,
  });

  const [obdConnected, setObdConnected] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (formData.obdEnabled && !obdConnected) {
      connectOBD();
    } else if (!formData.obdEnabled && obdConnected) {
      disconnectOBD();
    }
  }, [formData.obdEnabled]);

  const connectOBD = async () => {
    try {
      const connected = await obdAdapter.connect();
      setObdConnected(connected);
      
      if (connected) {
        obdAdapter.startMonitoring((data) => {
          setOBDData(data);
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to connect OBD', error);
      alert('Failed to connect to OBD adapter');
    }
  };

  const disconnectOBD = () => {
    obdAdapter.stopMonitoring();
    obdAdapter.disconnect();
    setObdConnected(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateConfig(formData.unitId, formData);
      setConfig(formData);
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings', error);
      alert('Failed to save settings. They will be saved locally.');
      setConfig(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <button onClick={() => navigate('/dashboard')} className="back-button">
          ← Back
        </button>
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="settings-content">
        <div className="settings-form">
          <div className="form-group">
            <label>Unit ID</label>
            <input
              type="text"
              value={formData.unitId}
              onChange={(e) =>
                setFormData({ ...formData, unitId: e.target.value })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>Geofence Radius (meters)</label>
            <input
              type="number"
              value={formData.geofenceRadius}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  geofenceRadius: parseInt(e.target.value),
                })
              }
              required
            />
          </div>

          <div className="form-group">
            <label>GPS Update Interval (ms)</label>
            <input
              type="number"
              value={formData.gpsUpdateInterval}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  gpsUpdateInterval: parseInt(e.target.value),
                })
              }
              required
            />
          </div>

          <div className="form-section">
            <h3>Station Location (Optional)</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.stationLocation?.lat || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stationLocation: {
                        lat: parseFloat(e.target.value),
                        lng: formData.stationLocation?.lng || 0,
                      },
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={formData.stationLocation?.lng || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stationLocation: {
                        lat: formData.stationLocation?.lat || 0,
                        lng: parseFloat(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.obdEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, obdEnabled: e.target.checked })
                }
              />
              <span>Enable OBD-II Integration</span>
            </label>
            {formData.obdEnabled && (
              <div className="text-sm mt-2">
                Status: {obdConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="save-button"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
