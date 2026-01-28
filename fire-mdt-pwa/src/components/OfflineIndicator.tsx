import React from 'react';

interface OfflineIndicatorProps {
  isOnline: boolean;
  queueSize: number;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnline,
  queueSize,
}) => {
  if (isOnline && queueSize === 0) {
    return null;
  }

  return (
    <div
      className="offline-indicator"
      style={{
        backgroundColor: isOnline ? '#F59E0B' : '#DC2626',
        color: 'white',
        padding: '8px 16px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '14px',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
      }}
    >
      {!isOnline && '🔴 OFFLINE MODE'}
      {isOnline && queueSize > 0 && `⚠️ Syncing ${queueSize} queued events...`}
    </div>
  );
};
