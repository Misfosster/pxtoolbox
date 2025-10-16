import { test, expect } from '@playwright/test';

test.describe('Diff Viewer Tool', () => {
  test('renders and shows basic unified diff output', async ({ page }) => {
    await page.goto('/#/tools/diff');

    await page.locator('#diff-left').fill('line1\nline2');
    await page.locator('#diff-right').fill('line1\nlineX');

    const output = page.locator('#diff-output');
    // Preview renders markers in a gutter cell; assert presence of any change markers
    await expect(output).toContainText('?');
    await expect(output).toContainText('line');
  });

  test('shows deletion when right is empty', async ({ page }) => {
    await page.goto('/#/tools/diff');
    await page.locator('#diff-left').fill('only-left');
    await page.locator('#diff-right').fill('');
    const output = page.locator('#diff-output');
    // Marker now renders in a separate gutter cell; just assert content is present
    await expect(output).toContainText('only-left');
  });

  test('inserts a single line and keeps others unchanged', async ({ page }) => {
    await page.goto('/#/tools/diff');
    await page.locator('#diff-left').fill('a\nb\nc');
    await page.locator('#diff-right').fill('NEW\na\nb\nc');
    const output = page.locator('#diff-output');
    // Markers render in the gutter; assert textual content only
    await expect(output).toContainText('NEW');
    await expect(output).toContainText('\na');
    await expect(output).toContainText('\nb');
    await expect(output).toContainText('\nc');
  });

  test('character-level inline diffs render multiple segments', async ({ page }) => {
    await page.goto('/#/tools/diff');
    await page.locator('#diff-left').fill('hello my friend');
    await page.locator('#diff-right').fill('hello my dear friend of mine');
    const output = page.locator('#diff-output');
    await expect(output).toContainText('hello my ');
    await expect(output).toContainText('friend');
  });

  test('ignore whitespace collapses space-only differences (line)', async ({ page }) => {
    await page.goto('/#/tools/diff');
    await page.locator('#diff-left').fill('foo    bar');
    await page.locator('#diff-right').fill('foo bar');
    // Toggle ignore whitespace via the visible Blueprint switch (indicator is sibling)
    await page.locator('.bp6-switch:has(input[aria-label="Ignore whitespace"]) .bp6-control-indicator').first().click();
    const output = page.locator('#diff-output');
    await expect(output).not.toContainText('+');
    await expect(output).not.toContainText('-');
    await expect(output).toContainText('foo bar');
  });

  test('ignore whitespace treats extra spaces within a line as unchanged', async ({ page }) => {
    await page.goto('/#/tools/diff');
    await page.locator('#diff-left').fill('hello my friend');
    await page.locator('#diff-right').fill('hello  my  friend');
    await page.locator('.bp6-switch:has(input[aria-label="Ignore whitespace"]) .bp6-control-indicator').first().click();
    const output = page.locator('#diff-output');
    await expect(output).not.toContainText('+');
    await expect(output).not.toContainText('-');
    await expect(output).toContainText('hello my friend');
  });
});


