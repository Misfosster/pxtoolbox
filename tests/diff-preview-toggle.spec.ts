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
		const toggle = () => page.getByTestId('toggle-show-preview');
		const clickToggle = async () => {
			await page.evaluate(() => {
				const input = document.querySelector('[data-testid="toggle-show-preview"]') as HTMLInputElement | null;
				input?.click();
			});
		};

		await expect(previewLocator()).toHaveCount(1);
		await expect(toggle()).toBeChecked();

		await clickToggle();
		await expect(toggle()).not.toBeChecked();
		await expect(previewLocator()).toHaveCount(0);

		await page.goto(JSON_ROUTE);
		await page.waitForTimeout(200);

		await page.goto(TARGET_ROUTE);
		await expect(toggle()).not.toBeChecked();
		await expect(previewLocator()).toHaveCount(0);

		await page.reload();
		await expect(toggle()).not.toBeChecked();
		await expect(previewLocator()).toHaveCount(0);

		await clickToggle();
		await expect(toggle()).toBeChecked();
		await expect(previewLocator()).toHaveCount(1);
	});
});
