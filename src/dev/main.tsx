import React from 'react';
import { createRoot } from 'react-dom/client';

export async function mount(root: Element) {
  const rt = createRoot(root);
  if (import.meta.env.PROD) {
    const { default: Page } = await import('../app/page');
    rt.render(<Page />);
  } else {
    const { default: Simple } = await import('../app/simple');
    rt.render(<Simple />);
  }
}
