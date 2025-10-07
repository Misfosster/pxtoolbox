import { test, expect } from '@playwright/test';

test.describe('Base64 Tool', () => {
  test('encodes text to Base64 on the right pane', async ({ page }) => {
    await page.goto('/#/tools/base64');

    const textArea = page.locator('#b64-input');
    await textArea.fill('Hello, Px!');

    const base64Area = page.locator('#b64-output');
    await expect(base64Area).toHaveValue('SGVsbG8sIFB4IQ==');
  });

  test('decodes Base64 (url/no padding/whitespace) on the left pane', async ({ page }) => {
    await page.goto('/#/tools/base64');

    // "Hello-World_!" base64url (no padding) is "SGVsbG8tV29ybGRfIQ"
    const messy = 'SGV s bG8tV2 9y bGRfIQ';
    await page.locator('#b64-output').fill(messy);

    await expect(page.locator('#b64-input')).toHaveValue('Hello-World_!');
  });

  test('shows error for invalid base64 when typing on the right pane', async ({ page }) => {
    await page.goto('/#/tools/base64');

    await page.locator('#b64-output').fill('not_base64!!');

    const helperText = page.getByText('Invalid Base64 input.');
    await expect(helperText).toBeVisible();
    await expect(page.locator('#b64-input')).toHaveValue('');
  });

  // File conversion flows
  test('File (Decoded) → Base64 shows expected base64', async ({ page }) => {
    await page.goto('/#/tools/base64');

    // Ensure From is File (Decoded)
    const fromSelect = page.locator('select').first();
    await fromSelect.selectOption('file-decoded');

    // Upload a small text file "hello"; decoded file path uses readAsDataURL → Base64
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: 'hello.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });

    await expect(page.locator('#b64-output')).toHaveValue('aGVsbG8=');
  });

    
  test('File (Encoded) → Base64 reads text as-is (no data URL)', async ({ page }) => {
    await page.goto('/#/tools/base64');

    // Select From: File (Encoded)
    const fromSelect = page.locator('select').first();
    await fromSelect.selectOption('file-encoded');

    // Upload a text file that already contains Base64
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({ name: 'b64.txt', mimeType: 'text/plain', buffer: Buffer.from('aGVsbG8=') });

    await expect(page.locator('#b64-output')).toHaveValue('aGVsbG8=');
  });

  test('Base64 → File triggers a download with sensible filename', async ({ page }) => {
    await page.goto('/#/tools/base64');

    // Select From: Base64, To: File
    const fromSelect = page.locator('select').first();
    const toSelect = page.locator('select').nth(1);
    await fromSelect.selectOption('base64');
    await toSelect.selectOption('file');

    await page.locator('#file-base64-input').fill('aGVsbG8=');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download' }).click();
    const download = await downloadPromise;
    const suggested = download.suggestedFilename();
    expect(suggested).toMatch(/decoded\-text\.txt|decoded\-file\.bin/i);
  });
});


