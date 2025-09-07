/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { createRoot } from 'react-dom/client';
import Page from '../app/page';

export function mount(root: unknown) {
  const rt = createRoot(root as any);
  rt.render(<Page />);
}
