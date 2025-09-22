import { test, expect } from '@playwright/test';

test.describe('Diff Viewer - Empty Field Scenarios', () => {
  test('shows additions when only right side has content', async ({ page }) => {
    await page.goto('/#/tools/diff');

    // Leave left empty, fill right
    await page.locator('#diff-left').fill('');
    await page.locator('#diff-right').fill('new line 1\nnew line 2\nnew line 3');

    const output = page.locator('#diff-output');
    
    // Should show all lines as additions (+)
    await expect(output).toContainText('+1');
    await expect(output).toContainText('+2');
    await expect(output).toContainText('+3');
    await expect(output).toContainText('new line 1');
    await expect(output).toContainText('new line 2');
    await expect(output).toContainText('new line 3');
    
    // Should not contain deletion markers
    await expect(output).not.toContainText('-');
  });

  test('shows deletions when only left side has content', async ({ page }) => {
    await page.goto('/#/tools/diff');

    // Fill left, leave right empty
    await page.locator('#diff-left').fill('old line 1\nold line 2\nold line 3');
    await page.locator('#diff-right').fill('');

    const output = page.locator('#diff-output');
    
    // Should show all lines as deletions (-)
    await expect(output).toContainText('-1');
    await expect(output).toContainText('-2');
    await expect(output).toContainText('-3');
    await expect(output).toContainText('old line 1');
    await expect(output).toContainText('old line 2');
    await expect(output).toContainText('old line 3');
    
    // Should not contain addition markers
    await expect(output).not.toContainText('+');
  });

  test('shows nothing when both sides are empty', async ({ page }) => {
    await page.goto('/#/tools/diff');

    // Both empty
    await page.locator('#diff-left').fill('');
    await page.locator('#diff-right').fill('');

    const output = page.locator('#diff-output');
    
    // Should be essentially empty (maybe just counters showing 0)
    const content = await output.textContent();
    expect(content?.trim()).toBe('');
  });

  test('normal diff when both sides have content', async ({ page }) => {
    await page.goto('/#/tools/diff');

    await page.locator('#diff-left').fill('line1\nline2');
    await page.locator('#diff-right').fill('line1\nlineX');

    const output = page.locator('#diff-output');
    
    // Should show mixed markers
    await expect(output).toContainText('~'); // modification marker
    await expect(output).toContainText('line');
  });
});
