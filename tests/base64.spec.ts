import { test, expect } from '@playwright/test';

test.describe('Base64 Tool', () => {
  test('decodes Base64 standard string', async ({ page }) => {
    await page.goto('/#/tools/base64');

    // Switch to Decode mode
    const decodeButton = page.getByRole('button', { name: /Decode \(Base64 → text\)/ });
    await decodeButton.click();

    const input = page.locator('#b64-input');
    await input.fill('SGVsbG8sIFB4IQ==');

    const output = page.locator('#b64-output');
    await expect(output).toHaveValue('Hello, Px!');
  });

  test('decodes Base64URL without padding and with whitespace', async ({ page }) => {
    await page.goto('/#/tools/base64');

    // Switch to Decode mode
    await page.getByRole('button', { name: /Decode \(Base64 → text\)/ }).click();

    // "Hello-World_!" base64url (no padding) is "SGVsbG8tV29ybGRfIQ"
    const messy = 'SGV s bG8tV2 9y bGRfIQ';
    await page.locator('#b64-input').fill(messy);

    await expect(page.locator('#b64-output')).toHaveValue('Hello-World_!');
  });

  test('shows error for invalid base64', async ({ page }) => {
    await page.goto('/#/tools/base64');
    await page.getByRole('button', { name: /Decode \(Base64 → text\)/ }).click();

    await page.locator('#b64-input').fill('not_base64!!');

    const helperText = page.getByText('Invalid Base64 input.');
    await expect(helperText).toBeVisible();
    await expect(page.locator('#b64-output')).toHaveValue('');
  });
});


