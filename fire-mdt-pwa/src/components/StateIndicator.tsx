import React from 'react';
import type { FireMDTState } from '../types';
import { getStateColor, getStateLabel } from '../lib/state-machine';

interface StateIndicatorProps {
  state: FireMDTState;
  className?: string;
}

export const StateIndicator: React.FC<StateIndicatorProps> = ({
  state,
  className = '',
}) => {
  const color = getStateColor(state);
  const label = getStateLabel(state);

  return (
    <div
      className={`state-indicator ${className}`}
      style={{
        backgroundColor: color,
        padding: '12px 24px',
        borderRadius: '8px',
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: '18px',
        color: 'white',
        textTransform: 'uppercase',
        letterSpacing: '1px',
      }}
    >
      {label}
    </div>
  );
};
