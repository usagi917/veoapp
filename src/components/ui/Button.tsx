import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, icon, children, className = '', ...props }, ref) => {
    const baseStyles = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '500',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      gap: '8px',
      outline: 'none',
      position: 'relative' as const,
    };

    const sizeStyles = {
      sm: {
        padding: '6px 12px',
        fontSize: '14px',
        lineHeight: '20px',
      },
      md: {
        padding: '8px 16px',
        fontSize: '14px',
        lineHeight: '20px',
      },
      lg: {
        padding: '12px 20px',
        fontSize: '16px',
        lineHeight: '24px',
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
      secondary: {
        backgroundColor: '#f1f5f9',
        color: '#334155',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
      outline: {
        backgroundColor: 'transparent',
        color: '#334155',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '#334155',
      },
    };

    const hoverStyles = {
      primary: {
        backgroundColor: '#2563eb',
      },
      secondary: {
        backgroundColor: '#e2e8f0',
      },
      outline: {
        backgroundColor: '#f8fafc',
        borderColor: '#cbd5e1',
      },
      ghost: {
        backgroundColor: '#f1f5f9',
      },
    };

    const disabledStyles = {
      opacity: 0.5,
      cursor: 'not-allowed',
    };

    const combinedStyles = {
      ...baseStyles,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(props.disabled ? disabledStyles : {}),
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!props.disabled && !loading) {
        Object.assign(e.currentTarget.style, hoverStyles[variant]);
      }
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!props.disabled && !loading) {
        Object.assign(e.currentTarget.style, variantStyles[variant]);
      }
    };

    return (
      <button
        ref={ref}
        style={combinedStyles}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={props.disabled || loading}
        {...props}
      >
        {loading && (
          <div
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        )}
        {icon && !loading && icon}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;