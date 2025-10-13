import { test, expect, type Page } from '@playwright/test';

const TARGET_ROUTE = '/#/tools/diff';
const FIRST_CHANGE_INDEX = 14; // Line 15
const SECOND_CHANGE_INDEX = 24; // Line 25
const SCROLL_OFFSET = 24;

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
			};
		},
		{ textareaId },
	);

	expect(metrics, `expected to read scroll metrics from ${textareaId}`).not.toBeNull();
	const { scrollTop, paddingTop, lineHeight } = metrics!;
	const expectedTop = Math.max(0, paddingTop + lineIndex * lineHeight - SCROLL_OFFSET);
	// Allow a small tolerance for smooth scrolling rounding
	expect(Math.abs(scrollTop - expectedTop)).toBeLessThan(Math.max(lineHeight * 2, 40));
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

		// Wait for diff overlays to render (debounce guard).
		await expect(page.getByTestId('overlay-left')).toBeVisible();
		await expect(page.getByTestId('overlay-right')).toBeVisible();

		const nextButton = page.getByTestId('diff-nav-next');
		const prevButton = page.getByTestId('diff-nav-prev');
		await expect(nextButton).toBeEnabled();
		await expect(prevButton).toBeEnabled();

		await page.focus('#diff-left');

		// First change via Next button (left pane)
		await nextButton.click();
		await page.waitForFunction(() => {
			const el = document.getElementById('diff-left') as HTMLTextAreaElement | null;
			return !!el && el.scrollTop > 0;
		});
		await page.waitForTimeout(200);
		await expectScrollNearLine(page, 'diff-left', FIRST_CHANGE_INDEX);

		const activeAfterFirst = await page.evaluate(() => document.activeElement && (document.activeElement as HTMLElement).id);
		expect(activeAfterFirst).toBe('diff-left');

		// Second change via Next button (left pane)
		const scrollAfterFirst = await page.locator('#diff-left').evaluate((el) => el.scrollTop);
		await nextButton.click();
		await page.waitForFunction(
			(prev) => {
				const el = document.getElementById('diff-left') as HTMLTextAreaElement | null;
				return !!el && el.scrollTop > prev + 1;
			},
			scrollAfterFirst,
		);
		await page.waitForTimeout(200);
		await expectScrollNearLine(page, 'diff-left', SECOND_CHANGE_INDEX);

		// Previous change returns to the first modification
		const scrollAfterSecond = await page.locator('#diff-left').evaluate((el) => el.scrollTop);
		await prevButton.click();
		await page.waitForFunction(
			(prev) => {
				const el = document.getElementById('diff-left') as HTMLTextAreaElement | null;
				return !!el && el.scrollTop < prev - 1;
			},
			scrollAfterSecond,
		);
		await page.waitForTimeout(200);
		await expectScrollNearLine(page, 'diff-left', FIRST_CHANGE_INDEX);

		const activeAfterPrev = await page.evaluate(() => document.activeElement && (document.activeElement as HTMLElement).id);
		expect(activeAfterPrev).toBe('diff-left');

		// Keyboard navigation on right pane
		await page.focus('#diff-right');

		await page.keyboard.press('Alt+ArrowDown');
		await page.waitForFunction(() => {
			const el = document.getElementById('diff-right') as HTMLTextAreaElement | null;
			return !!el && el.scrollTop > 0;
		});
		await page.waitForTimeout(200);
		await expectScrollNearLine(page, 'diff-right', FIRST_CHANGE_INDEX);

		await page.keyboard.press('Alt+ArrowDown');
		const scrollRightAfterFirst = await page.locator('#diff-right').evaluate((el) => el.scrollTop);
		await page.waitForFunction(
			(prev) => {
				const el = document.getElementById('diff-right') as HTMLTextAreaElement | null;
				return !!el && el.scrollTop > prev + 1;
			},
			scrollRightAfterFirst,
		);
		await page.waitForTimeout(200);
		await expectScrollNearLine(page, 'diff-right', SECOND_CHANGE_INDEX);

		await page.keyboard.press('Alt+ArrowUp');
		const scrollRightAfterSecond = await page.locator('#diff-right').evaluate((el) => el.scrollTop);
		await page.waitForFunction(
			(prev) => {
				const el = document.getElementById('diff-right') as HTMLTextAreaElement | null;
				return !!el && el.scrollTop < prev - 1;
			},
			scrollRightAfterSecond,
		);
		await page.waitForTimeout(200);
		await expectScrollNearLine(page, 'diff-right', FIRST_CHANGE_INDEX);

		const activeAfterKeyboard = await page.evaluate(() => document.activeElement && (document.activeElement as HTMLElement).id);
		expect(activeAfterKeyboard).toBe('diff-right');
	});
});
