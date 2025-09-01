import { test, expect } from '@playwright/test';

test.describe('URL Encoder/Decoder Tool', () => {
  test('encodes text to URL-encoded on the right pane', async ({ page }) => {
    await page.goto('/#/tools/url');

    await page.locator('#url-input').fill('Hello, world! äø&?');

    await expect(page.locator('#url-output')).toHaveValue('Hello%2C%20world!%20%C3%A4%C3%B8%26%3F');
  });

  test('decodes URL-encoded (including + as space) on the left pane', async ({ page }) => {
    await page.goto('/#/tools/url');

    await page.locator('#url-output').fill('Hello%2C+world%21');

    await expect(page.locator('#url-input')).toHaveValue('Hello, world!');
  });

  test('shows error for invalid URL-encoded input on the right pane', async ({ page }) => {
    await page.goto('/#/tools/url');

    await page.locator('#url-output').fill('%E4%A'); // malformed percent sequence

    const helperText = page.getByText('Invalid URL-encoded input.');
    await expect(helperText).toBeVisible();
    await expect(page.locator('#url-input')).toHaveValue('');
  });
});


