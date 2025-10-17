import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Desktop Chrome HiDPI'] });

test.describe('Diff Viewer – preview stability at HiDPI', () => {
  test('preview remains visible and renders tokens at dpr=2', async ({ page }) => {
    await page.goto('/#/tools/diff');
    await page.waitForSelector('#diff-left');

    await page.locator('#diff-left').fill('hello friend');
    await page.locator('#diff-right').fill('hello friendo');
    const preview = page.locator('#diff-output');
    await expect(preview).toBeVisible();
    // Ensure at least one diff token renders
    // Wait briefly for tokenization
    await page.waitForTimeout(200);
    const tokenCount = await preview.locator('[data-diff-token]').count();
    expect(tokenCount).toBeGreaterThan(0);
  });
});


