import { test, expect } from '@playwright/test';

test.describe('ToolShell layout', () => {
	test('renders header and content on Base64 tool', async ({ page }) => {
		await page.goto('/tools/base64');
		await expect(page.getByRole('heading', { level: 3, name: 'Base64 Encoder/Decoder' })).toBeVisible();
		await expect(page.getByText('Convert text to and from Base64')).toBeVisible();
		await expect(page.locator('#b64-input')).toBeVisible();
		await expect(page.locator('#b64-output')).toBeVisible();
	});

	test('renders header and content on JWT tool', async ({ page }) => {
		await page.goto('/tools/jwt');
		await expect(page.getByRole('heading', { level: 3, name: 'JWT Decoder' })).toBeVisible();
		await expect(page.getByText('Decode JSON Web Tokens locally')).toBeVisible();
		await expect(page.locator('#jwt-input')).toBeVisible();
		await expect(page.getByText('Decoded')).toBeVisible();
	});
});


