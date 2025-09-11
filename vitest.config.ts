import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: false,
    // サンドボックス環境でのワーカープロセス終了エラー回避
    pool: 'threads',
    poolOptions: { threads: { singleThread: true } },
  },
});
