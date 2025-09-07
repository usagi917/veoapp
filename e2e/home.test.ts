import { test, expect } from '@playwright/test';

test('ホーム: h1に Pictalk を表示する', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Pictalk' })).toBeVisible();
});
