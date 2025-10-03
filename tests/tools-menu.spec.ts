import { test, expect } from '@playwright/test';

test.describe('Sidebar Tools menu behavior', () => {
  test('is expanded by default on tools routes', async ({ page }) => {
    await page.goto('/tools/base64');
    await expect(page.getByTestId('sidebar-tools-toggle')).toBeVisible();
    await expect(page.getByTestId('sidebar-tools-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('sidebar-tools-submenu')).toBeVisible();
  });
});


