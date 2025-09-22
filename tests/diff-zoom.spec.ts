import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Desktop Chrome HiDPI'] });

test.describe('Diff Viewer – overlay anchoring at HiDPI', () => {
  test('overlay aligns with textarea content within 3px at dpr=2', async ({ page }) => {
    await page.goto('/#/tools/diff');
    await page.getByText('Ignore whitespace').waitFor({ state: 'visible' });

    await page.locator('#diff-left').fill('hello friend');
    await page.locator('#diff-right').fill('hello friendo');
    await page.getByText('Character-level inline').click();

    const overlay = page.getByTestId('overlay-right');
    const altered = page.locator('#diff-right');

    const [overlayBox, textBox, paddings] = await Promise.all([
      overlay.evaluate(el => el.getBoundingClientRect()),
      altered.evaluate(el => el.getBoundingClientRect()),
      altered.evaluate(el => {
        const cs = getComputedStyle(el as HTMLElement);
        return { left: parseFloat(cs.paddingLeft || '0'), top: parseFloat(cs.paddingTop || '0') };
      }),
    ]);

    const contentLeft = textBox.left + paddings.left;
    const contentTop = textBox.top + paddings.top;

    expect(Math.abs(overlayBox.left - contentLeft)).toBeLessThan(3);
    expect(Math.abs(overlayBox.top - contentTop)).toBeLessThan(3);
  });
});


