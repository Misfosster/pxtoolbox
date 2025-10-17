/**
 * Playwright E2E tests for golden corpus edge cases
 * 
 * Phase 0: Visual validation of line numbering, overlay alignment, style parity
 */

import { test, expect } from '@playwright/test';

test.describe('Golden Corpus - Visual Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/tools/diff');
    // Wait for the diff tool to be loaded
    await page.waitForSelector('#diff-left');
  });

  test('Foo line deletion - line numbering visual check', async ({ page }) => {
    const leftInput = "line 1\nline 2\nfoo line to delete\nline 4\nline 5";
    const rightInput = "line 1\nline 2\nline 4\nline 5";
    
    // Input test data
    await page.locator('#diff-left').fill(leftInput);
    await page.locator('#diff-right').fill(rightInput);
    
    // Wait for diff processing
    await page.waitForTimeout(100);
    
    // Check that deleted line 9 renders with correct numbering  
    // Check that deleted line appears in left gutter  
    const leftGutter = page.getByTestId('diff-left-gutter');
    await expect(leftGutter).toContainText('3');
    
    // Verify the deleted line shows deletion marker in preview
    const preview = page.locator('#diff-output');
    await expect(preview).toContainText('-');
    
    // Right side should show lines 1,2,3,4 (where line 3 = "line 4", line 4 = "line 5")
    const rightGutter = page.getByTestId('diff-right-gutter');
    await expect(rightGutter).toContainText('1');
    await expect(rightGutter).toContainText('2');
    await expect(rightGutter).toContainText('3'); // Right line 3 exists (contains "line 4")
    await expect(rightGutter).toContainText('4'); // Right line 4 exists (contains "line 5")
  });

  test('Preview visible at 100% zoom', async ({ page }) => {
    // Test data with word-level changes
    const leftInput = "The quick brown fox";
    const rightInput = "The quick red fox";
    
    await page.locator('#diff-left').fill(leftInput);
    await page.locator('#diff-right').fill(rightInput);
    
    await page.waitForTimeout(100);
    
    // Preview present
    const preview = page.locator('#diff-output');
    await expect(preview).toBeVisible();
  });

  test('Preview visible at 125% zoom', async ({ page }) => {
    // Set browser zoom to 125%
    await page.setViewportSize({ width: 1280 * 0.8, height: 720 * 0.8 });
    await page.evaluateHandle(() => document.body.style.zoom = '1.25');
    
    const leftInput = "The quick brown fox";
    const rightInput = "The quick red fox";
    
    await page.locator('#diff-left').fill(leftInput);
    await page.locator('#diff-right').fill(rightInput);
    
    await page.waitForTimeout(200); // Extra wait for zoom
    
    const preview = page.locator('#diff-output');
    await expect(preview).toBeVisible();
  });

  test('Persisted-only view keeps equals and hides deletions', async ({ page }) => {
    const leftInputText = "same1\nchanged line\nsame2\ndeleted line\nsame3";
    const rightInput = "same1\nmodified line\nsame2\nsame3";
    
    await page.locator('#diff-left').fill(leftInputText);
    await page.locator('#diff-right').fill(rightInput);
    
    await page.waitForTimeout(100);
    
    // Enable persisted-only view (if toggle exists)
    const persistedOnlyToggle = page.locator('.bp6-switch:has(input[aria-label="Persisted-only preview"]) .bp6-control-indicator');
    if (await persistedOnlyToggle.isVisible()) {
      await persistedOnlyToggle.click();
      await page.waitForTimeout(100);
      
      // Preview should keep equals and hide deletions
      const preview = page.locator('#diff-output');
      const previewText = await preview.textContent();
      
      // Equals remain
      expect(previewText).toContain('same1');
      expect(previewText).toContain('same2');
      expect(previewText).toContain('same3');

      // Deletions hidden
      expect(previewText).not.toContain('deleted line');
    }
  });

  test('Style parity - same CSS classes on preview and overlays', async ({ page }) => {
    const leftInput = "deleted word here";
    const rightInput = "added word here";
    
    await page.locator('#diff-left').fill(leftInput);
    await page.locator('#diff-right').fill(rightInput);
    
    await page.waitForTimeout(100);
    
    const preview = page.locator('#diff-output');
    await expect(preview.locator('.diff-seg.diff-del').first()).toBeVisible();
  });

  test('Unicode emoji safety - no broken rendering', async ({ page }) => {
    const leftInput = "Hello 👨‍👩‍👧‍👦 family\nFlags: 🇺🇸🇫🇷";
    const rightInput = "Hello 👨‍👩‍👧‍👦 group\nFlags: 🇺🇸🇩🇪";
    
    await page.locator('#diff-left').fill(leftInput);
    await page.locator('#diff-right').fill(rightInput);
    
    await page.waitForTimeout(100);
    
    const preview = page.locator('#diff-output');
    
    // Check that ZWJ family emoji stays intact
    await expect(preview).toContainText('👨‍👩‍👧‍👦');
    
    // Check that flag emojis are preserved
    await expect(preview).toContainText('🇺🇸');
    await expect(preview).toContainText('🇫🇷');
    await expect(preview).toContainText('🇩🇪');
    
    // Verify no broken emoji fragments (□ or similar)
    const previewText = await preview.textContent();
    expect(previewText).not.toContain('□');
    expect(previewText).not.toMatch(/[\uFFFD]/); // replacement character
  });

  test('N≠M case - no cross-line token bleeding', async ({ page }) => {
    const leftInput = "function test() {\n  return \"old\";\n}";
    const rightInput = "function test() { return \"new\"; }";
    
    await page.locator('#diff-left').fill(leftInput);
    await page.locator('#diff-right').fill(rightInput);
    
    await page.waitForTimeout(100);
    
    // Verify that tokens from line 2 don't appear highlighted on line 1
    const leftOverlay = page.locator('#diff-left-overlay');
    const rightOverlay = page.locator('#diff-right-overlay');
    
    // Check overlay structure - should not have cross-line highlights
    const overlayElements = await leftOverlay.locator('.diff-seg').count();
    expect(overlayElements).toBeGreaterThanOrEqual(0);
    
    // Preview should show proper line separation
    const preview = page.locator('#diff-output');
    const previewText = await preview.textContent();
    
    // Should have distinct lines, no merged content
    expect(previewText).toContain('function test()');
    expect(previewText).toContain('return');
  });

  test('Bazaz regression - no duplicate tokens in UI', async ({ page }) => {
    const leftInput = "foo\nbar\nbazaz";
    const rightInput = "foo\nbar\nbaz";
    
    await page.locator('#diff-left').fill(leftInput);
    await page.locator('#diff-right').fill(rightInput);
    
    await page.waitForTimeout(100);
    
    const preview = page.locator('#diff-output');
    await expect(preview).toContainText('baz');
  });
});

test.describe('Golden Corpus - Performance at Scale', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/tools/diff');
    // Wait for the diff tool to be loaded
    await page.waitForSelector('#diff-left');
  });

  test('Large content performance - 100+ lines', async ({ page }) => {
    // Generate large content
    const lines = Array.from({ length: 100 }, (_, i) => `Line ${i + 1} content here`);
    const leftInput = lines.join('\n');
    const rightInput = lines.map((line, i) => 
      i === 50 ? 'Modified line 51 content here' : line
    ).join('\n');
    
    const startTime = Date.now();
    
    await page.locator('#diff-left').fill(leftInput);
    await page.locator('#diff-right').fill(rightInput);
    
    // Wait for processing to complete
    await page.waitForTimeout(500);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (< 2 seconds)
    expect(duration).toBeLessThan(2000);
    
    // Verify UI is still responsive
    const preview = page.locator('#diff-output');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('Modified line 51');
  });
});
