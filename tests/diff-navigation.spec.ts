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

		// Wait for diff overlays to render (debounce guard).
		await expect(page.getByTestId('overlay-left')).toBeVisible();
		await expect(page.getByTestId('overlay-right')).toBeVisible();

		const leftNextButton = page.getByLabel('Next change (Alt+Down)').first();
		const leftPrevButton = page.getByLabel('Previous change (Alt+Up)').first();
		const rightNextButton = page.getByLabel('Next change (Alt+Down)').nth(1);
		const rightPrevButton = page.getByLabel('Previous change (Alt+Up)').nth(1);

		await expect(leftNextButton).toBeEnabled();
		await expect(leftPrevButton).toBeEnabled();

		await page.focus('#diff-left');

		// First change via Next button (left pane)
		await leftNextButton.click();
		await page.waitForFunction(() => {
			const el = document.getElementById('diff-left') as HTMLTextAreaElement | null;
			return !!el && el.scrollTop > 0;
		});
		await page.waitForTimeout(200);
		await expectScrollNearLine(page, 'diff-left', FIRST_CHANGE_INDEX);
		await expect(page.getByTestId('left-change-counter')).toHaveText('1/2');

		const activeAfterFirst = await page.evaluate(() => document.activeElement && (document.activeElement as HTMLElement).id);
		expect(activeAfterFirst).toBe('diff-left');

		// Second change via Next button (left pane)
		const scrollAfterFirst = await page.locator('#diff-left').evaluate((el) => el.scrollTop);
		await leftNextButton.click();
		await page.waitForFunction(
			(prev) => {
				const el = document.getElementById('diff-left') as HTMLTextAreaElement | null;
				return !!el && el.scrollTop > prev + 1;
			},
			scrollAfterFirst,
		);
		await page.waitForTimeout(200);
		await expectScrollNearLine(page, 'diff-left', SECOND_CHANGE_INDEX);
		await expect(page.getByTestId('left-change-counter')).toHaveText('2/2');

		// Previous change returns to the first modification
		const scrollAfterSecond = await page.locator('#diff-left').evaluate((el) => el.scrollTop);
		await leftPrevButton.click();
		await page.waitForFunction(
			(prev) => {
				const el = document.getElementById('diff-left') as HTMLTextAreaElement | null;
				return !!el && el.scrollTop < prev - 1;
			},
			scrollAfterSecond,
		);
		await page.waitForTimeout(200);
		await expectScrollNearLine(page, 'diff-left', FIRST_CHANGE_INDEX);
		await expect(page.getByTestId('left-change-counter')).toHaveText('1/2');

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
		await expect(page.getByTestId('right-change-counter')).toHaveText('1/2');

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
		await expect(page.getByTestId('right-change-counter')).toHaveText('2/2');

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
		await expect(page.getByTestId('right-change-counter')).toHaveText('1/2');

		// Use pane-specific buttons on the right pane
		await rightNextButton.click();
		await page.waitForTimeout(200);
		await expectScrollNearLine(page, 'diff-right', SECOND_CHANGE_INDEX);
		await expect(page.getByTestId('right-change-counter')).toHaveText('2/2');

		await rightPrevButton.click();
		await page.waitForTimeout(200);
		await expectScrollNearLine(page, 'diff-right', FIRST_CHANGE_INDEX);
		await expect(page.getByTestId('right-change-counter')).toHaveText('1/2');

		const activeAfterKeyboard = await page.evaluate(() => document.activeElement && (document.activeElement as HTMLElement).id);
		expect(activeAfterKeyboard).toBe('diff-right');
	});
});
