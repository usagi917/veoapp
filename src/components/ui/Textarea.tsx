import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  variant?: 'outline' | 'filled';
  size?: 'sm' | 'md' | 'lg';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, variant = 'outline', size = 'md', className = '', ...props }, ref) => {
    const baseStyles = {
      width: '100%',
      borderRadius: '8px',
      border: variant === 'outline' ? '1px solid #e2e8f0' : 'none',
      backgroundColor: variant === 'outline' ? '#ffffff' : '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      transition: 'all 0.2s ease-in-out',
      outline: 'none',
      resize: 'vertical' as const,
    };

    const sizeStyles = {
      sm: {
        padding: '8px 12px',
        fontSize: '14px',
        lineHeight: '20px',
        minHeight: '80px',
      },
      md: {
        padding: '10px 14px',
        fontSize: '14px',
        lineHeight: '20px',
        minHeight: '100px',
      },
      lg: {
        padding: '12px 16px',
        fontSize: '16px',
        lineHeight: '24px',
        minHeight: '120px',
      },
    };

    const focusStyles = {
      borderColor: error ? '#ef4444' : '#3b82f6',
      boxShadow: error 
        ? '0 0 0 3px rgba(239, 68, 68, 0.1)' 
        : '0 0 0 3px rgba(59, 130, 246, 0.1)',
    };

    const errorStyles = {
      borderColor: '#ef4444',
    };

    const combinedStyles = {
      ...baseStyles,
      ...sizeStyles[size],
      ...(error ? errorStyles : {}),
    };

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      Object.assign(e.currentTarget.style, focusStyles);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      Object.assign(e.currentTarget.style, combinedStyles);
      props.onBlur?.(e);
    };

    return (
      <div style={{ width: '100%' }}>
        {label && (
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '6px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          style={combinedStyles}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {error && (
          <p
            style={{
              fontSize: '12px',
              color: '#ef4444',
              marginTop: '4px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;