import React from 'react';

interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  className?: string;
}

const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showLabel = false,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeStyles = {
    sm: { height: '4px' },
    md: { height: '6px' },
    lg: { height: '8px' },
  };

  const colorStyles = {
    primary: { backgroundColor: '#3b82f6' },
    success: { backgroundColor: '#10b981' },
    warning: { backgroundColor: '#f59e0b' },
    error: { backgroundColor: '#ef4444' },
  };

  const containerStyles = {
    width: '100%',
    backgroundColor: '#f1f5f9',
    borderRadius: '9999px',
    overflow: 'hidden' as const,
    ...sizeStyles[size],
  };

  const progressStyles = {
    ...colorStyles[color],
    height: '100%',
    width: `${percentage}%`,
    transition: 'width 0.3s ease-in-out',
    borderRadius: '9999px',
  };

  return (
    <div className={className}>
      {showLabel && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px',
            fontSize: '12px',
            fontWeight: '500',
            color: '#374151',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <span>進捗</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div style={containerStyles}>
        <div style={progressStyles} />
      </div>
    </div>
  );
};

export default Progress;