import { test, expect } from '@playwright/test';

test.describe('JSON Formatter Tool', () => {
  test('formats raw JSON on the right pane', async ({ page }) => {
    await page.goto('/#/tools/json');

    await page.locator('#json-input').fill('{"a":1,"b":[2,3]}');

    const out = page.locator('#json-output');
    await expect(out).toHaveValue(/\n\s+"a": 1,\n\s+"b": \[\n\s+2,\n\s+3\n\s+\]\n/);
  });

  test('editing formatted JSON updates raw (minified)', async ({ page }) => {
    await page.goto('/#/tools/json');

    await page.locator('#json-input').fill('{"count":1}');
    await page.locator('#json-output').fill(`{
  "count": 2
}`);

    await expect(page.locator('#json-input')).toHaveValue('{"count":2}');
  });

  test('shows error for invalid JSON', async ({ page }) => {
    await page.goto('/#/tools/json');

    await page.locator('#json-input').fill('{ bad json');

    const field = page.locator('.bp6-form-group', { has: page.locator('#json-input') });
    const helperText = field.getByText(/Invalid JSON:/);
    await expect(helperText).toBeVisible();
    await expect(page.locator('#json-output')).toHaveValue('');
  });
});


