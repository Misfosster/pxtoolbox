import { test, expect } from '@playwright/test';

const TARGET_ROUTE = '/#/tools/diff';
const JSON_ROUTE = '/#/tools/json';

test.describe('Diff unified preview visibility', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 900 });
		await page.goto(TARGET_ROUTE);
	});

  test('unified preview is always visible and persists across navigation and reload', async ({ page }) => {
    const preview = page.locator('#diff-output');
    await expect(preview).toBeVisible();

    // No preview toggle should exist anymore
    await expect(page.locator('[data-testid="toggle-show-preview"]')).toHaveCount(0);

    await page.goto(JSON_ROUTE);
    await page.goto(TARGET_ROUTE);
    await expect(preview).toBeVisible();

    await page.reload();
    await expect(preview).toBeVisible();
  });
});
