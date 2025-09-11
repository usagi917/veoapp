import { createRoot } from 'react-dom/client';
import '../styles/tailwind.css';

export async function mount(root: Element) {
  const rt = createRoot(root);
  const { default: Page } = await import('../app/page');
  rt.render(<Page />);
}
