import { useMemo } from 'react';
import type { Step } from '../utils/diff/line';
import { mergedSegments, type DiffSeg } from '../utils/diff/inline';
import { stepKeyForMod, type ModResolution } from '../utils/diff/stepKey';

export type OverlayLineRole = 'none' | 'add' | 'del' | 'resolved';

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
	resolutions?: Record<string, ModResolution>;
}

const WHITESPACE_TOKEN = /^[\s\u200b\u200c\u200d\ufeff]*$/;

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
	resolutions,
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
					leftRoles[li] = 'del';
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
					rightRoles[rj] = 'add';
				}
				continue;
			}

			if (st.type === 'mod') {
				const li = st.i ?? -1;
				const rj = st.j ?? -1;
				const aRaw = li >= 0 ? leftLines[li] ?? '' : '';
				const bRaw = rj >= 0 ? rightLines[rj] ?? '' : '';
				const key = stepKeyForMod(st.i, st.j);
				const resolution = key && resolutions ? resolutions[key] : undefined;

				if (resolution === 'keep-original') {
					if (li >= 0) {
						leftArr[li] = [{ text: aRaw, changed: false }];
						leftRoles[li] = 'resolved';
					}
					if (rj >= 0) {
						rightArr[rj] = [{ text: bRaw, changed: false }];
						rightRoles[rj] = 'none';
					}
					continue;
				}

				if (resolution === 'keep-altered') {
					if (li >= 0) {
						leftArr[li] = [{ text: aRaw, changed: false }];
						leftRoles[li] = 'none';
					}
					if (rj >= 0) {
						rightArr[rj] = [{ text: bRaw, changed: false }];
						rightRoles[rj] = 'resolved';
					}
					continue;
				}

				const segs = mergedSegments(aRaw, bRaw, {
					ignoreWhitespace: false,
					mode: charLevel ? 'char' : 'word',
				});

				if (li >= 0) {
					const leftSegs = segs
						.filter((s) => !s.changed || s.diffType === 'del')
						.map((seg) => sanitizeSegment(seg, ignoreWhitespace));
					if (leftSegs.length === 0) {
						leftSegs.push({ text: aRaw, changed: false });
					}
					const leftHasChanges = leftSegs.some((seg) => seg.changed && seg.diffType === 'del');
					leftArr[li] = leftSegs;
					leftRoles[li] = leftHasChanges ? 'del' : 'none';
					if (process.env.NODE_ENV !== 'production') {
						const leftOverlayText = leftArr[li].map((s) => s.text).join('');
						if (leftOverlayText !== aRaw) {
							// eslint-disable-next-line no-console
							console.warn(`Left overlay mismatch at line ${li + 1}:`, { expected: aRaw, got: leftOverlayText });
						}
					}
				}

				if (rj >= 0) {
					const rightSegs = segs
						.filter((s) => !s.changed || s.diffType === 'add')
						.map((seg) => sanitizeSegment(seg, ignoreWhitespace));
					if (rightSegs.length === 0) {
						rightSegs.push({ text: bRaw, changed: false });
					}
					const rightHasChanges = rightSegs.some((seg) => seg.changed && seg.diffType === 'add');
					rightArr[rj] = rightSegs;
					rightRoles[rj] = rightHasChanges ? 'add' : 'none';
					if (process.env.NODE_ENV !== 'production') {
						const rightOverlayText = rightArr[rj].map((s) => s.text).join('');
						if (rightOverlayText !== bRaw) {
							// eslint-disable-next-line no-console
							console.warn(`Right overlay mismatch at line ${rj + 1}:`, { expected: bRaw, got: rightOverlayText });
						}
					}
				}
			}
		}

		for (let i = 0; i < leftArr.length; i++) {
			if (!leftArr[i]) {
				leftArr[i] = [{ text: leftLines[i] ?? '', changed: false }];
			}
		}
		for (let j = 0; j < rightArr.length; j++) {
			if (!rightArr[j]) {
				rightArr[j] = [{ text: rightLines[j] ?? '', changed: false }];
			}
		}

		return {
			leftOverlayLines: leftArr,
			rightOverlayLines: rightArr,
			leftLineRoles: leftRoles,
			rightLineRoles: rightRoles,
		};
	}, [steps, leftLines, rightLines, ignoreWhitespace, charLevel, resolutions]);
}
