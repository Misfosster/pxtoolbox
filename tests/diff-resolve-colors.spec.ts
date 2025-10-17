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
  });

  test('unresolved vs resolved colors', async ({ page }) => {
    // Test strings: change a token to make a mod
    const left = 'hello endColumn world';
    const right = 'hello endasdasdColumn world';

    await page.locator('#diff-left').fill(left);
    await page.locator('#diff-right').fill(right);

    // Ensure preview shows one mod row, with both add and del tokens present
    const preview = page.locator('#diff-output');
    await expect(preview.locator('[data-preview-line][data-marker="?"]')).toHaveCount(1);

    // In unresolved state: should have at least one .diff-del (red) and one .diff-add (green)
    await expect(preview.locator('.diff-seg.diff-del')).toHaveCountGreaterThan(0);
    await expect(preview.locator('.diff-seg.diff-add')).toHaveCountGreaterThan(0);

    // Resolve to keep-original (left side), via option button on the mod row
    const modRow = preview.locator('[data-preview-line][data-marker="?"]').first();
    // Click the left option button
    await modRow.locator('button').first().click();

    // After resolution, the mod row persists with tilde marker and purple highlight
    const persistedRow = preview.locator('[data-preview-line][data-marker="~"]').first();
    await expect(persistedRow).toBeVisible();

    // In resolved keep-original, changed tokens should show as additions (green) in the persisted row
    await expect(persistedRow.locator('.diff-seg.diff-add')).toHaveCountGreaterThan(0);
    await expect(persistedRow.locator('.diff-seg.diff-del')).toHaveCount(0);

    // Now resolve to keep-altered: click right option on a fresh diff
    await page.locator('#diff-left').fill(left);
    await page.locator('#diff-right').fill(right);
    const modRow2 = preview.locator('[data-preview-line][data-marker="?"]').first();
    await modRow2.locator('button').nth(1).click();

    const persistedRow2 = preview.locator('[data-preview-line][data-marker="~"]').first();
    await expect(persistedRow2).toBeVisible();
    await expect(persistedRow2.locator('.diff-seg.diff-add')).toHaveCountGreaterThan(0);
    await expect(persistedRow2.locator('.diff-seg.diff-del')).toHaveCount(0);
  });
});
