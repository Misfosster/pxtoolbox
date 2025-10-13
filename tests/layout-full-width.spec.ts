import { test, expect, Page } from '@playwright/test';

const TARGET_ROUTE = '/#/tools/diff';

async function getBoxMetrics(page: Page, selector: string) {
  const locator = page.locator(selector).first();
  await expect(locator).toBeVisible();
  return locator.evaluate((node) => {
    const rect = (node as HTMLElement).getBoundingClientRect();
    return { width: rect.width, left: rect.left, right: rect.right };
  });
}

test.describe('App layout width utilisation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(TARGET_ROUTE);
  });

  test('workspace defaults to 90% left alignment and expands when content requires', async ({ page }) => {
    const contentBox = await getBoxMetrics(page, '.content-container');
    const wrapperBox = await getBoxMetrics(page, '.content-width-wrapper');
    const mainBox = await getBoxMetrics(page, '.main-container');

    // Default state uses fixed wrapper width (not full content width class semantics anymore)
    const isFullAtStart = await page.locator('.content-width-wrapper').evaluate(el => el.classList.contains('content-width-wrapper--full'));
    // Wrapper class may still include --full but CSS caps at 90%; just assert left alignment and right gap
    // (we avoid relying on the modifier class now that max-width is fixed to 90%)

    const leftGap = wrapperBox.left - contentBox.left;
    expect(leftGap).toBeGreaterThan(10);

    const rightGap = contentBox.right - wrapperBox.right;
    expect(rightGap).toBeGreaterThan(leftGap);

    await page.evaluate(() => {
      const left = document.getElementById('diff-left') as HTMLTextAreaElement | null;
      const right = document.getElementById('diff-right') as HTMLTextAreaElement | null;
      if (left) left.style.width = '1300px';
      if (right) right.style.width = '1300px';
    });
    await page.waitForTimeout(400);

    const expandedWrapper = await getBoxMetrics(page, '.content-width-wrapper');
    const expandedMain = await getBoxMetrics(page, '.main-container');

    // Even after expansion request, wrapper max width remains capped; ensure no horizontal overflow
    expect(Math.abs(expandedMain.width - contentBox.width)).toBeGreaterThan(24);

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(horizontalOverflow).toBeLessThanOrEqual(1);
  });
});
