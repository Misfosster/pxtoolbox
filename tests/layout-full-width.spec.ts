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

  test('workspace defaults to 75% left alignment and expands when content requires', async ({ page }) => {
    const contentBox = await getBoxMetrics(page, '.content-container');
    const wrapperBox = await getBoxMetrics(page, '.content-width-wrapper');
    const mainBox = await getBoxMetrics(page, '.main-container');

    const widthRatio = wrapperBox.width / contentBox.width;
    expect(widthRatio).toBeGreaterThan(0.72);
    expect(widthRatio).toBeLessThan(0.78);

    const leftGap = wrapperBox.left - contentBox.left;
    expect(leftGap).toBeGreaterThan(15);
    expect(leftGap).toBeLessThan(26);

    const rightGap = contentBox.right - wrapperBox.right;
    expect(rightGap).toBeGreaterThan(leftGap + 120);

    await page.evaluate(() => {
      const main = document.querySelector('.main-container');
      if (!main) return;
      const filler = document.createElement('div');
      filler.id = 'layout-width-test-filler';
      filler.style.width = '1400px';
      filler.style.height = '1px';
      filler.style.pointerEvents = 'none';
      filler.style.flexShrink = '0';
      main.appendChild(filler);
    });

    await page.waitForTimeout(250);

    const expandedWrapper = await getBoxMetrics(page, '.content-width-wrapper');
    const expandedMain = await getBoxMetrics(page, '.main-container');

    expect(Math.abs(expandedWrapper.width - contentBox.width)).toBeLessThan(3);
    expect(Math.abs(expandedMain.width - contentBox.width)).toBeLessThan(3);

    await page.evaluate(() => {
      document.getElementById('layout-width-test-filler')?.remove();
    });
    await page.waitForTimeout(50);

    const horizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(horizontalOverflow).toBeLessThanOrEqual(1);
  });
});
