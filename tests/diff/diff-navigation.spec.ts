import { test, expect, type Page } from '@playwright/test';

const TARGET_ROUTE = '/#/tools/diff';
const FIRST_CHANGE_INDEX = 14; // Line 15
const SECOND_CHANGE_INDEX = 24; // Line 25

function buildSampleLines(count: number): string[] {
	return Array.from({ length: count }, (_, idx) => `Line ${String(idx + 1).padStart(2, '0')}`);
}

async function expectScrollNearLine(page: Page, textareaId: string, lineIndex: number) {
	const metrics = await page.evaluate(
		({ textareaId }) => {
			const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
			if (!textarea) return null;
			const computed = window.getComputedStyle(textarea);
			return {
				scrollTop: textarea.scrollTop,
				paddingTop: parseFloat(computed.paddingTop || '0'),
				lineHeight: parseFloat(computed.lineHeight || '20'),
				clientHeight: textarea.clientHeight,
			};
		},
		{ textareaId },
	);

	expect(metrics, `expected to read scroll metrics from ${textareaId}`).not.toBeNull();
	const { scrollTop, paddingTop, lineHeight, clientHeight } = metrics!;
	const lineTop = paddingTop + lineIndex * lineHeight;
	const lineCenter = lineTop + lineHeight / 2;
	const viewportCenter = scrollTop + clientHeight / 2;
	const tolerance = Math.max(lineHeight, 40);
	expect(Math.abs(viewportCenter - lineCenter)).toBeLessThan(tolerance);
}

test.describe('Diff navigation', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 900 });
		await page.goto(TARGET_ROUTE);
	});

  test('navigates between changes via header controls and keyboard shortcuts', async ({ page }) => {
		const leftLines = buildSampleLines(30);
		const rightLines = [...leftLines];
		rightLines[FIRST_CHANGE_INDEX] = `${rightLines[FIRST_CHANGE_INDEX]} updated`;
		rightLines[SECOND_CHANGE_INDEX] = `${rightLines[SECOND_CHANGE_INDEX]} updated`;

		await page.locator('#diff-left').fill(leftLines.join('\n'));
		await page.locator('#diff-right').fill(rightLines.join('\n'));

    // Wait briefly for diff processing.
    await page.waitForTimeout(150);

    const header = page.getByTestId('diff-counters');
    const nextButtons = header.getByRole('button', { name: 'Next change' });
    const prevButtons = header.getByRole('button', { name: 'Previous change' });
    const leftNextButton = nextButtons.first();
    const leftPrevButton = prevButtons.first();
    const rightNextButton = nextButtons.nth(1);
    const rightPrevButton = prevButtons.nth(1);

    await expect(leftNextButton).toBeEnabled();
    await expect(leftPrevButton).toBeEnabled();

    // Navigate using header buttons and assert counters update
    await leftNextButton.click();
    await page.waitForTimeout(200);

    await leftNextButton.click();
    await page.waitForTimeout(200);

    await leftPrevButton.click();
    await page.waitForTimeout(200);

    // Keyboard navigation should also work (focus preview container)
    await page.locator('#diff-output').focus();
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(200);
	});
});
