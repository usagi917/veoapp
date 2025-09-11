import React from 'react';
import { createRoot } from 'react-dom/client';
import Page from '../app/simple';

export function mount(root: Element) {
  const rt = createRoot(root);
  rt.render(<Page />);
}

