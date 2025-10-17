import { test, expect } from '@playwright/test';

test.describe('Diff Viewer – persisted-only filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/tools/diff');
    await page.waitForSelector('#diff-left');
  });

  test('hides pure deletions; keeps mods, adds, and sames', async ({ page }) => {
    const left = ['keep','to-del','modA','same'].join('\n');
    const right = ['keep','modB','same','to-add'].join('\n');

    await page.locator('#diff-left').fill(left);
    await page.locator('#diff-right').fill(right);

    const preview = page.locator('#diff-output');

    // Enable persisted-only
    await page.locator('.bp6-switch:has(input[aria-label="Persisted-only preview"]) .bp6-control-indicator').click();

    // Should hide pure deletions
    await expect(preview.locator('[data-preview-line][data-marker="-"]')).toHaveCount(0);

    // Should keep adds
    expect(await preview.locator('[data-preview-line][data-marker="+"]')).toBeTruthy();

    // Should keep mods (either '?' unresolved or '~' resolved)
    await expect(
      preview.locator('[data-preview-line][data-marker="?"], [data-preview-line][data-marker="~"]').first()
    ).toBeVisible();

    // Should keep equals
    expect(await preview.locator('[data-preview-line][data-marker=" "]').count()).toBeGreaterThan(0);
  });
});
