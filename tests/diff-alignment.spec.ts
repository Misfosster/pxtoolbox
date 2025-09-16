import { test, expect } from '@playwright/test';

test.describe('Diff Viewer – overlay + numbering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Ensure the tool is visible; if there's a tab, adjust as needed
    await page.getByText('Ignore whitespace').waitFor({ state: 'visible' });
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

    await page.getByLabel('Original').fill(original);
    await page.getByLabel('Altered').fill(altered);

    const delRows = page.locator('[data-preview-line][data-marker="-"]');
    await expect(delRows).toHaveCount(1);
    await expect(delRows.first()).toContainText('spacing: foo bar  baz');
    await expect(delRows.first()).toHaveAttribute('data-display-index', '9');
  });

  test('overlay tokens anchored to text (tolerance <= 2px) and shows add token', async ({ page }) => {
    await page.getByLabel('Original').fill('hello friend');
    await page.getByLabel('Altered').fill('hello friendo');

    await page.getByText('Character-level inline').click();

    const overlay = page.getByTestId('overlay-right');
    const alteredBox = page.getByLabel('Altered');

    const [overlayBox, textBox] = await Promise.all([
      overlay.evaluate(el => el.getBoundingClientRect()),
      alteredBox.evaluate(el => el.getBoundingClientRect()),
    ]);

    expect(Math.abs(overlayBox.left - textBox.left)).toBeLessThan(3);
    expect(Math.abs(overlayBox.top - textBox.top)).toBeLessThan(3);

    await expect(overlay.locator('[data-diff-token][data-type="add"]')).toHaveCount(1);
  });
});


