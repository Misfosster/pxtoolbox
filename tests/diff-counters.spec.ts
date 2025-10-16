import { test, expect } from '@playwright/test';

test.describe('Diff Viewer – counters and changed-only preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/tools/diff');
    await page.getByText('Ignore whitespace').waitFor({ state: 'visible' });
  });

  test('shows + / - / ~ counters for line changes', async ({ page }) => {
    const left = ['a', 'b', 'to-del', 'c', 'extra'].join('\n');
    const right = ['a', 'bX', 'c', 'extra', 'to-add'].join('\n');
    await page.locator('#diff-left').fill(left);
    await page.locator('#diff-right').fill(right);

    const counters = page.getByTestId('diff-counters');
    await expect(counters).toBeVisible();
    await expect(counters.getByTestId('count-add')).toHaveText('+1');
    await expect(counters.getByTestId('count-del')).toHaveText('-1');
    await expect(counters.getByTestId('count-mod')).toHaveText('?1');
  });

  test('changed-only preview hides unchanged lines', async ({ page }) => {
    const left = ['keep1', 'changeMe', 'keep2'].join('\n');
    const right = ['keep1', 'changeMe!', 'keep2'].join('\n');
    await page.locator('#diff-left').fill(left);
    await page.locator('#diff-right').fill(right);

    // Unchanged lines present by default
    await expect(page.locator('#diff-output [data-preview-line][data-marker=" "]')).toHaveCount(2);

    // Enable changed-only (click Blueprint indicator to avoid input overlay issues)
    await page.locator('.bp6-switch:has(input[aria-label="Changed-only preview"]) .bp6-control-indicator').click();

    await expect(page.locator('#diff-output [data-preview-line][data-marker=" "]')).toHaveCount(0);
    // Still shows the modified line
    await expect(page.locator('#diff-output [data-preview-line][data-marker="?"]')).toHaveCount(1);
  });
});


