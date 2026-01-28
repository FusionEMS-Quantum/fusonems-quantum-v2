import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useFireMDTStore } from './lib/store';
import { initOfflineQueue, getQueueSize, replayQueue } from './lib/offline-queue';
import { api } from './lib/api';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { GenerateIncident } from './pages/GenerateIncident';
import { ActiveIncident } from './pages/ActiveIncident';
import { History } from './pages/History';
import { Settings } from './pages/Settings';

function App() {
  const {
    isAuthenticated,
    setIsOnline,
    setQueueSize,
    currentLocation,
    setCurrentLocation,
    addBreadcrumb,
    activeIncident,
    config,
  } = useFireMDTStore();

  useEffect(() => {
    // Initialize offline queue
    initOfflineQueue();

    // Monitor online/offline status
    const handleOnline = async () => {
      setIsOnline(true);
      
      // Replay queued items
      await replayQueue(async (item) => {
        try {
          if (item.type === 'event') {
            await api.createEvent(item.payload);
            return true;
          } else if (item.type === 'breadcrumb') {
            await api.sendBreadcrumb(item.payload);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      });
      
      // Update queue size
      const size = await getQueueSize();
      setQueueSize(size);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial online status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Start GPS tracking
    let watchId: number | null = null;

    if (isAuthenticated && 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          setCurrentLocation(location);

          // Add breadcrumb if we have an active incident
          if (activeIncident) {
            addBreadcrumb({
              incidentId: activeIncident.id,
              lat: location.lat,
              lng: location.lng,
              timestamp: new Date(),
              speed: position.coords.speed || undefined,
              heading: position.coords.heading || undefined,
            });
          }
        },
        (error) => {
          console.error('GPS error', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isAuthenticated, activeIncident]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/generate"
          element={isAuthenticated ? <GenerateIncident /> : <Navigate to="/login" />}
        />
        <Route
          path="/incident"
          element={isAuthenticated ? <ActiveIncident /> : <Navigate to="/login" />}
        />
        <Route
          path="/history"
          element={isAuthenticated ? <History /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <Settings /> : <Navigate to="/login" />}
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
