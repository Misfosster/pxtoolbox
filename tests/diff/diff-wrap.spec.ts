import { test, expect } from '@playwright/test';

test.describe('Diff Viewer – wrapping behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/#/tools/diff');
    await page.waitForSelector('#diff-left');
  });

  test('very long single line wraps inside unified preview (no horizontal overflow)', async ({ page }) => {
    const longChunk = '2025-10-16\tDiff Viewer: enkel Ignore whitespace + stabil preview\tForenklede Ignore whitespace (NFC, NBSP→space, kollaps space/tab, trim); fjernede side-overlays og ekstra toggles; unified preview med pile + "unresolved"-tæller; lilla markør kun for løste; status: klar til v1.0.0\tforsøgte token-join ("sayHi" ↔ "say Hi") men gav regressions → rullet tilbage; valgte stabil løsning ift. layout og tidsramme\tstabil release-adfærd selvom ikke fuld parity; afvigelse fra oprindelig plan dokumenteret\tnæste: færdiggør dokumentation (README, release notes) og tilføj "Copy merged"-knap i unified preview';
    const left = longChunk;
    const right = longChunk.replace('stabil preview', 'stabil preview!');

    await page.locator('#diff-left').fill(left);
    await page.locator('#diff-right').fill(right);

    // Wait for diff rendering
    await page.waitForTimeout(200);

    const preview = page.locator('#diff-output');
    await expect(preview).toBeVisible();

    // Assert no horizontal overflow on the preview container
    const { clientWidth, scrollWidth } = await preview.evaluate((el) => ({
      clientWidth: (el as HTMLElement).clientWidth,
      scrollWidth: (el as HTMLElement).scrollWidth,
    }));
    expect(scrollWidth - clientWidth).toBeLessThanOrEqual(1);

    // Also ensure at least one diff token rendered
    const tokenCount = await preview.locator('[data-diff-token]').count();
    expect(tokenCount).toBeGreaterThan(0);
  });
});


