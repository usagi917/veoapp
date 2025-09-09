import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import Page from './page';

describe('MD3 テーマ適用（最小）', () => {
  beforeEach(() => {
    cleanup();
    // テーマが既に入っている場合に備えてクリア
    const tag = document.getElementById('md3-theme');
    if (tag && tag.parentNode) tag.parentNode.removeChild(tag);
    document.documentElement.removeAttribute('data-ui-theme');
  });

  it('マウント時に <style id="md3-theme"> が挿入され、html に data-ui-theme="md3" が付与される', () => {
    const el = document.createElement('div');
    render(<Page />, { container: el });

    const styleEl = document.getElementById('md3-theme');
    expect(styleEl).toBeTruthy();

    const themeAttr = document.documentElement.getAttribute('data-ui-theme');
    expect(themeAttr).toBe('md3');
  });
});
