import { test, expect } from '@playwright/test';

test.describe('JSON Formatter Tool - mobile viewport', () => {
  test('is usable on narrow viewports and tree can scroll horizontally', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto('/#/tools/json');

    const longKey = 'k'.repeat(120);
    await page.locator('#json-input').fill(`{"${longKey}": {"inner": [1,2,3,4,5,6,7,8,9,10]}}`);

    await expect(page.getByTestId('toggle-text-pane')).toBeVisible();

    await page.waitForSelector('[data-testid="json-tree-pane"]');
    const hasHScroll = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="json-tree-pane"] > div > div') as HTMLElement | null;
      if (!container) return null;
      return container.scrollWidth > container.clientWidth;
    });
    expect(hasHScroll).toBe(true);
  });
});


