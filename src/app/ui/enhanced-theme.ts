/**
 * Enhanced UI Theme Extensions
 * 現代的で洗練されたUIデザインの拡張
 */

export function installEnhancedTheme(doc?: typeof document): void {
  const d = doc ?? document;
  if (!d.getElementById('enhanced-theme')) {
    const style = d.createElement('style');
    style.id = 'enhanced-theme';
    style.textContent = `
      /* Enhanced Visual Effects */
      :root {
        /* Glassmorphism Effects */
        --glass-backdrop: blur(20px) saturate(180%);
        --glass-opacity: 0.08;
        --glass-border: rgba(255, 255, 255, 0.125);
        
        /* Enhanced Shadows */
        --shadow-soft: 0 2px 24px rgba(0, 0, 0, 0.08), 0 4px 32px rgba(0, 0, 0, 0.04);
        --shadow-medium: 0 4px 32px rgba(0, 0, 0, 0.12), 0 8px 64px rgba(0, 0, 0, 0.08);
        --shadow-strong: 0 8px 48px rgba(0, 0, 0, 0.16), 0 16px 80px rgba(0, 0, 0, 0.12);
        
        /* Gradient Backgrounds */
        --gradient-primary: linear-gradient(135deg, var(--md3-color-primary) 0%, var(--md3-color-tertiary) 100%);
        --gradient-surface: linear-gradient(135deg, var(--md3-color-surface-container) 0%, var(--md3-color-surface-container-high) 100%);
        --gradient-header: linear-gradient(135deg, var(--md3-color-primary-container) 0%, var(--md3-color-secondary-container) 50%, var(--md3-color-tertiary-container) 100%);
        
        /* Animation Curves */
        --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
        --ease-in-out-quart: cubic-bezier(0.77, 0, 0.175, 1);
        --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
        
        /* Enhanced Spacing */
        --spacing-xs: 0.125rem; /* 2px */
        --spacing-sm: 0.375rem; /* 6px */
        --spacing-md: 0.875rem; /* 14px */
        --spacing-lg: 1.125rem; /* 18px */
        --spacing-xl: 1.75rem; /* 28px */
        --spacing-2xl: 2.25rem; /* 36px */
        --spacing-3xl: 3.5rem; /* 56px */
      }

      /* Enhanced Header with Gradient Background */
      [data-ui-theme="md3"] .enhanced-header {
        background: var(--gradient-header);
        backdrop-filter: var(--glass-backdrop);
        border-radius: 0 0 var(--md3-shape-corner-extra-large) var(--md3-shape-corner-extra-large);
        padding: var(--spacing-2xl) var(--md3-spacing-6);
        position: relative;
        overflow: hidden;
      }

      [data-ui-theme="md3"] .enhanced-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
        pointer-events: none;
      }

      /* Enhanced Title with Better Typography */
      [data-ui-theme="md3"] .enhanced-title {
        background: linear-gradient(135deg, var(--md3-color-on-primary-container), var(--md3-color-primary));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-weight: 700;
        letter-spacing: -0.025em;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        position: relative;
        z-index: 1;
      }

      /* Enhanced Cards with Improved Shadows and Borders */
      [data-ui-theme="md3"] .enhanced-card {
        background: var(--gradient-surface);
        backdrop-filter: var(--glass-backdrop);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-soft);
        border-radius: var(--md3-shape-corner-large);
        transition: transform var(--md3-motion-duration-medium2) var(--ease-out-expo),
                    box-shadow var(--md3-motion-duration-medium2) var(--ease-out-expo);
        overflow: hidden;
        position: relative;
      }

      [data-ui-theme="md3"] .enhanced-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      }

      [data-ui-theme="md3"] .enhanced-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-medium);
      }

      /* Enhanced Panel Styling */
      [data-ui-theme="md3"] .enhanced-panel {
        background: var(--gradient-surface);
        border: 1px solid var(--glass-border);
        backdrop-filter: var(--glass-backdrop);
        box-shadow: var(--shadow-soft);
        border-radius: var(--md3-shape-corner-large);
        padding: var(--spacing-2xl);
        position: relative;
        overflow: hidden;
      }

      /* Enhanced Button Styling */
      [data-ui-theme="md3"] .enhanced-button {
        background: var(--gradient-primary);
        border: none;
        box-shadow: var(--shadow-soft);
        backdrop-filter: var(--glass-backdrop);
        border-radius: var(--md3-shape-corner-full);
        padding: var(--md3-spacing-4) var(--spacing-2xl);
        font-weight: 600;
        letter-spacing: 0.025em;
        transition: all var(--md3-motion-duration-medium1) var(--spring);
        position: relative;
        overflow: hidden;
      }

      [data-ui-theme="md3"] .enhanced-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left var(--md3-motion-duration-medium3) var(--ease-out-expo);
      }

      [data-ui-theme="md3"] .enhanced-button:hover::before {
        left: 100%;
      }

      [data-ui-theme="md3"] .enhanced-button:hover {
        transform: translateY(-1px);
        box-shadow: var(--shadow-medium);
      }

      [data-ui-theme="md3"] .enhanced-button:active {
        transform: translateY(0);
        box-shadow: var(--shadow-soft);
      }

      /* Enhanced Secondary Button */
      [data-ui-theme="md3"] .enhanced-secondary-button {
        background: rgba(var(--md3-color-secondary-container), var(--glass-opacity));
        backdrop-filter: var(--glass-backdrop);
        border: 1px solid var(--glass-border);
        color: var(--md3-color-on-secondary-container);
        border-radius: var(--md3-shape-corner-medium);
        padding: var(--spacing-sm) var(--md3-spacing-4);
        font-weight: 500;
        transition: all var(--md3-motion-duration-short3) var(--ease-out-expo);
      }

      [data-ui-theme="md3"] .enhanced-secondary-button:hover {
        background: var(--md3-color-secondary-container);
        transform: translateY(-1px);
        box-shadow: var(--shadow-soft);
      }

      /* Enhanced Form Controls */
      [data-ui-theme="md3"] .enhanced-input,
      [data-ui-theme="md3"] .enhanced-select {
        background: rgba(var(--md3-color-surface-container-highest), var(--glass-opacity));
        backdrop-filter: var(--glass-backdrop);
        border: 1.5px solid var(--glass-border);
        border-radius: var(--md3-shape-corner-medium);
        transition: all var(--md3-motion-duration-short3) var(--ease-out-expo);
        position: relative;
      }

      [data-ui-theme="md3"] .enhanced-input:focus,
      [data-ui-theme="md3"] .enhanced-select:focus {
        border-color: var(--md3-color-primary);
        box-shadow: 0 0 0 3px rgba(var(--md3-color-primary), 0.1);
        background: var(--md3-color-surface-container-highest);
        transform: translateY(-1px);
      }

      /* Enhanced Upload Zone */
      [data-ui-theme="md3"] .enhanced-upload-zone {
        background: var(--gradient-surface);
        border: 2px dashed var(--md3-color-outline);
        border-radius: var(--md3-shape-corner-large);
        padding: var(--spacing-2xl);
        text-align: center;
        transition: all var(--md3-motion-duration-medium1) var(--ease-out-expo);
        position: relative;
        overflow: hidden;
      }

      [data-ui-theme="md3"] .enhanced-upload-zone::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(var(--md3-color-primary), 0.05) 0%, transparent 70%);
        transform: translate(-50%, -50%);
        opacity: 0;
        transition: opacity var(--md3-motion-duration-medium1) var(--ease-out-expo);
      }

      [data-ui-theme="md3"] .enhanced-upload-zone:hover {
        border-color: var(--md3-color-primary);
        transform: translateY(-2px);
        box-shadow: var(--shadow-soft);
      }

      [data-ui-theme="md3"] .enhanced-upload-zone:hover::before {
        opacity: 1;
      }

      /* Enhanced Progress Card */
      [data-ui-theme="md3"] .enhanced-progress-card {
        background: var(--gradient-surface);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-soft);
        position: relative;
      }

      [data-ui-theme="md3"] .enhanced-progress-card::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--gradient-primary);
        border-radius: var(--md3-shape-corner-small) var(--md3-shape-corner-small) 0 0;
      }

      /* Enhanced Loading Animation */
      [data-ui-theme="md3"] .enhanced-loading {
        position: relative;
      }

      [data-ui-theme="md3"] .enhanced-loading::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        margin: -10px 0 0 -10px;
        border: 2px solid transparent;
        border-top: 2px solid var(--md3-color-primary);
        border-radius: 50%;
        animation: enhanced-spin 1s linear infinite;
      }

      @keyframes enhanced-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* Enhanced Status Messages */
      [data-ui-theme="md3"] .enhanced-success {
        background: linear-gradient(135deg, var(--md3-color-tertiary-container), var(--md3-color-tertiary-container));
        border: 1px solid var(--md3-color-tertiary);
        border-radius: var(--md3-shape-corner-medium);
        padding: var(--md3-spacing-3) var(--md3-spacing-4);
        box-shadow: var(--shadow-soft);
        backdrop-filter: var(--glass-backdrop);
        animation: enhanced-slideIn var(--md3-motion-duration-medium3) var(--ease-out-expo);
      }

      [data-ui-theme="md3"] .enhanced-error {
        background: linear-gradient(135deg, var(--md3-color-error-container), var(--md3-color-error-container));
        border: 1px solid var(--md3-color-error);
        border-radius: var(--md3-shape-corner-medium);
        padding: var(--md3-spacing-3) var(--md3-spacing-4);
        box-shadow: var(--shadow-soft);
        backdrop-filter: var(--glass-backdrop);
        animation: enhanced-slideIn var(--md3-motion-duration-medium3) var(--ease-out-expo);
      }

      @keyframes enhanced-slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Enhanced Modal Styling */
      [data-ui-theme="md3"] .enhanced-modal {
        background: var(--gradient-surface);
        backdrop-filter: var(--glass-backdrop);
        border: 1px solid var(--glass-border);
        box-shadow: var(--shadow-strong);
        border-radius: var(--md3-shape-corner-extra-large);
        animation: enhanced-modalIn var(--md3-motion-duration-medium4) var(--spring);
      }

      @keyframes enhanced-modalIn {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }

      /* Enhanced Mobile Responsive Design */
      @media (max-width: 768px) {
        [data-ui-theme="md3"] .enhanced-header {
          padding: var(--md3-spacing-4) var(--md3-spacing-3);
          border-radius: 0 0 var(--md3-shape-corner-large) var(--md3-shape-corner-large);
        }

        [data-ui-theme="md3"] .enhanced-panel {
          padding: var(--md3-spacing-4);
        }

        [data-ui-theme="md3"] .enhanced-upload-zone {
          padding: var(--md3-spacing-4);
        }
      }

      /* Dark Mode Enhancements */
      @media (prefers-color-scheme: dark) {
        :root {
          --glass-opacity: 0.12;
          --glass-border: rgba(255, 255, 255, 0.08);
          --shadow-soft: 0 2px 24px rgba(0, 0, 0, 0.24), 0 4px 32px rgba(0, 0, 0, 0.16);
          --shadow-medium: 0 4px 32px rgba(0, 0, 0, 0.32), 0 8px 64px rgba(0, 0, 0, 0.24);
          --shadow-strong: 0 8px 48px rgba(0, 0, 0, 0.40), 0 16px 80px rgba(0, 0, 0, 0.32);
        }
      }
    `;
    d.head.appendChild(style);
  }
}
