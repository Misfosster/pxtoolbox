import { test, expect } from '@playwright/test';

test.describe('Diff Viewer – resolved spacing preserved', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/tools/diff');
    await page.waitForSelector('#diff-left');
  });

  test('keep-original preserves spaces even with ignore whitespace enabled', async ({ page }) => {
    const left = 'foo foo bar';
    const right = 'foo barz';

    await page.locator('#diff-left').fill(left);
    await page.locator('#diff-right').fill(right);

    // Enable ignore whitespace
    await page.locator('.bp6-switch:has(input[aria-label="Ignore whitespace"]) .bp6-control-indicator').click();

    const preview = page.locator('#diff-output');
    const mod = preview.locator('[data-preview-line][data-marker="?"]').first();
    // Resolve keep-original
    await mod.locator('button').first().click();

    const persisted = preview.locator('[data-preview-line][data-marker="~"]').first();
    await expect(persisted).toBeVisible();

    // Expect a space gap between tokens remains visible in text
    const text = await persisted.textContent();
    expect(text && /foo\s+foo\s+bar/.test(text)).toBeTruthy();
  });
});
