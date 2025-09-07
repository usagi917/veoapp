import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'ja-JP',
  },
  reporter: [['list']],
  webServer: {
    command: 'pnpm preview',
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
