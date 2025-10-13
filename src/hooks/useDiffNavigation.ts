import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import type { Step } from '../utils/diff/line';

type PaneSide = 'left' | 'right';

interface DiffNavigationParams {
	steps: Step[];
	leftLines: string[];
	rightLines: string[];
	leftRef: RefObject<HTMLTextAreaElement | null>;
	rightRef: RefObject<HTMLTextAreaElement | null>;
	scrollOffset?: number;
}

interface PaneNavigation {
	goNextChange: () => boolean;
	goPrevChange: () => boolean;
	hasChanges: boolean;
}

export interface DiffNavigationResult {
	left: PaneNavigation;
	right: PaneNavigation;
	reset: () => void;
}

function computeChangeIndices(steps: Step[], side: PaneSide): number[] {
	const indices: number[] = [];
	for (const step of steps) {
		if (side === 'left') {
			if ((step.type === 'del' || step.type === 'mod') && step.i != null) {
				indices.push(step.i);
			}
		} else {
			if ((step.type === 'add' || step.type === 'mod') && step.j != null) {
				indices.push(step.j);
			}
		}
	}
	return indices;
}

function getLineTop(textarea: HTMLTextAreaElement, lines: string[], targetIndex: number): number {
	if (targetIndex < 0) return 0;
	const computed = window.getComputedStyle(textarea);
	const paddingTop = parseFloat(computed.paddingTop || '0');
	const paddingLeft = parseFloat(computed.paddingLeft || '0');
	const paddingRight = parseFloat(computed.paddingRight || '0');
	const contentWidth = Math.max(0, textarea.clientWidth - paddingLeft - paddingRight);
	const lineHeight = parseFloat(computed.lineHeight || '20');

	const mirror = document.createElement('div');
	mirror.style.position = 'absolute';
	mirror.style.visibility = 'hidden';
	mirror.style.pointerEvents = 'none';
	mirror.style.boxSizing = 'content-box';
	mirror.style.whiteSpace = 'pre-wrap';
	mirror.style.wordBreak = 'normal';
	mirror.style.overflowWrap = 'anywhere';
	mirror.style.padding = '0';
	mirror.style.border = '0';
	mirror.style.width = `${contentWidth}px`;
	mirror.style.font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
	mirror.style.lineHeight = computed.lineHeight || `${lineHeight}px`;
	mirror.style.letterSpacing = computed.letterSpacing || 'normal';
	(mirror.style as any).tabSize = (textarea.style as any).tabSize || '4';
	document.body.appendChild(mirror);

	let top = 0;
	for (let i = 0; i < lines.length && i < targetIndex; i++) {
		mirror.textContent = lines[i] || ' ';
		top += mirror.scrollHeight;
	}
	document.body.removeChild(mirror);
	return top + paddingTop;
}

function focusWithoutScroll(element: HTMLTextAreaElement) {
	try {
		element.focus({ preventScroll: true });
	} catch {
		element.focus();
	}
}

export function useDiffNavigation({
	steps,
	leftLines,
	rightLines,
	leftRef,
	rightRef,
	scrollOffset = 24,
}: DiffNavigationParams): DiffNavigationResult {
	const leftChanges = useMemo(() => computeChangeIndices(steps, 'left'), [steps]);
	const rightChanges = useMemo(() => computeChangeIndices(steps, 'right'), [steps]);

	const leftIndexRef = useRef<number>(-1);
	const rightIndexRef = useRef<number>(-1);

	useEffect(() => {
		leftIndexRef.current = -1;
		rightIndexRef.current = -1;
	}, [steps]);

	const scrollToChange = useCallback(
		(side: PaneSide, direction: 1 | -1) => {
			const isLeft = side === 'left';
			const changes = isLeft ? leftChanges : rightChanges;
			if (!changes.length) return false;
			const ref = isLeft ? leftRef : rightRef;
			const lines = isLeft ? leftLines : rightLines;
			const indexRef = isLeft ? leftIndexRef : rightIndexRef;

			let nextIndex = indexRef.current;
			if (direction === 1) {
				if (indexRef.current < changes.length - 1) {
					nextIndex = indexRef.current + 1;
				} else if (indexRef.current === -1) {
					nextIndex = 0;
				} else {
					return false;
				}
			} else {
				if (indexRef.current > 0) {
					nextIndex = indexRef.current - 1;
				} else if (indexRef.current === -1) {
					nextIndex = changes.length - 1;
				} else if (indexRef.current === 0) {
					return false;
				}
			}

			const textarea = ref.current;
			if (!textarea) return false;

			indexRef.current = nextIndex;
			const lineIndex = changes[nextIndex];
			const top = getLineTop(textarea, lines, lineIndex);
			focusWithoutScroll(textarea);
			const targetTop = Math.max(0, top - scrollOffset);

			requestAnimationFrame(() => {
				textarea.scrollTo({ top: targetTop, behavior: 'smooth' });
			});

			return true;
		},
		[leftChanges, rightChanges, leftRef, rightRef, leftLines, rightLines, scrollOffset],
	);

	const goNextLeft = useCallback(() => scrollToChange('left', 1), [scrollToChange]);
	const goPrevLeft = useCallback(() => scrollToChange('left', -1), [scrollToChange]);
	const goNextRight = useCallback(() => scrollToChange('right', 1), [scrollToChange]);
	const goPrevRight = useCallback(() => scrollToChange('right', -1), [scrollToChange]);

	const reset = useCallback(() => {
		leftIndexRef.current = -1;
		rightIndexRef.current = -1;
	}, []);

	return {
		left: {
			goNextChange: goNextLeft,
			goPrevChange: goPrevLeft,
			hasChanges: leftChanges.length > 0,
		},
		right: {
			goNextChange: goNextRight,
			goPrevChange: goPrevRight,
			hasChanges: rightChanges.length > 0,
		},
		reset,
	};
}
