import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// 各テスト後にDOMをクリーンアップして重複を防ぐ
afterEach(() => {
  cleanup();
});
