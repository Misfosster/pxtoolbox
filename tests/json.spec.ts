import { test, expect } from '@playwright/test';

test.describe('JSON Formatter Tool', () => {
  test('formats raw JSON using the Format button', async ({ page }) => {
    await page.goto('/#/tools/json');

    await page.locator('#json-input').fill('{"a":1,"b":[2,3]}');
    await page.getByTestId('format-btn').click();

    await expect(page.locator('#json-input')).toHaveValue(/\n\s+"a": 1,\n\s+"b": \[\n\s+2,\n\s+3\n\s+\]\n/);
  });

  test('minifies pretty JSON using the Minify button', async ({ page }) => {
    await page.goto('/#/tools/json');

    await page.locator('#json-input').fill(`{
  "count": 2,
  "arr": [1, 2]
}`);
    await page.getByTestId('minify-btn').click();

    await expect(page.locator('#json-input')).toHaveValue('{"count":2,"arr":[1,2]}');
  });

  test('shows error for invalid JSON', async ({ page }) => {
    await page.goto('/#/tools/json');

    await page.locator('#json-input').fill('{ bad json');

    const field = page.locator('.bp6-form-group', { has: page.locator('#json-input') });
    const helperText = field.getByText(/Invalid JSON:/);
    await expect(helperText).toBeVisible();
  });
});


