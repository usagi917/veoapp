import React from 'react';

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'md'
}) => {
  const baseStyles = {
    borderRadius: '12px',
    backgroundColor: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    overflow: 'hidden' as const,
  };

  const variantStyles = {
    default: {
      border: '1px solid #f1f5f9',
    },
    elevated: {
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
    outlined: {
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
  };

  const paddingStyles = {
    none: { padding: '0' },
    sm: { padding: '16px' },
    md: { padding: '24px' },
    lg: { padding: '32px' },
  };

  const combinedStyles = {
    ...baseStyles,
    ...variantStyles[variant],
    ...paddingStyles[padding],
  };

  return (
    <div style={combinedStyles} className={className}>
      {children}
    </div>
  );
};

export default Card;