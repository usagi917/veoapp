import React, { useRef, useEffect } from 'react';

interface ModernTextareaProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  rows?: number;
  autoResize?: boolean;
  maxRows?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outline' | 'soft' | 'subtle';
  color?: 'primary' | 'neutral' | 'success' | 'warning' | 'error';
  icon?: string;
  required?: boolean;
  className?: string;
  error?: string;
}

export function ModernTextarea({
  id,
  name,
  value,
  onChange,
  placeholder = 'テキストを入力してください...',
  label,
  disabled = false,
  rows = 3,
  autoResize = false,
  maxRows = 0,
  size = 'md',
  variant = 'outline',
  color = 'primary',
  icon,
  required = false,
  className = '',
  error,
}: ModernTextareaProps) {
  const textareaRef = useRef<globalThis.HTMLTextAreaElement>(null);

  // Auto-resize functionality
  useEffect(() => {
    if (!autoResize || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const resizeTextarea = () => {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      
      if (maxRows && maxRows > 0) {
        const lineHeight = parseInt(globalThis.getComputedStyle(textarea).lineHeight);
        const maxHeight = lineHeight * maxRows;
        textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
        textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
      } else {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
      }
    };

    resizeTextarea();
    textarea.addEventListener('input', resizeTextarea);
    
    return () => textarea.removeEventListener('input', resizeTextarea);
  }, [value, autoResize, maxRows]);

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-sm',
  };

  const variantClasses = {
    outline: 'bg-white border border-gray-300 dark:bg-gray-900 dark:border-gray-600',
    soft: 'bg-gray-50 border border-transparent dark:bg-gray-800',
    subtle: 'bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700',
  };

  const colorClasses = {
    primary: 'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500',
    neutral: 'focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:border-gray-500',
    success: 'focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:border-green-500',
    warning: 'focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:border-yellow-500',
    error: 'focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:border-red-500',
  };

  const errorClass = error ? 'border-red-500 ring-red-500' : '';

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {icon && <span className="mr-1.5" role="img" aria-hidden="true">{icon}</span>}
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={autoResize ? 1 : rows}
          required={required}
          className={`
            w-full rounded-md border-0 appearance-none placeholder:text-gray-400 dark:placeholder:text-gray-500
            focus:outline-none focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900
            disabled:cursor-not-allowed disabled:opacity-75
            transition-colors duration-200
            ${sizeClasses[size]}
            ${variantClasses[variant]}
            ${error ? 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500' : colorClasses[color]}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            ${autoResize ? 'resize-none' : 'resize-vertical'}
            ${errorClass}
          `}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? 'true' : 'false'}
        />
      </div>

      {error && (
        <div 
          id={`${id}-error`} 
          className="mt-1 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          <span className="mr-1" role="img" aria-hidden="true">⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
}
