import React from 'react';

interface AlertProps {
  children?: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info';
  className?: string;
  icon?: React.ReactNode;
}

const Alert: React.FC<AlertProps> = ({ 
  children, 
  variant = 'info', 
  className = '',
  icon
}) => {
  const baseStyles = {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    lineHeight: '20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  };

  const variantStyles = {
    success: {
      backgroundColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      color: '#166534',
    },
    error: {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      color: '#dc2626',
    },
    warning: {
      backgroundColor: '#fffbeb',
      borderColor: '#fed7aa',
      color: '#d97706',
    },
    info: {
      backgroundColor: '#eff6ff',
      borderColor: '#bfdbfe',
      color: '#2563eb',
    },
  };

  const defaultIcons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const combinedStyles = {
    ...baseStyles,
    ...variantStyles[variant],
  };

  return (
    <div style={combinedStyles} className={className} role="alert">
      <span style={{ flexShrink: 0 }}>
        {icon || defaultIcons[variant]}
      </span>
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default Alert;