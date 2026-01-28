import React from 'react';
import { format } from 'date-fns';
import type { FireEvent } from '../types';

interface TimelineViewProps {
  events: FireEvent[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({ events }) => {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getEventIcon = (source: string) => {
    switch (source) {
      case 'manual':
        return '👤';
      case 'gps':
        return '📍';
      case 'geofence':
        return '⭕';
      case 'obd':
        return '🚗';
      case 'cad':
        return '🚨';
      default:
        return '•';
    }
  };

  return (
    <div className="timeline-view">
      <h3 className="text-lg font-bold mb-4">Event Timeline</h3>
      <div className="space-y-3">
        {sortedEvents.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No events yet</p>
        ) : (
          sortedEvents.map((event) => (
            <div key={event.id} className="timeline-item">
              <div className="flex items-start gap-3">
                <div className="timeline-icon text-2xl">{getEventIcon(event.source)}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{event.eventType}</span>
                    <span className="text-sm text-gray-400">
                      {format(new Date(event.timestamp), 'HH:mm:ss')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300">
                    Source: {event.source}
                    {!event.synced && (
                      <span className="ml-2 text-yellow-500">• Pending sync</span>
                    )}
                  </div>
                  {event.location && (
                    <div className="text-xs text-gray-400 mt-1">
                      {event.location.lat.toFixed(6)}, {event.location.lng.toFixed(6)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
