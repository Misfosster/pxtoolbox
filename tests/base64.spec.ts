import { test, expect } from '@playwright/test';

test.describe('Base64 Tool', () => {
  test('encodes text to Base64 on the right pane', async ({ page }) => {
    await page.goto('/tools/base64');

    const textArea = page.locator('#b64-input');
    await textArea.fill('Hello, Px!');

    const base64Area = page.locator('#b64-output');
    await expect(base64Area).toHaveValue('SGVsbG8sIFB4IQ==');
  });

  test('decodes Base64 (url/no padding/whitespace) on the left pane', async ({ page }) => {
    await page.goto('/tools/base64');

    // "Hello-World_!" base64url (no padding) is "SGVsbG8tV29ybGRfIQ"
    const messy = 'SGV s bG8tV2 9y bGRfIQ';
    await page.locator('#b64-output').fill(messy);

    await expect(page.locator('#b64-input')).toHaveValue('Hello-World_!');
  });

  test('shows error for invalid base64 when typing on the right pane', async ({ page }) => {
    await page.goto('/tools/base64');

    await page.locator('#b64-output').fill('not_base64!!');

    const helperText = page.getByText('Invalid Base64 input.');
    await expect(helperText).toBeVisible();
    await expect(page.locator('#b64-input')).toHaveValue('');
  });
});


