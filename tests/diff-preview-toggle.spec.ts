import { test, expect } from '@playwright/test';

const TARGET_ROUTE = '/#/tools/diff';
const JSON_ROUTE = '/#/tools/json';

test.describe('Diff unified preview toggle', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 900 });
		await page.goto(TARGET_ROUTE);
	});

	test('toggle hides unified preview and persists across navigation and reload', async ({ page }) => {
		const previewLocator = () => page.locator('#diff-output');
		const toggleInput = () => page.getByLabel('Show unified preview');
		const toggleLabel = () => page.locator('label:has-text("Show unified preview")');

		await expect(previewLocator()).toHaveCount(1);
		await expect(toggleInput()).toBeChecked();

		await toggleLabel().click();
		await expect(toggleInput()).not.toBeChecked();
		await expect(previewLocator()).toHaveCount(0);

		await page.goto(JSON_ROUTE);
		await page.waitForTimeout(200);

		await page.goto(TARGET_ROUTE);
		await expect(toggleInput()).not.toBeChecked();
		await expect(previewLocator()).toHaveCount(0);

		await page.reload();
		await expect(toggleInput()).not.toBeChecked();
		await expect(previewLocator()).toHaveCount(0);

		await toggleLabel().click();
		await expect(toggleInput()).toBeChecked();
		await expect(previewLocator()).toHaveCount(1);
	});
});
