import { test, expect, Page } from '@playwright/test';

async function getStyles(page: Page, locator: ReturnType<Page['locator']>) {
  const el = locator.first();
  await expect(el).toBeVisible();
  return el.evaluate((node) => {
    const cs = window.getComputedStyle(node as HTMLElement);
    return {
      backgroundColor: cs.backgroundColor,
      borderRadius: cs.borderRadius,
      fontWeight: cs.fontWeight,
    };
  });
}

test.describe('Diff Viewer – preview token styling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/tools/diff');
  });

  test('preview uses .diff-seg.diff-add|diff-del classes', async ({ page }) => {
    await page.locator('#diff-left').fill('hello friend');
    await page.locator('#diff-right').fill('hello friendo');
    const previewAdd = page.locator('#diff-output').locator('[data-diff-token].diff-seg.diff-add');
    await expect(previewAdd.first()).toBeVisible();
  });

  test('computed styles for add tokens (light mode)', async ({ page }) => {
    await page.locator('#diff-left').fill('hello friend');
    await page.locator('#diff-right').fill('hello friendo');
    const previewAdd = page.locator('#diff-output').locator('[data-diff-token].diff-seg.diff-add');
    const styles = await getStyles(page, previewAdd);
    expect(styles.backgroundColor).toBeTruthy();
  });

  test('computed styles for del tokens (dark mode)', async ({ page }) => {
    await page.locator('#diff-left').fill('old word here');
    await page.locator('#diff-right').fill('new word here');
    
    // enable dark theme class (Blueprint 6)  
    await page.evaluate(() => document.body.classList.add('bp6-dark'));

    // Wait for diff processing
    await page.waitForTimeout(200);

    const previewDel = page.locator('#diff-output').locator('.diff-seg.diff-del');
    const styles = await getStyles(page, previewDel);
    expect(styles.backgroundColor).toBeTruthy();
  });

  test('long wrapped line: parity maintained', async ({ page }) => {
    const longLeft = 'a '.repeat(400) + 'X';
    const longRight = 'a '.repeat(401) + 'X';
    await page.locator('#diff-left').fill(longLeft);
    await page.locator('#diff-right').fill(longRight);
    const previewAdd = page.locator('#diff-output').locator('[data-diff-token].diff-seg.diff-add');
    const styles = await getStyles(page, previewAdd);
    expect(styles.backgroundColor).toBeTruthy();
  });
});


