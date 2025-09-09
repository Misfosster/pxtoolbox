import { test, expect } from '@playwright/test';

test.describe('Diff Viewer Tool', () => {
  test('renders and shows basic unified diff output', async ({ page }) => {
    await page.goto('/#/tools/diff');

    await page.locator('#diff-left').fill('line1\nline2');
    await page.locator('#diff-right').fill('line1\nlineX');

    const output = page.locator('#diff-output');
    // With merged modified line rendering, we expect a single modified marker '~' and inline highlights
    await expect(output).toContainText('~ line2X');
  });
});


