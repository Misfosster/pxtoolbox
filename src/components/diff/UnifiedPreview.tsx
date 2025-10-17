import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Button, Switch } from '@blueprintjs/core';
import Field from '../ui/Field';
import type { Step } from '../../utils/diff/line';
import { mergedSegments, type DiffSeg } from '../../utils/diff/inline';
import { stepKeyForMod, type ModResolution } from '../../utils/diff/stepKey';

export interface UnifiedPreviewProps {
	id?: string;
	height: number;
	steps: Step[];
	leftText: string;
	rightText: string;
	leftLines: string[];
	rightLines: string[];
	leftNums: number[];
	rightNums: number[];
	ignoreWhitespace: boolean;
	charLevel: boolean;
	persistedOnly: boolean;
	resolutions?: Record<string, ModResolution>;
	onResolutionChange?: (key: string, value: ModResolution | null) => void;
	onPersistedOnlyChange: (value: boolean) => void;
	onIgnoreWhitespaceChange?: (value: boolean) => void;
}

const MUTED_COLOR = 'var(--diff-fg-muted, rgba(191, 204, 214, 0.85))';

interface FormatMarker {
	index: number;
	label: string;
	title: string;
}

const CONTROL_CHAR_MARKERS: Record<string, FormatMarker> = {
	'\u200b': { index: 0, label: 'ZWSP', title: 'Zero-width space (U+200B)' },
	'\u200c': { index: 0, label: 'ZWNJ', title: 'Zero-width non-joiner (U+200C)' },
	'\u200d': { index: 0, label: 'ZWJ', title: 'Zero-width joiner (U+200D)' },
	'\ufeff': { index: 0, label: 'BOM', title: 'Byte Order Mark (U+FEFF)' },
};

function extractControlMarkers(text: string): { cleaned: string; markers: FormatMarker[] } {
	if (!text) return { cleaned: text, markers: [] };
	const markers: FormatMarker[] = [];
	let cleaned = '';
	let visibleIndex = 0;
	for (const char of text) {
		const marker = CONTROL_CHAR_MARKERS[char];
		if (marker) {
			markers.push({ ...marker, index: visibleIndex });
			continue;
		}
		cleaned += char;
		visibleIndex += 1;
	}
	return { cleaned, markers };
}

function normalizeSpaces(input: string): string {
    if (!input) return input;
    // Normalize NBSPs and collapse spaces and tabs
    const nbspNormalized = input.replace(/\u00A0/g, ' ');
    const collapsed = nbspNormalized.replace(/[ \t]+/g, ' ');
    // Remove trailing spaces
    let end = collapsed.length;
    while (end > 0 && collapsed[end - 1] === ' ') end--;
    return collapsed.slice(0, end);
}

function injectMarkersIntoText(text: string, markers: FormatMarker[], style?: 'inline'): React.ReactNode {
	if (!markers.length) return text;
	const sorted = markers
		.slice()
		.sort((a, b) => a.index - b.index)
		.map((marker, idx) => ({ ...marker, key: idx }));
	const nodes: React.ReactNode[] = [];
	let cursor = 0;
	for (const marker of sorted) {
		const clampedIndex = Math.min(Math.max(marker.index, 0), text.length);
		if (clampedIndex > cursor) {
			nodes.push(text.slice(cursor, clampedIndex));
		}
		nodes.push(
			<span
				key={`marker-${marker.key}-${marker.index}`}
				title={marker.title}
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					padding: style === 'inline' ? '0 2px' : '0 4px',
					margin: style === 'inline' ? '0 1px' : '0 2px',
					borderRadius: 3,
					border: '1px solid rgba(191,204,214,0.25)',
					background: 'rgba(191,204,214,0.12)',
					color: 'rgba(191,204,214,0.78)',
					fontSize: '0.65em',
					fontWeight: 500,
					lineHeight: '1.4',
					letterSpacing: 0.4,
					userSelect: 'none',
				  
					// critical for proper wrapping inside flex
					minWidth: 0,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
					overflowWrap: 'anywhere',
				  }}
				  
								
			>
				{marker.label}
			</span>,
		);
		cursor = clampedIndex;
	}
	if (cursor < text.length) {
		nodes.push(text.slice(cursor));
	}
	return nodes;
}

interface FormattedText {
	normalized: string;
	display: React.ReactNode;
	whitespaceOnly: boolean;
	markers: FormatMarker[];
}

function formatTextForPreview(text: string, format: boolean): FormattedText {
	const { cleaned, markers: initialMarkers } = extractControlMarkers(text);
	if (!format) {
		return {
			normalized: cleaned,
			display: cleaned,
			whitespaceOnly: cleaned.trim().length === 0,
			markers: initialMarkers,
		};
}

    const markers = [...initialMarkers];
    const normalized = normalizeSpaces(cleaned);
    const display = injectMarkersIntoText(normalized, markers);
	return {
		normalized,
		display,
		whitespaceOnly: normalized.trim().length === 0,
		markers,
	};
}

const UnifiedPreview: React.FC<UnifiedPreviewProps> = ({
	id = 'diff-output',
	height,
	steps,
	leftText,
	rightText,
	leftLines,
	rightLines,
	leftNums,
	rightNums,
	ignoreWhitespace,
	charLevel,
	persistedOnly,
	resolutions,
	onResolutionChange,
	onPersistedOnlyChange,
	onIgnoreWhitespaceChange,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [focusedStepIndex, setFocusedStepIndex] = useState<number | null>(null);
    const condenseNumbers = Boolean(ignoreWhitespace);

    const previewModel = useMemo(() => {
		const leftIsEmpty = leftText.trim() === '';
		const rightIsEmpty = rightText.trim() === '';

		if (leftIsEmpty && rightIsEmpty) {
            return { steps: [] as Step[], leftNums: [] as number[], rightNums: [] as number[] };
		}
		if (leftIsEmpty && !rightIsEmpty) {
			const addSteps: Step[] = rightLines.map((_, j) => ({ type: 'add', j }));
            const baseLeftNums = addSteps.map(() => 0);
            const baseRightNums = rightLines.map((_, j) => j + 1);
            if (!condenseNumbers) return { steps: addSteps, leftNums: baseLeftNums, rightNums: baseRightNums };
            let r = 0; const seqR = addSteps.map(() => (++r));
            return { steps: addSteps, leftNums: baseLeftNums, rightNums: seqR };
		}
		if (!leftIsEmpty && rightIsEmpty) {
			const delSteps: Step[] = leftLines.map((_, i) => ({ type: 'del', i }));
            const baseLeftNums = leftLines.map((_, i) => i + 1);
            const baseRightNums = delSteps.map(() => 0);
            if (!condenseNumbers) return { steps: delSteps, leftNums: baseLeftNums, rightNums: baseRightNums };
            let l = 0; const seqL = delSteps.map(() => (++l));
            return { steps: delSteps, leftNums: seqL, rightNums: baseRightNums };
		}
        // For mixed content, optionally condense numbering while preserving step order
        if (!condenseNumbers) return { steps, leftNums, rightNums };
        let l = 0, r = 0;
        const seqL: number[] = new Array(steps.length).fill(0);
        const seqR: number[] = new Array(steps.length).fill(0);
        for (let idx = 0; idx < steps.length; idx++) {
            const st = steps[idx];
            if (st.type === 'same') { l++; r++; seqL[idx] = l; seqR[idx] = r; }
            else if (st.type === 'del') { l++; seqL[idx] = l; seqR[idx] = 0; }
            else if (st.type === 'add') { r++; seqL[idx] = 0; seqR[idx] = r; }
            else { l++; r++; seqL[idx] = l; seqR[idx] = r; }
        }
        return { steps, leftNums: seqL, rightNums: seqR };
    }, [leftText, rightText, leftLines, rightLines, steps, leftNums, rightNums, condenseNumbers]);

	const { steps: displaySteps, leftNums: displayLeftNums, rightNums: displayRightNums } = previewModel;

	const counts = useMemo(() => {
		let add = 0;
		let del = 0;
		let mod = 0;
		for (const step of displaySteps) {
			if (step.type === 'add') add++;
			else if (step.type === 'del') del++;
			else if (step.type === 'mod') mod++;
		}
		return { add, del, mod };
	}, [displaySteps]);

    const rows = useMemo(() => {
		let lastRenderedWhitespace = false;
		type LocalSeg = DiffSeg & { diffType?: 'add' | 'del'; nodes?: React.ReactNode };
        const rowNodes: React.ReactNode[] = [];

        const renderLine = (
            key: string,
            displayNum: number,
            marker: '+' | '-' | ' ' | '~',
            content: React.ReactNode,
            segments?: LocalSeg[],
            onClick?: () => void,
            isFocused?: boolean,
            isPersisted?: boolean,
            isResolved?: boolean,
        ) => {
			const isAdd = marker === '+';
			const isDel = marker === '-';
			const isMod = marker === '~';
			const cls = isAdd ? 'diff-line add' : isDel ? 'diff-line del' : isMod ? 'diff-line mod' : 'diff-line';
            const bg = isPersisted
                ? 'var(--diff-resolved-bg, rgba(75,139,190,0.22))'
                : isAdd
				? 'var(--diff-add-bg)'
				: isDel
				? 'var(--diff-del-bg)'
				: isMod
				? 'var(--diff-mod-bg)'
				: 'transparent';
            const displayLabel = displayNum === 0 ? '' : displayNum;
            const markerLabel = isResolved ? '~' : (marker !== ' ' ? marker : '');

			return (
				<div
					key={key}
                    data-preview-line
                    data-resolved={isResolved ? 'true' : undefined}
					data-marker={marker}
					data-display-index={displayNum}
                    data-step-index={key}
					className={cls}
					onClick={onClick}
					onKeyDown={
						onClick
							? (event) => {
									if (event.key === 'Enter' || event.key === ' ') {
										event.preventDefault();
										onClick();
									}
							  }
							: undefined
					}
					role={onClick ? 'button' : undefined}
					tabIndex={onClick ? 0 : undefined}
					style={{
						padding: '0 6px 0 0',
						color: MUTED_COLOR,
						background: bg,
                        // subtle focus ring for keyboard/arrow navigation
                        border: isFocused && !isResolved ? '1px solid rgba(161,132,255,0.35)' : (isResolved ? '1px solid rgba(161,132,255,0.55)' : undefined),
                        boxShadow: isFocused && !isResolved ? '0 0 0 1px rgba(161,132,255,0.18)' : (isResolved ? '0 0 0 1px rgba(161,132,255,0.28)' : undefined),
						cursor: onClick ? 'pointer' : 'default',
						outline: 'none',
					}}
				>
					<span
						style={{
							display: 'flex',
							justifyContent: 'flex-start',
							alignItems: 'baseline',
							gap: 6,
							color: 'rgba(138,155,168,0.7)',
							userSelect: 'none',
							minWidth: 0,
						}}
					>
                        <span style={{ width: 14, textAlign: 'center' }}>{markerLabel}</span>
						<span>{displayLabel}</span>
					</span>
					<span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0 }}>
						{segments
							? segments.map((seg, idx) => (
									<span
										// eslint-disable-next-line react/no-array-index-key
										key={idx}
										className={
											seg.changed ? (seg.diffType === 'add' ? 'diff-seg diff-add' : 'diff-seg diff-del') : undefined
										}
										data-diff-token
										data-type={seg.changed ? (seg.diffType === 'add' ? 'add' : 'del') : 'eq'}
									>
										{seg.nodes ?? seg.text ?? ' '}
									</span>
							  ))
							: content || ' '}
					</span>
				</div>
			);
		};

        const renderChoiceLine = (
			key: string,
			displayNum: number,
			leftSegments: LocalSeg[],
			rightSegments: LocalSeg[],
			resolution?: ModResolution,
			onKeepLeft?: () => void,
            onKeepRight?: () => void,
            isFocused?: boolean,
		) => {
            const classifyChange = (segments: LocalSeg[]): 'add' | 'del' | 'both' | 'none' => {
				let hasAdd = false;
				let hasDel = false;
				for (const seg of segments) {
					if (!seg.changed) continue;
					if (seg.diffType === 'add') hasAdd = true;
					if (seg.diffType === 'del') hasDel = true;
				}
                if (hasAdd && !hasDel) return 'add';
                if (hasDel && !hasAdd) return 'del';
                if (hasAdd && hasDel) return 'both';
				return 'none';
			};

			const renderOption = (
				segments: LocalSeg[],
				isSelected: boolean,
				onSelect?: () => void,
			) => {
				const change = classifyChange(segments);
                const changeBorder =
                    change === 'add'
                        ? 'rgba(46,160,67,0.4)'
                        : change === 'del'
                        ? 'rgba(248,81,73,0.42)'
                        : 'rgba(100,148,237,0.3)';
                const changeBackground =
                    change === 'add'
                        ? 'rgba(46,160,67,0.12)'
                        : change === 'del'
                        ? 'rgba(248,81,73,0.12)'
                        : 'var(--diff-mod-bg)';
				const selectedBorder = 'rgba(161,132,255,0.55)';
				const selectedGlow = 'rgba(161,132,255,0.28)';
				const selectedBackground = 'rgba(116,86,190,0.22)';
				const cursor = onSelect ? 'pointer' : 'default';

				return (
					<button
						type="button"
						onClick={onSelect}
						onKeyDown={(event) => {
							if (!onSelect) return;
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								onSelect();
							}
						}}
						aria-pressed={isSelected}
						disabled={!onSelect}
						style={{
							flex: 1,
							minWidth: 0,
							display: 'flex',
							alignItems: 'center',
							padding: '2px 6px',
							borderRadius: 4,
							border: `1px solid ${isSelected ? selectedBorder : changeBorder}`,
							background: isSelected ? selectedBackground : changeBackground,
							color: MUTED_COLOR,
							cursor,
							transition: 'border 120ms ease, background 120ms ease, box-shadow 120ms ease',
							boxShadow: isSelected ? `0 0 0 1px ${selectedGlow}` : undefined,
							opacity: onSelect ? 1 : 0.85,
							outline: 'none',
							lineHeight: 1.4,
						}}
					>
						<span
						style={{
							alignItems: 'center',
							gap: 4,
							width: '100%',
							whiteSpace: 'pre-wrap',
							wordBreak: 'break-word',
							overflowWrap: 'anywhere',
							minWidth: 0,
						}}
						data-change={change}
					>
							{segments.length > 0
								? segments.map((seg, idx) => (
										<span
											// eslint-disable-next-line react/no-array-index-key
											key={idx}
											className={
												seg.changed
													? seg.diffType === 'add'
														? 'diff-seg diff-add'
														: 'diff-seg diff-del'
													: undefined
											}
											data-diff-token
											data-type={seg.changed ? (seg.diffType === 'add' ? 'add' : 'del') : 'eq'}
										>
											{seg.text || ' '}
										</span>
								  ))
								: '∅'}
						</span>
					</button>
				);
			};

            return (
				<div
					key={key}
					data-preview-line
                    data-marker="?"
					data-display-index={displayNum}
					className="diff-line mod"
                    style={{
                        padding: '0 6px 0 0',
                        color: MUTED_COLOR,
                        background: 'var(--diff-mod-bg)',
                        border: isFocused ? '1px solid rgba(161,132,255,0.35)' : undefined,
                        boxShadow: isFocused ? '0 0 0 1px rgba(161,132,255,0.18)' : undefined,
                    }}
				>
					<span
						style={{
							display: 'flex',
							justifyContent: 'flex-start',
							alignItems: 'baseline',
							gap: 6,
							color: 'rgba(138,155,168,0.7)',
							userSelect: 'none',
						}}
					>
                        <span style={{ width: 14, textAlign: 'center' }}>?</span>
						<span>{displayNum}</span>
					</span>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr))',
							gap: 8,
							minWidth: 0,
						}}
					>
						{renderOption(leftSegments, resolution === 'keep-original', onKeepLeft)}
						{renderOption(rightSegments, resolution === 'keep-altered', onKeepRight)}
					</div>
				</div>
			);
		};

        for (let idx = 0; idx < displaySteps.length; idx++) {
            const step = displaySteps[idx];
            const next = displaySteps[idx + 1];
            const isMergedPair = step.type === 'del' && next && next.type === 'add';

            // Persisted-only should include: unchanged, adds, and ALL mods (resolved or unresolved),
            // plus preview-merged del+add pairs. Only pure deletions are hidden.
            const isPersistedCandidate = step.type === 'same' || step.type === 'add' || step.type === 'mod' || isMergedPair;
            if (persistedOnly && !isPersistedCandidate) continue;

            if (step.type === 'same') {
				const rawNum = displayLeftNums[idx];
				const displayNum = rawNum === undefined ? (step.i ?? 0) + 1 : rawNum;
				const contentRaw = step.i != null ? leftLines[step.i] ?? '' : '';
                const { display: content, whitespaceOnly } = formatTextForPreview(contentRaw, ignoreWhitespace);
                const isWhitespaceRow = ignoreWhitespace && whitespaceOnly;
                if (ignoreWhitespace && isWhitespaceRow && lastRenderedWhitespace) {
					continue;
				}
				lastRenderedWhitespace = isWhitespaceRow;
                const isFocused = focusedStepIndex === idx;
                rowNodes.push(renderLine(`same-${idx}`, displayNum, ' ', content, undefined, undefined, isFocused, false, false));
				continue;
			}

            // Preview-only merge: adjacent del/add rendered as a single mod row
            if (step.type === 'del') {
                const next = displaySteps[idx + 1];
                if (next && next.type === 'add') {
                    const rawNum = displayLeftNums[idx];
                    const displayNum = rawNum === undefined ? (step.i ?? 0) + 1 : rawNum;
                    const aRaw = step.i != null ? leftLines[step.i] ?? '' : '';
                    const bRaw = next.j != null ? rightLines[next.j] ?? '' : '';
                    // Precompute formatted variants if needed later

                    // Delegate whitespace handling to mergedSegments/compareKey; use originals
                    const leftDiffSource = aRaw;
                    const rightDiffSource = bRaw;

                    const segs = mergedSegments(leftDiffSource, rightDiffSource, {
                        ignoreWhitespace: !!ignoreWhitespace,
                        mode: charLevel ? 'char' : 'word',
                    }) as LocalSeg[];
                    const hasInlineChanges = segs.some((seg) => seg.changed);
                    const isWhitespaceRow = ignoreWhitespace && !hasInlineChanges;
                    if (!(ignoreWhitespace && isWhitespaceRow && lastRenderedWhitespace)) {
                        lastRenderedWhitespace = isWhitespaceRow;
                        const key = stepKeyForMod(step.i, next.j);
                        const resolution = key && resolutions ? resolutions[key] : undefined;
                        const isFocused = focusedStepIndex === idx;
                        if (resolution && key) {
                            const revert = onResolutionChange ? () => onResolutionChange(key, null) : undefined;
                            // For keep-original, mark changed tokens as additions (green) in the resolved row
                        const selectedSegments: LocalSeg[] =
                                resolution === 'keep-original'
                                    ? segs
                                        .filter((seg) => !seg.changed || seg.diffType === 'del')
                                        .map((seg) => ({ ...seg, diffType: seg.changed ? 'del' : undefined } as LocalSeg))
                                    : segs
                                        .filter((seg) => !seg.changed || seg.diffType === 'add')
                                        .map((seg) => ({ ...seg, diffType: seg.changed ? 'add' : undefined } as LocalSeg));
                            rowNodes.push(
                                renderLine(`mod-${idx}-${resolution}`, displayNum, ' ', '', selectedSegments, revert, isFocused, true, true),
                            );
                        } else {
                            // Unresolved preview: show both sides' perspective inside each option
                            // Left option (keep-original): tokens kept (left-only) should appear green, tokens missing (right-only) red
                            const leftSegments: LocalSeg[] = segs.map((seg) => {
                                if (!seg.changed) return seg as LocalSeg;
                                const flipped = seg.diffType === 'add' ? 'del' : 'add';
                                return { ...seg, diffType: flipped } as LocalSeg;
                            });
                            // Right option (keep-altered): use natural mapping (right-only green, left-only red)
                            const rightSegments: LocalSeg[] = segs.map((seg) => seg as LocalSeg);
                            rowNodes.push(
                                renderChoiceLine(
                                    `mod-merged-${idx}`,
                                    displayNum,
                                    leftSegments,
                                    rightSegments,
                                    resolution,
                                    key && onResolutionChange ? () => onResolutionChange(key!, 'keep-original') : undefined,
                                    key && onResolutionChange ? () => onResolutionChange(key!, 'keep-altered') : undefined,
                                    isFocused,
                                ),
                            );
                        }
                        idx++; // consume the following add
                        continue;
                    }
                }
				const rawNum = displayLeftNums[idx];
				const displayNum = rawNum === undefined ? (step.i ?? 0) + 1 : rawNum;
				const contentRaw = step.i != null ? leftLines[step.i] ?? '' : '';
                const { display: content, whitespaceOnly } = formatTextForPreview(contentRaw, ignoreWhitespace);
                const isWhitespaceRow = ignoreWhitespace && whitespaceOnly;
                if (ignoreWhitespace && isWhitespaceRow && lastRenderedWhitespace) {
					continue;
				}
				lastRenderedWhitespace = isWhitespaceRow;
                const isFocused = focusedStepIndex === idx;
                if (!persistedOnly) {
                    rowNodes.push(renderLine(`del-${idx}`, displayNum, '-', content, undefined, undefined, isFocused, false, false));
                }
				continue;
			}

			if (step.type === 'add') {
				const rawNum = displayRightNums[idx];
				const displayNum = rawNum === undefined ? (step.j ?? 0) + 1 : rawNum;
				const contentRaw = step.j != null ? rightLines[step.j] ?? '' : '';
                const { display: content, whitespaceOnly } = formatTextForPreview(contentRaw, ignoreWhitespace);
                const isWhitespaceRow = ignoreWhitespace && whitespaceOnly;
                if (ignoreWhitespace && isWhitespaceRow && lastRenderedWhitespace) {
					continue;
				}
				lastRenderedWhitespace = isWhitespaceRow;
                const isFocused = focusedStepIndex === idx;
                rowNodes.push(renderLine(`add-${idx}`, displayNum, '+', content, undefined, undefined, isFocused, false, false));
				continue;
			}

			if (step.type === 'mod') {
				const rawNum = displayLeftNums[idx];
				const displayNum = rawNum === undefined ? (step.i ?? 0) + 1 : rawNum;
				const aRaw = step.i != null ? leftLines[step.i] ?? '' : '';
				const bRaw = step.j != null ? rightLines[step.j] ?? '' : '';
                const leftFormatted = formatTextForPreview(aRaw, ignoreWhitespace);
                const rightFormatted = formatTextForPreview(bRaw, ignoreWhitespace);

                // Delegate whitespace handling to mergedSegments/compareKey; use originals
                const leftDiffSource = aRaw;
                const rightDiffSource = bRaw;

                const segs = mergedSegments(leftDiffSource, rightDiffSource, {
                    ignoreWhitespace: !!ignoreWhitespace,
                    mode: charLevel ? 'char' : 'word',
                }) as LocalSeg[];

                const hasInlineChanges = segs.some((seg) => seg.changed);
                const isWhitespaceRow = ignoreWhitespace && !hasInlineChanges;
                if (ignoreWhitespace && isWhitespaceRow && lastRenderedWhitespace) {
					continue;
				}
				lastRenderedWhitespace = isWhitespaceRow;

				const key = stepKeyForMod(step.i, step.j);
				const resolution = key && resolutions ? resolutions[key] : undefined;

                let leftSegments: LocalSeg[] = segs.map((seg) => {
                    if (!seg.changed) return seg as LocalSeg;
                    // Left perspective: right-only tokens should appear red (del), left-only green (add)
                    const flipped = seg.diffType === 'add' ? 'del' : 'add';
                    return { ...seg, diffType: flipped } as LocalSeg;
                });
                if (leftSegments.length === 0) {
                    leftSegments = [{ text: leftFormatted.display as unknown as string, changed: false } as LocalSeg];
                }
                let rightSegments: LocalSeg[] = segs.map((seg) => seg as LocalSeg);
                if (rightSegments.length === 0) {
                    rightSegments = [{ text: rightFormatted.display as unknown as string, changed: false } as LocalSeg];
                }

                if (resolution && key) {
                    const revert = onResolutionChange ? () => onResolutionChange(key, null) : undefined;
                    const isFocused = focusedStepIndex === idx;
                    // Recompute segments for display with whitespace preserved (do not collapse spaces)
                    const segsDisplay = mergedSegments(aRaw, bRaw, {
                        ignoreWhitespace: false,
                        mode: charLevel ? 'char' : 'word',
                    }) as LocalSeg[];
                    // In resolved view, only highlight KEPT tokens in green, do not show removed tokens
                    const leftDisplay: LocalSeg[] = segsDisplay
                        .filter((seg) => !seg.changed || seg.diffType === 'del')
                        .map((seg) => (seg.changed ? ({ ...seg, diffType: 'add' } as LocalSeg) : (seg as LocalSeg)));
                    const rightDisplay: LocalSeg[] = segsDisplay
                        .filter((seg) => !seg.changed || seg.diffType === 'add')
                        .map((seg) => seg as LocalSeg);
                    const selectedSegments = resolution === 'keep-original' ? leftDisplay : rightDisplay;
                    rowNodes.push(
                        renderLine(`mod-${idx}-${resolution}`, displayNum, ' ', '', selectedSegments, revert, isFocused, true, true),
                    );
                    continue;
                }

				const selectOriginal =
					key && onResolutionChange
						? () => onResolutionChange(key, 'keep-original')
						: undefined;
				const selectAltered =
					key && onResolutionChange
						? () => onResolutionChange(key, 'keep-altered')
						: undefined;
                const isFocused = focusedStepIndex === idx;
                rowNodes.push(
					renderChoiceLine(
						`mod-${idx}`,
						displayNum,
						leftSegments,
						rightSegments,
						resolution,
						selectOriginal,
                        selectAltered,
                        isFocused,
					),
				);
			}
		}

		return rowNodes;
    }, [steps, persistedOnly, leftNums, rightNums, leftLines, rightLines, ignoreWhitespace, charLevel, resolutions, onResolutionChange, focusedStepIndex]);

    const changeStepIndices = useMemo(() => {
        const indices: number[] = [];
        for (let idx = 0; idx < displaySteps.length; idx++) {
            const st = displaySteps[idx];
            if (st.type !== 'same') indices.push(idx);
        }
        return indices;
    }, [displaySteps]);

    const unresolvedStepIndices = useMemo(() => {
        const indices: number[] = [];
        for (let idx = 0; idx < displaySteps.length; idx++) {
            const st = displaySteps[idx];
            if (st.type !== 'mod') continue;
            const key = stepKeyForMod(st.i, st.j);
            const res = key && resolutions ? resolutions[key] : undefined;
            if (!res) indices.push(idx);
        }
        return indices;
    }, [displaySteps, resolutions]);

    const scrollToFocused = useCallback((idx: number | null) => {
        if (idx == null) return;
        const container = containerRef.current;
        if (!container) return;
        const el = container.querySelector(`[data-step-index=\"${idx}\"]`) as HTMLElement | null;
        if (!el) return;
        const top = el.offsetTop;
        const padding = 24;
        container.scrollTo({ top: Math.max(0, top - padding), behavior: 'smooth' });
    }, []);

    useEffect(() => {
        if (focusedStepIndex != null) {
            scrollToFocused(focusedStepIndex);
        }
    }, [focusedStepIndex, scrollToFocused]);

    const goPrev = useCallback(() => {
        const pool = unresolvedStepIndices.length ? unresolvedStepIndices : changeStepIndices;
        if (pool.length === 0) return;
        const curPos = focusedStepIndex == null ? pool.length : pool.indexOf(focusedStepIndex);
        const nextIdx = curPos <= 0 ? pool[pool.length - 1] : pool[curPos - 1];
        setFocusedStepIndex(nextIdx);
    }, [changeStepIndices, unresolvedStepIndices, focusedStepIndex]);

    const goNext = useCallback(() => {
        const pool = unresolvedStepIndices.length ? unresolvedStepIndices : changeStepIndices;
        if (pool.length === 0) return;
        const curPos = focusedStepIndex == null ? -1 : pool.indexOf(focusedStepIndex);
        const nextIdx = curPos >= pool.length - 1 ? pool[0] : pool[curPos + 1];
        setFocusedStepIndex(nextIdx);
    }, [changeStepIndices, unresolvedStepIndices, focusedStepIndex]);

	return (
		<Field label="Unified diff (preview)" inputId={id}>
            <div
				data-testid="diff-counters"
				style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8, color: 'rgba(138,155,168,0.9)' }}
			>
				<span data-testid="count-add" style={{ color: 'rgba(46,160,67,0.9)' }}>+{counts.add}</span>
				<span data-testid="count-del" style={{ color: 'rgba(248,81,73,0.9)' }}>-{counts.del}</span>
				<span data-testid="count-mod" style={{ color: 'rgba(100,148,237,0.9)' }}>~{counts.mod}</span>
                <span style={{ color: 'rgba(191, 204, 214, 0.85)' }}>
                    {unresolvedStepIndices.length > 0 ? `${Math.max(0, (unresolvedStepIndices.indexOf(focusedStepIndex ?? -1) + 1))}/${unresolvedStepIndices.length}` : `0/0`} unresolved
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Button large outlined icon="arrow-up" aria-label="Previous change" onClick={goPrev} style={{ minWidth: 44, height: 36 }} />
                    <Button large outlined icon="arrow-down" aria-label="Next change" onClick={goNext} style={{ minWidth: 44, height: 36 }} />
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                    <span style={{ color: 'rgba(191, 204, 214, 0.85)', userSelect: 'none', lineHeight: '20px' }}>
                        Ignore whitespace
                    </span>
                    <Switch
                        checked={ignoreWhitespace}
                        onChange={(event) => onIgnoreWhitespaceChange?.((event.currentTarget as HTMLInputElement).checked)}
                        aria-label="Ignore whitespace"
                        label={undefined}
                        style={{ margin: 0 }}
                    />
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'rgba(191, 204, 214, 0.85)', userSelect: 'none', lineHeight: '20px' }}>
                        Persisted-only preview
                    </span>
                    <Switch
                        checked={persistedOnly}
                        onChange={(event) => onPersistedOnlyChange((event.currentTarget as HTMLInputElement).checked)}
                        aria-label="Persisted-only preview"
                        label={undefined}
                        style={{ margin: 0 }}
                        data-testid="toggle-persisted-only-preview"
                    />
                </span>
			</div>
			<div
				id={id}
                ref={containerRef}
				style={{
					width: '100%',
					height,
					overflowY: 'auto',
					overflowX: 'hidden',
					resize: 'none',
					fontFamily:
						'var(--diff-font, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
					whiteSpace: 'pre-wrap',
					border: '1px solid rgba(138,155,168,0.15)',
					borderRadius: 3,
					background: 'rgba(16,22,26,0.3)',
					padding: 8,
				}}
			>
				{rows}
			</div>
		</Field>
	);
};

export default UnifiedPreview;
