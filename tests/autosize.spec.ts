import { test, expect } from '@playwright/test';

test.describe('Autosize behavior', () => {
  test('textareas grow with content in Base64 tool', async ({ page }) => {
    await page.goto('/#/tools/base64');
    const input = page.locator('#b64-input');
    const initialHeight = await input.evaluate((el) => (el as HTMLTextAreaElement).clientHeight);
    await input.fill(Array.from({ length: 40 }, (_, i) => `line ${i}`).join('\n'));
    const grownHeight = await input.evaluate((el) => (el as HTMLTextAreaElement).clientHeight);
    expect(grownHeight).toBeGreaterThan(initialHeight);
  });
});


