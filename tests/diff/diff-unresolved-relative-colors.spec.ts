import { test, expect } from '@playwright/test';

test.describe('Diff Viewer – unresolved relative coloring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/tools/diff');
    await page.waitForSelector('#diff-left');
  });

  test('left shows left-only green and right-only red; right shows inverse', async ({ page }) => {
    const left = 'foo foo bar';
    const right = 'foo barz';

    await page.locator('#diff-left').fill(left);
    await page.locator('#diff-right').fill(right);

    const preview = page.locator('#diff-output');
    const mod = preview.locator('[data-preview-line][data-marker="?"]').first();

    // Option 0 (keep-original) should show left perspective (left-only green, right-only red)
    const leftOption = mod.locator('button').first();
    // Click to open focus (ensures option content rendered)
    await leftOption.hover();
    expect(await leftOption.locator('.diff-seg.diff-add').count()).toBeGreaterThan(0); // left-only
    expect(await leftOption.locator('.diff-seg.diff-del').count()).toBeGreaterThan(0); // right-only

    // Option 1 (keep-altered) should show right perspective (right-only green, left-only red)
    const rightOption = mod.locator('button').nth(1);
    await rightOption.hover();
    expect(await rightOption.locator('.diff-seg.diff-add').count()).toBeGreaterThan(0); // right-only
    expect(await rightOption.locator('.diff-seg.diff-del').count()).toBeGreaterThan(0); // left-only
  });
});
