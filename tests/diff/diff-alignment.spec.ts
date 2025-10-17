import { test, expect } from '@playwright/test';

test.describe('Diff Viewer – numbering + preview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/tools/diff');
    await page.waitForSelector('#diff-left');
  });

  test('deleted line reported at its original index (no wrong shift)', async ({ page }) => {
    const original = [
      'hello friend',
      'useRightHands',
      'path/to/file-02.txt',
      'version v2beta2 build 43',
      'url: https://example.com/api?key=abc&flag=on&new=1',
      'unicode: café — touché',
      'emoji: 👋 + family: 👨‍👩‍👧',
      'mixedScript: LatinРусскийMixX',
      'spacing: foo bar  baz',
      'ids: user_id_123',
      'quote: “smart” vs "dumb"',
      'numbers: 1,234.75',
    ].join('\n');

    const altered = [
      'hello friend',
      'useRightHand',
      'path/to/file-01.txt',
      'version v2beta1 build 42',
      'url: https://example.com/api?key=abc&flag=off',
      'unicode: café — touché',
      'emoji: 👋 + family: 👨‍👩‍👧',
      'mixedScript: LatinРусскийMix',
      'ids: user_id_123',
      'quote: “smart” vs "dumb"',
      'numbers: 1,234.50',
    ].join('\n');

    await page.locator('#diff-left').fill(original);
    await page.locator('#diff-right').fill(altered);

    const delRows = page.locator('[data-preview-line][data-marker="-"]');
    await expect(delRows).toHaveCount(1);
    await expect(delRows.first()).toContainText('spacing: foo bar  baz');
    await expect(delRows.first()).toHaveAttribute('data-display-index', '9');
  });

  test('preview renders add token for simple word change', async ({ page }) => {
    await page.locator('#diff-left').fill('hello friend');
    await page.locator('#diff-right').fill('hello friendo');

    await page.waitForTimeout(50);
    const preview = page.locator('#diff-output');
    await expect(preview.locator('[data-diff-token].diff-seg.diff-add').first()).toBeVisible();
  });
});


