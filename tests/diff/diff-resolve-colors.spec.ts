import { test, expect } from '@playwright/test';

/**
 * Verify unified preview color semantics for unresolved vs resolved mods
 * - Unresolved: left tokens should render as deletions (red), right tokens as additions (green)
 * - Resolved keep-original: persisted row uses left content; changed tokens should render as additions (green)
 * - Resolved keep-altered: persisted row uses right content; changed tokens remain additions (green)
 */

 test.describe('Diff Viewer – resolve color semantics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/tools/diff');
    await page.waitForSelector('#diff-left');
    // Ensure toggles are in default state
    const persistedInput = page.locator('input[aria-label="Persisted-only preview"]');
    if (await persistedInput.isChecked()) {
      await page.locator('.bp6-switch:has(input[aria-label="Persisted-only preview"]) .bp6-control-indicator').click();
    }
    const ignoreInput = page.locator('input[aria-label="Ignore whitespace"]');
    if (await ignoreInput.isChecked()) {
      await page.locator('.bp6-switch:has(input[aria-label="Ignore whitespace"]) .bp6-control-indicator').click();
    }
  });

  test('unresolved vs resolved colors', async ({ page }) => {
    // Test strings: change a token to make a mod
    const left = 'hello endColumn world';
    const right = 'hello endasdasdColumn world';

    await page.locator('#diff-left').fill(left);
    await page.locator('#diff-right').fill(right);

    // Ensure preview shows one mod row, with both add and del tokens present
    const preview = page.locator('#diff-output');
    await expect(preview.locator('[data-preview-line][data-marker="?"]')).toBeVisible();

    // In unresolved state: should have at least one .diff-del (red) and one .diff-add (green)
    expect(await preview.locator('.diff-seg.diff-del').count()).toBeGreaterThan(0);
    expect(await preview.locator('.diff-seg.diff-add').count()).toBeGreaterThan(0);

    // Resolve to keep-original (left side), via option button on the mod row
    const modRow = preview.locator('[data-preview-line][data-marker="?"]').first();
    await expect(modRow.locator('button')).toHaveCount(2);
    // Click the left option button
    await modRow.locator('button').first().click();

    // After resolution, the mod row persists with tilde marker and purple highlight
    const persistedRow = preview.locator('[data-preview-line][data-marker="~"]').first();
    await expect(persistedRow).toBeVisible();

    // In resolved keep-original, changed tokens should show as additions (green) in the persisted row
    expect(await persistedRow.locator('.diff-seg.diff-add').count()).toBeGreaterThan(0);
    await expect(persistedRow.locator('.diff-seg.diff-del')).toHaveCount(0);

    // Revert resolution by clicking the persisted row, then choose keep-altered on the same row
    await persistedRow.click();
    const modRow2 = page.locator('#diff-output [data-preview-line][data-marker="?"]').first();
    await expect(modRow2).toBeVisible();
    await modRow2.locator('button').nth(1).click();

    const persistedRow2 = preview.locator('[data-preview-line][data-marker="~"]').first();
    await expect(persistedRow2).toBeVisible();
    expect(await persistedRow2.locator('.diff-seg.diff-add').count()).toBeGreaterThan(0);
    await expect(persistedRow2.locator('.diff-seg.diff-del')).toHaveCount(0);
  });
});
