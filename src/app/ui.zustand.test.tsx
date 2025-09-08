import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Page from './page';
import { useAppStore } from './store';

describe('Zustand: UIとストアの結線', () => {
  it('「微パン」チェックのON/OFFがZustandストアに反映される', () => {
    // 初期値はfalse想定
    expect(useAppStore.getState().microPan).toBe(false);

    render(<Page />);

    const checkbox = screen.getByLabelText('微パン') as HTMLInputElement;
    // ON
    fireEvent.click(checkbox);
    expect(useAppStore.getState().microPan).toBe(true);

    // OFF
    fireEvent.click(checkbox);
    expect(useAppStore.getState().microPan).toBe(false);
  });
});
