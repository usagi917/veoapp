// Material Design 3 包括的テーマシステム
// - JSDOMでも検証できるように <style id="md3-theme"> を挿入
// - html 要素に data-ui-theme="md3" を付与
// - 完全なMD3カラートークンとタイポグラフィシステムを実装

export function ensureMd3ThemeInstalled(doc?: typeof document): void {
  const d = doc ?? document;
  if (!d.getElementById('md3-theme')) {
    const style = d.createElement('style');
    style.id = 'md3-theme';
    style.textContent = `
      :root {
        /* Material Design 3 Color Tokens - Light Theme */
        --md3-color-primary: #6750A4;
        --md3-color-on-primary: #FFFFFF;
        --md3-color-primary-container: #EADDFF;
        --md3-color-on-primary-container: #21005D;
        
        --md3-color-secondary: #625B71;
        --md3-color-on-secondary: #FFFFFF;
        --md3-color-secondary-container: #E8DEF8;
        --md3-color-on-secondary-container: #1D192B;
        
        --md3-color-tertiary: #7D5260;
        --md3-color-on-tertiary: #FFFFFF;
        --md3-color-tertiary-container: #FFD8E4;
        --md3-color-on-tertiary-container: #31111D;
        
        --md3-color-error: #BA1A1A;
        --md3-color-on-error: #FFFFFF;
        --md3-color-error-container: #FFDAD6;
        --md3-color-on-error-container: #410002;
        
        --md3-color-background: #FFFBFE;
        --md3-color-on-background: #1C1B1F;
        --md3-color-surface: #FFFBFE;
        --md3-color-on-surface: #1C1B1F;
        --md3-color-surface-variant: #E7E0EC;
        --md3-color-on-surface-variant: #49454F;
        
        --md3-color-outline: #79747E;
        --md3-color-outline-variant: #CAC4D0;
        --md3-color-shadow: #000000;
        --md3-color-scrim: #000000;
        --md3-color-inverse-surface: #313033;
        --md3-color-inverse-on-surface: #F4EFF4;
        --md3-color-inverse-primary: #D0BCFF;
        
        /* Surface Levels */
        --md3-color-surface-dim: #DDD8DD;
        --md3-color-surface-bright: #FFFBFE;
        --md3-color-surface-container-lowest: #FFFFFF;
        --md3-color-surface-container-low: #F7F2FA;
        --md3-color-surface-container: #F1ECF4;
        --md3-color-surface-container-high: #ECE6F0;
        --md3-color-surface-container-highest: #E6E0E9;
        
        /* Typography Tokens */
        --md3-typeface-brand: 'Roboto', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        --md3-typeface-plain: 'Roboto', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        
        /* Display Scale */
        --md3-display-large-font: var(--md3-typeface-brand);
        --md3-display-large-size: 3.5625rem; /* 57px */
        --md3-display-large-weight: 400;
        --md3-display-large-line-height: 4rem; /* 64px */
        
        --md3-display-medium-font: var(--md3-typeface-brand);
        --md3-display-medium-size: 2.8125rem; /* 45px */
        --md3-display-medium-weight: 400;
        --md3-display-medium-line-height: 3.25rem; /* 52px */
        
        --md3-display-small-font: var(--md3-typeface-brand);
        --md3-display-small-size: 2.25rem; /* 36px */
        --md3-display-small-weight: 400;
        --md3-display-small-line-height: 2.75rem; /* 44px */
        
        /* Headline Scale */
        --md3-headline-large-font: var(--md3-typeface-brand);
        --md3-headline-large-size: 2rem; /* 32px */
        --md3-headline-large-weight: 400;
        --md3-headline-large-line-height: 2.5rem; /* 40px */
        
        --md3-headline-medium-font: var(--md3-typeface-brand);
        --md3-headline-medium-size: 1.75rem; /* 28px */
        --md3-headline-medium-weight: 400;
        --md3-headline-medium-line-height: 2.25rem; /* 36px */
        
        --md3-headline-small-font: var(--md3-typeface-brand);
        --md3-headline-small-size: 1.5rem; /* 24px */
        --md3-headline-small-weight: 400;
        --md3-headline-small-line-height: 2rem; /* 32px */
        
        /* Title Scale */
        --md3-title-large-font: var(--md3-typeface-brand);
        --md3-title-large-size: 1.375rem; /* 22px */
        --md3-title-large-weight: 400;
        --md3-title-large-line-height: 1.75rem; /* 28px */
        
        --md3-title-medium-font: var(--md3-typeface-plain);
        --md3-title-medium-size: 1rem; /* 16px */
        --md3-title-medium-weight: 500;
        --md3-title-medium-line-height: 1.5rem; /* 24px */
        
        --md3-title-small-font: var(--md3-typeface-plain);
        --md3-title-small-size: 0.875rem; /* 14px */
        --md3-title-small-weight: 500;
        --md3-title-small-line-height: 1.25rem; /* 20px */
        
        /* Body Scale */
        --md3-body-large-font: var(--md3-typeface-plain);
        --md3-body-large-size: 1rem; /* 16px */
        --md3-body-large-weight: 400;
        --md3-body-large-line-height: 1.5rem; /* 24px */
        
        --md3-body-medium-font: var(--md3-typeface-plain);
        --md3-body-medium-size: 0.875rem; /* 14px */
        --md3-body-medium-weight: 400;
        --md3-body-medium-line-height: 1.25rem; /* 20px */
        
        --md3-body-small-font: var(--md3-typeface-plain);
        --md3-body-small-size: 0.75rem; /* 12px */
        --md3-body-small-weight: 400;
        --md3-body-small-line-height: 1rem; /* 16px */
        
        /* Label Scale */
        --md3-label-large-font: var(--md3-typeface-plain);
        --md3-label-large-size: 0.875rem; /* 14px */
        --md3-label-large-weight: 500;
        --md3-label-large-line-height: 1.25rem; /* 20px */
        
        --md3-label-medium-font: var(--md3-typeface-plain);
        --md3-label-medium-size: 0.75rem; /* 12px */
        --md3-label-medium-weight: 500;
        --md3-label-medium-line-height: 1rem; /* 16px */
        
        --md3-label-small-font: var(--md3-typeface-plain);
        --md3-label-small-size: 0.6875rem; /* 11px */
        --md3-label-small-weight: 500;
        --md3-label-small-line-height: 1rem; /* 16px */
        
        /* Shape Tokens */
        --md3-shape-corner-none: 0;
        --md3-shape-corner-extra-small: 0.25rem; /* 4px */
        --md3-shape-corner-small: 0.5rem; /* 8px */
        --md3-shape-corner-medium: 0.75rem; /* 12px */
        --md3-shape-corner-large: 1rem; /* 16px */
        --md3-shape-corner-extra-large: 1.75rem; /* 28px */
        --md3-shape-corner-full: 9999px;
        
        /* Elevation Tokens */
        --md3-elevation-level0: none;
        --md3-elevation-level1: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15);
        --md3-elevation-level2: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15);
        --md3-elevation-level3: 0px 1px 3px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15);
        --md3-elevation-level4: 0px 2px 3px rgba(0, 0, 0, 0.3), 0px 6px 10px 4px rgba(0, 0, 0, 0.15);
        --md3-elevation-level5: 0px 4px 4px rgba(0, 0, 0, 0.3), 0px 8px 12px 6px rgba(0, 0, 0, 0.15);
        
        /* Spacing Scale */
        --md3-spacing-0: 0;
        --md3-spacing-1: 0.25rem; /* 4px */
        --md3-spacing-2: 0.5rem; /* 8px */
        --md3-spacing-3: 0.75rem; /* 12px */
        --md3-spacing-4: 1rem; /* 16px */
        --md3-spacing-5: 1.25rem; /* 20px */
        --md3-spacing-6: 1.5rem; /* 24px */
        --md3-spacing-8: 2rem; /* 32px */
        --md3-spacing-10: 2.5rem; /* 40px */
        --md3-spacing-12: 3rem; /* 48px */
        --md3-spacing-16: 4rem; /* 64px */
        
        /* Motion Tokens */
        --md3-motion-duration-short1: 50ms;
        --md3-motion-duration-short2: 100ms;
        --md3-motion-duration-short3: 150ms;
        --md3-motion-duration-short4: 200ms;
        --md3-motion-duration-medium1: 250ms;
        --md3-motion-duration-medium2: 300ms;
        --md3-motion-duration-medium3: 350ms;
        --md3-motion-duration-medium4: 400ms;
        --md3-motion-duration-long1: 450ms;
        --md3-motion-duration-long2: 500ms;
        --md3-motion-duration-long3: 550ms;
        --md3-motion-duration-long4: 600ms;
        --md3-motion-duration-extra-long1: 700ms;
        --md3-motion-duration-extra-long2: 800ms;
        --md3-motion-duration-extra-long3: 900ms;
        --md3-motion-duration-extra-long4: 1000ms;
        
        --md3-motion-easing-legacy: cubic-bezier(0.4, 0.0, 0.2, 1);
        --md3-motion-easing-linear: cubic-bezier(0, 0, 1, 1);
        --md3-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
        --md3-motion-easing-standard-accelerate: cubic-bezier(0.3, 0, 1, 1);
        --md3-motion-easing-standard-decelerate: cubic-bezier(0, 0, 0, 1);
        --md3-motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
        --md3-motion-easing-emphasized-accelerate: cubic-bezier(0.3, 0, 0.8, 0.15);
        --md3-motion-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1);
      }

      /* Dark Theme Support */
      @media (prefers-color-scheme: dark) {
        :root {
          --md3-color-primary: #D0BCFF;
          --md3-color-on-primary: #381E72;
          --md3-color-primary-container: #4F378B;
          --md3-color-on-primary-container: #EADDFF;
          
          --md3-color-secondary: #CCC2DC;
          --md3-color-on-secondary: #332D41;
          --md3-color-secondary-container: #4A4458;
          --md3-color-on-secondary-container: #E8DEF8;
          
          --md3-color-tertiary: #EFB8C8;
          --md3-color-on-tertiary: #492532;
          --md3-color-tertiary-container: #633B48;
          --md3-color-on-tertiary-container: #FFD8E4;
          
          --md3-color-error: #FFB4AB;
          --md3-color-on-error: #690005;
          --md3-color-error-container: #93000A;
          --md3-color-on-error-container: #FFDAD6;
          
          --md3-color-background: #1C1B1F;
          --md3-color-on-background: #E6E1E5;
          --md3-color-surface: #1C1B1F;
          --md3-color-on-surface: #E6E1E5;
          --md3-color-surface-variant: #49454F;
          --md3-color-on-surface-variant: #CAC4D0;
          
          --md3-color-outline: #938F99;
          --md3-color-outline-variant: #49454F;
          --md3-color-inverse-surface: #E6E1E5;
          --md3-color-inverse-on-surface: #313033;
          --md3-color-inverse-primary: #6750A4;
          
          --md3-color-surface-dim: #1C1B1F;
          --md3-color-surface-bright: #423F42;
          --md3-color-surface-container-lowest: #0F0D13;
          --md3-color-surface-container-low: #1C1B1F;
          --md3-color-surface-container: #201F23;
          --md3-color-surface-container-high: #2B2930;
          --md3-color-surface-container-highest: #36343B;
        }
      }

      /* Base Styles */
      [data-ui-theme="md3"] {
        background-color: var(--md3-color-background);
        color: var(--md3-color-on-background);
        font-family: var(--md3-body-large-font);
        font-size: var(--md3-body-large-size);
        font-weight: var(--md3-body-large-weight);
        line-height: var(--md3-body-large-line-height);
      }

      /* Typography Classes */
      [data-ui-theme="md3"] .md3-display-large {
        font-family: var(--md3-display-large-font);
        font-size: var(--md3-display-large-size);
        font-weight: var(--md3-display-large-weight);
        line-height: var(--md3-display-large-line-height);
      }
      
      [data-ui-theme="md3"] .md3-display-medium {
        font-family: var(--md3-display-medium-font);
        font-size: var(--md3-display-medium-size);
        font-weight: var(--md3-display-medium-weight);
        line-height: var(--md3-display-medium-line-height);
      }
      
      [data-ui-theme="md3"] .md3-display-small {
        font-family: var(--md3-display-small-font);
        font-size: var(--md3-display-small-size);
        font-weight: var(--md3-display-small-weight);
        line-height: var(--md3-display-small-line-height);
      }

      [data-ui-theme="md3"] .md3-headline-large {
        font-family: var(--md3-headline-large-font);
        font-size: var(--md3-headline-large-size);
        font-weight: var(--md3-headline-large-weight);
        line-height: var(--md3-headline-large-line-height);
      }

      [data-ui-theme="md3"] .md3-headline-medium {
        font-family: var(--md3-headline-medium-font);
        font-size: var(--md3-headline-medium-size);
        font-weight: var(--md3-headline-medium-weight);
        line-height: var(--md3-headline-medium-line-height);
      }

      [data-ui-theme="md3"] .md3-headline-small {
        font-family: var(--md3-headline-small-font);
        font-size: var(--md3-headline-small-size);
        font-weight: var(--md3-headline-small-weight);
        line-height: var(--md3-headline-small-line-height);
      }

      [data-ui-theme="md3"] .md3-title-large {
        font-family: var(--md3-title-large-font);
        font-size: var(--md3-title-large-size);
        font-weight: var(--md3-title-large-weight);
        line-height: var(--md3-title-large-line-height);
      }

      [data-ui-theme="md3"] .md3-title-medium {
        font-family: var(--md3-title-medium-font);
        font-size: var(--md3-title-medium-size);
        font-weight: var(--md3-title-medium-weight);
        line-height: var(--md3-title-medium-line-height);
      }

      [data-ui-theme="md3"] .md3-title-small {
        font-family: var(--md3-title-small-font);
        font-size: var(--md3-title-small-size);
        font-weight: var(--md3-title-small-weight);
        line-height: var(--md3-title-small-line-height);
      }

      [data-ui-theme="md3"] .md3-body-large {
        font-family: var(--md3-body-large-font);
        font-size: var(--md3-body-large-size);
        font-weight: var(--md3-body-large-weight);
        line-height: var(--md3-body-large-line-height);
      }

      [data-ui-theme="md3"] .md3-body-medium {
        font-family: var(--md3-body-medium-font);
        font-size: var(--md3-body-medium-size);
        font-weight: var(--md3-body-medium-weight);
        line-height: var(--md3-body-medium-line-height);
      }

      [data-ui-theme="md3"] .md3-body-small {
        font-family: var(--md3-body-small-font);
        font-size: var(--md3-body-small-size);
        font-weight: var(--md3-body-small-weight);
        line-height: var(--md3-body-small-line-height);
      }

      [data-ui-theme="md3"] .md3-label-large {
        font-family: var(--md3-label-large-font);
        font-size: var(--md3-label-large-size);
        font-weight: var(--md3-label-large-weight);
        line-height: var(--md3-label-large-line-height);
      }

      [data-ui-theme="md3"] .md3-label-medium {
        font-family: var(--md3-label-medium-font);
        font-size: var(--md3-label-medium-size);
        font-weight: var(--md3-label-medium-weight);
        line-height: var(--md3-label-medium-line-height);
      }

      [data-ui-theme="md3"] .md3-label-small {
        font-family: var(--md3-label-small-font);
        font-size: var(--md3-label-small-size);
        font-weight: var(--md3-label-small-weight);
        line-height: var(--md3-label-small-line-height);
      }

      /* Component Styles */
      [data-ui-theme="md3"] h1 {
        font-family: var(--md3-headline-large-font);
        font-size: var(--md3-headline-large-size);
        font-weight: var(--md3-headline-large-weight);
        line-height: var(--md3-headline-large-line-height);
        color: var(--md3-color-on-background);
        margin: var(--md3-spacing-6) 0 var(--md3-spacing-4);
      }

      [data-ui-theme="md3"] h2 {
        font-family: var(--md3-headline-medium-font);
        font-size: var(--md3-headline-medium-size);
        font-weight: var(--md3-headline-medium-weight);
        line-height: var(--md3-headline-medium-line-height);
        color: var(--md3-color-on-background);
        margin: var(--md3-spacing-5) 0 var(--md3-spacing-3);
      }

      [data-ui-theme="md3"] h3 {
        font-family: var(--md3-headline-small-font);
        font-size: var(--md3-headline-small-size);
        font-weight: var(--md3-headline-small-weight);
        line-height: var(--md3-headline-small-line-height);
        color: var(--md3-color-on-background);
        margin: var(--md3-spacing-4) 0 var(--md3-spacing-3);
      }

      [data-ui-theme="md3"] button {
        appearance: none;
        border: none;
        padding: var(--md3-spacing-2) var(--md3-spacing-6);
        border-radius: var(--md3-shape-corner-full);
        background-color: var(--md3-color-primary);
        color: var(--md3-color-on-primary);
        font-family: var(--md3-label-large-font);
        font-size: var(--md3-label-large-size);
        font-weight: var(--md3-label-large-weight);
        line-height: var(--md3-label-large-line-height);
        box-shadow: var(--md3-elevation-level1);
        cursor: pointer;
        transition: background-color var(--md3-motion-duration-short2) var(--md3-motion-easing-standard),
                    box-shadow var(--md3-motion-duration-short2) var(--md3-motion-easing-standard);
        min-height: 2.5rem; /* 40px */
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--md3-spacing-2);
      }
      
      [data-ui-theme="md3"] button:hover:not([disabled]) {
        box-shadow: var(--md3-elevation-level2);
        background-color: color-mix(in srgb, var(--md3-color-primary) 92%, var(--md3-color-on-primary) 8%);
      }
      
      [data-ui-theme="md3"] button:active:not([disabled]) {
        box-shadow: var(--md3-elevation-level1);
        background-color: color-mix(in srgb, var(--md3-color-primary) 88%, var(--md3-color-on-primary) 12%);
      }
      
      [data-ui-theme="md3"] button[disabled] {
        opacity: 0.38;
        cursor: not-allowed;
        box-shadow: none;
        background-color: var(--md3-color-on-surface);
        color: var(--md3-color-surface);
      }

      [data-ui-theme="md3"] input,
      [data-ui-theme="md3"] select,
      [data-ui-theme="md3"] textarea {
        background-color: var(--md3-color-surface-container-highest);
        color: var(--md3-color-on-surface);
        border: 1px solid var(--md3-color-outline);
        border-radius: var(--md3-shape-corner-small);
        padding: var(--md3-spacing-4) var(--md3-spacing-3);
        font-family: var(--md3-body-large-font);
        font-size: var(--md3-body-large-size);
        font-weight: var(--md3-body-large-weight);
        line-height: var(--md3-body-large-line-height);
        outline: none;
        transition: border-color var(--md3-motion-duration-short2) var(--md3-motion-easing-standard),
                    background-color var(--md3-motion-duration-short2) var(--md3-motion-easing-standard);
        min-height: 3.5rem; /* 56px */
        box-sizing: border-box;
      }
      
      [data-ui-theme="md3"] input:focus,
      [data-ui-theme="md3"] select:focus,
      [data-ui-theme="md3"] textarea:focus {
        border-color: var(--md3-color-primary);
        border-width: 2px;
        background-color: var(--md3-color-surface-container-high);
      }
      
      [data-ui-theme="md3"] textarea {
        min-height: 6rem; /* 96px */
        resize: vertical;
      }

      [data-ui-theme="md3"] label {
        font-family: var(--md3-body-medium-font);
        font-size: var(--md3-body-medium-size);
        font-weight: var(--md3-title-medium-weight);
        line-height: var(--md3-body-medium-line-height);
        color: var(--md3-color-on-surface-variant);
        display: block;
        margin-bottom: var(--md3-spacing-2);
      }

      [data-ui-theme="md3"] fieldset {
        border: 1px solid var(--md3-color-outline);
        border-radius: var(--md3-shape-corner-small);
        padding: var(--md3-spacing-4);
        margin: var(--md3-spacing-3) 0;
      }

      [data-ui-theme="md3"] legend {
        font-family: var(--md3-title-small-font);
        font-size: var(--md3-title-small-size);
        font-weight: var(--md3-title-small-weight);
        line-height: var(--md3-title-small-line-height);
        color: var(--md3-color-on-surface-variant);
        padding: 0 var(--md3-spacing-2);
      }

      /* Surface Components */
      [data-ui-theme="md3"] .md3-surface {
        background-color: var(--md3-color-surface);
        color: var(--md3-color-on-surface);
        border-radius: var(--md3-shape-corner-medium);
      }

      [data-ui-theme="md3"] .md3-surface-variant {
        background-color: var(--md3-color-surface-variant);
        color: var(--md3-color-on-surface-variant);
      }

      [data-ui-theme="md3"] .md3-card {
        background-color: var(--md3-color-surface-container-low);
        color: var(--md3-color-on-surface);
        border-radius: var(--md3-shape-corner-medium);
        box-shadow: var(--md3-elevation-level1);
        padding: var(--md3-spacing-4);
        margin: var(--md3-spacing-3) 0;
      }

      /* Layout Utilities */
      [data-ui-theme="md3"] .md3-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 var(--md3-spacing-4);
      }

      [data-ui-theme="md3"] .md3-grid {
        display: grid;
        gap: var(--md3-spacing-6);
      }

      [data-ui-theme="md3"] .md3-grid-2 {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      }

      /* Modal/Dialog Styles */
      [data-ui-theme="md3"] [role="dialog"] {
        background-color: var(--md3-color-surface-container-high);
        color: var(--md3-color-on-surface);
        border-radius: var(--md3-shape-corner-extra-large);
        box-shadow: var(--md3-elevation-level3);
        padding: var(--md3-spacing-6);
        min-width: 20rem;
        max-width: 35rem;
      }

      /* Error States */
      [data-ui-theme="md3"] .md3-error {
        background-color: var(--md3-color-error-container);
        color: var(--md3-color-on-error-container);
        border: 1px solid var(--md3-color-error);
        border-radius: var(--md3-shape-corner-small);
        padding: var(--md3-spacing-3) var(--md3-spacing-4);
      }

      /* Success States */
      [data-ui-theme="md3"] .md3-success {
        background-color: var(--md3-color-tertiary-container);
        color: var(--md3-color-on-tertiary-container);
        border: 1px solid var(--md3-color-tertiary);
        border-radius: var(--md3-shape-corner-small);
        padding: var(--md3-spacing-3) var(--md3-spacing-4);
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        [data-ui-theme="md3"] .md3-grid-2 {
          grid-template-columns: 1fr;
        }
        
        [data-ui-theme="md3"] .md3-container {
          padding: 0 var(--md3-spacing-2);
        }
        
        [data-ui-theme="md3"] button {
          min-height: 3rem;
          padding: var(--md3-spacing-3) var(--md3-spacing-5);
        }
      }
    `;
    d.head.appendChild(style);
  }
  const html = d.documentElement;
  if (html.getAttribute('data-ui-theme') !== 'md3') {
    html.setAttribute('data-ui-theme', 'md3');
  }
}
