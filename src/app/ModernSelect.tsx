import React, { useState, useRef, useEffect } from 'react';

interface SelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface ModernSelectProps {
  id?: string;
  name?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'outline' | 'soft' | 'subtle';
  color?: 'primary' | 'neutral' | 'success' | 'warning' | 'error';
  icon?: string;
  className?: string;
}

export function ModernSelect({
  id,
  name,
  value,
  options,
  onChange,
  placeholder = '選択してください',
  label,
  disabled = false,
  size = 'md',
  variant = 'outline',
  color = 'primary',
  icon,
  className = '',
}: ModernSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<globalThis.HTMLDivElement>(null);
  const triggerRef = useRef<globalThis.HTMLButtonElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: globalThis.MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as globalThis.Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          event.preventDefault();
          if (highlightedIndex >= 0) {
            onChange(options[highlightedIndex].value);
            setIsOpen(false);
            triggerRef.current?.focus();
          }
          break;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, options, onChange]);

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
    primary: 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    neutral: 'focus:ring-2 focus:ring-gray-500 focus:border-gray-500',
    success: 'focus:ring-2 focus:ring-green-500 focus:border-green-500',
    warning: 'focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500',
    error: 'focus:ring-2 focus:ring-red-500 focus:border-red-500',
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
        </label>
      )}

      <button
        ref={triggerRef}
        id={id}
        name={name}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full rounded-md flex items-center justify-between gap-2
          transition-colors duration-200
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${colorClasses[color]}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'}
          focus:outline-none focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={label ? `${id}-label` : undefined}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <span className="text-gray-500 text-lg" role="img" aria-hidden="true">
              {icon}
            </span>
          )}
          {selectedOption?.icon && (
            <span className="text-gray-500 text-sm" role="img" aria-hidden="true">
              {selectedOption.icon}
            </span>
          )}
          <span className="truncate text-gray-900 dark:text-gray-100">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
          <ul role="listbox" className="py-1">
            {options.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={`
                  px-3 py-2 cursor-pointer flex items-center gap-2
                  transition-colors duration-150
                  ${
                    option.value === value
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'text-gray-900 dark:text-gray-100'
                  }
                  ${
                    highlightedIndex === index
                      ? 'bg-gray-100 dark:bg-gray-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }
                `}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {option.icon && (
                  <span className="text-sm" role="img" aria-hidden="true">
                    {option.icon}
                  </span>
                )}
                <span className="truncate">{option.label}</span>
                {option.value === value && (
                  <svg
                    className="w-4 h-4 ml-auto text-blue-600 dark:text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
