import { useMemo } from 'react';
import type { Step } from '../utils/diff/line';
import { mergedSegments, type DiffSeg } from '../utils/diff/inline';

export type OverlayLineRole = 'none' | 'add' | 'del';

export interface OverlaySegments {
	leftOverlayLines: DiffSeg[][];
	rightOverlayLines: DiffSeg[][];
	leftLineRoles: OverlayLineRole[];
	rightLineRoles: OverlayLineRole[];
}

interface UseOverlaySegmentsParams {
	steps: Step[];
	leftLines: string[];
	rightLines: string[];
	ignoreWhitespace: boolean;
	charLevel: boolean;
}

const WHITESPACE_TOKEN = /^[\s\u200b\u200c\u200d\ufeff]*$/;
const FORMAT_CHARS_RE = /[\u200b\u200c\u200d\ufeff]/g;

function sanitizeSegment(seg: DiffSeg, ignoreWhitespace: boolean): DiffSeg {
	if (!ignoreWhitespace) return seg;
	if (!seg.changed) return seg;
	const text = seg.text ?? '';
	if (WHITESPACE_TOKEN.test(text)) {
		return { text, changed: false };
	}
	return seg;
}

function isWhitespaceOnlyLine(line: string): boolean {
    return WHITESPACE_TOKEN.test(line);
}

export function useOverlaySegments({
	steps,
	leftLines,
	rightLines,
	ignoreWhitespace,
	charLevel,
}: UseOverlaySegmentsParams): OverlaySegments {
	return useMemo(() => {
		const leftArr: DiffSeg[][] = new Array(leftLines.length);
		const rightArr: DiffSeg[][] = new Array(rightLines.length);
		const leftRoles: OverlayLineRole[] = new Array(leftLines.length).fill('none');
		const rightRoles: OverlayLineRole[] = new Array(rightLines.length).fill('none');

		for (const st of steps) {
			if (st.type === 'same') {
				const li = st.i ?? -1;
				const rj = st.j ?? -1;
				if (li >= 0) {
					const lText = leftLines[li] ?? '';
					leftArr[li] = [{ text: lText, changed: false }];
				}
				if (rj >= 0) {
					const rText = rightLines[rj] ?? '';
					rightArr[rj] = [{ text: rText, changed: false }];
				}
				continue;
			}

			if (st.type === 'del') {
				const li = st.i ?? -1;
				if (li >= 0) {
					const lText = leftLines[li] ?? '';
					if (ignoreWhitespace && isWhitespaceOnlyLine(lText)) {
						leftArr[li] = [{ text: lText, changed: false }];
						leftRoles[li] = 'none';
						continue;
					}
					leftArr[li] = [{ text: lText, changed: true, diffType: 'del' }];
				}
				continue;
			}

			if (st.type === 'add') {
				const rj = st.j ?? -1;
				if (rj >= 0) {
					const rText = rightLines[rj] ?? '';
					if (ignoreWhitespace && isWhitespaceOnlyLine(rText)) {
						rightArr[rj] = [{ text: rText, changed: false }];
						rightRoles[rj] = 'none';
						continue;
					}
					rightArr[rj] = [{ text: rText, changed: true, diffType: 'add' }];
				}
				continue;
			}

			if (st.type === 'mod') {
				const li = st.i ?? -1;
				const rj = st.j ?? -1;
                const aRaw = li >= 0 ? leftLines[li] ?? '' : '';
                const bRaw = rj >= 0 ? rightLines[rj] ?? '' : '';

                // When ignoring whitespace, strip zero-width format characters so segmentation
                // aligns with preview normalization and token indices match
                const aSan = ignoreWhitespace ? aRaw.replace(FORMAT_CHARS_RE, '') : aRaw;
                const bSan = ignoreWhitespace ? bRaw.replace(FORMAT_CHARS_RE, '') : bRaw;

                const segs = mergedSegments(aSan, bSan, {
                    ignoreWhitespace: ignoreWhitespace,
					mode: charLevel ? 'char' : 'word',
				});

				if (li >= 0) {
					const leftSegs = segs
						.filter((s) => !s.changed || s.diffType === 'del')
						.map((seg) => sanitizeSegment(seg, ignoreWhitespace));
                    if (leftSegs.length === 0) {
                        leftSegs.push({ text: aRaw, changed: false });
					}
					leftArr[li] = leftSegs;
                    // Debug overlay mismatch checks removed to avoid console noise
				}

				if (rj >= 0) {
					const rightSegs = segs
						.filter((s) => !s.changed || s.diffType === 'add')
						.map((seg) => sanitizeSegment(seg, ignoreWhitespace));
                    if (rightSegs.length === 0) {
                        rightSegs.push({ text: bRaw, changed: false });
					}
					rightArr[rj] = rightSegs;
                    // Debug overlay mismatch checks removed to avoid console noise
				}
			}
		}

		const classifyRole = (segments: DiffSeg[] | undefined): OverlayLineRole => {
			if (!segments || segments.length === 0) return 'none';
			let hasAdd = false;
			let hasDel = false;
			for (const seg of segments) {
				if (!seg || !seg.changed) continue;
				if (seg.diffType === 'add') hasAdd = true;
				if (seg.diffType === 'del') hasDel = true;
			}
			if (hasAdd && !hasDel) return 'add';
			if (hasDel && !hasAdd) return 'del';
			if (hasAdd && hasDel) return 'add';
			return 'none';
		};

		for (let i = 0; i < leftArr.length; i++) {
			if (!leftArr[i]) {
				leftArr[i] = [{ text: leftLines[i] ?? '', changed: false }];
			}
			leftRoles[i] = classifyRole(leftArr[i]);
		}
		for (let j = 0; j < rightArr.length; j++) {
			if (!rightArr[j]) {
				rightArr[j] = [{ text: rightLines[j] ?? '', changed: false }];
			}
			rightRoles[j] = classifyRole(rightArr[j]);
		}

		return {
			leftOverlayLines: leftArr,
			rightOverlayLines: rightArr,
			leftLineRoles: leftRoles,
			rightLineRoles: rightRoles,
		};
	}, [steps, leftLines, rightLines, ignoreWhitespace, charLevel]);
}
