import React from 'react';

interface ContainerProps {
  children?: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
}

const Container: React.FC<ContainerProps> = ({ 
  children, 
  className = '', 
  maxWidth = 'lg',
  padding = true
}) => {
  const maxWidthValues = {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    full: '100%',
  };

  const baseStyles = {
    width: '100%',
    maxWidth: maxWidthValues[maxWidth],
    marginLeft: 'auto',
    marginRight: 'auto',
    ...(padding && {
      paddingLeft: '16px',
      paddingRight: '16px',
    }),
  };

  // Apply responsive padding using CSS in JS approach
  React.useEffect(() => {
    if (padding) {
      const style = document.createElement('style');
      style.textContent = `
        .responsive-container {
          width: 100%;
          margin-left: auto;
          margin-right: auto;
          padding-left: 16px;
          padding-right: 16px;
        }
        @media (min-width: 640px) {
          .responsive-container {
            padding-left: 24px;
            padding-right: 24px;
          }
        }
        @media (min-width: 1024px) {
          .responsive-container {
            padding-left: 32px;
            padding-right: 32px;
          }
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [padding]);

  return (
    <div style={baseStyles} className={`${className} ${padding ? 'responsive-container' : ''}`}>
      {children}
    </div>
  );
};

export default Container;