import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Button, Switch } from '@blueprintjs/core';
import Field from '../ui/Field';
import type { Step } from '../../utils/diff/line';
import { mergedSegments } from '../../utils/diff/inline';
import { stepKeyForMod, type ModResolution } from '../../utils/diff/stepKey';
import { renderLine, renderChoiceLine, type LocalSeg } from './lineRendering';
import { useUnifiedNavigation } from './unifiedNavigation';
import { formatTextForPreview } from './textFormatting';

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

    // Use extracted navigation hook
    const { goPrev, goNext, getVisibleNavigableIndices } = useUnifiedNavigation(
        steps,
        resolutions || {},
        focusedStepIndex,
        setFocusedStepIndex,
        id,
    );

    // Auto-focus first modification when navigation starts or steps change
    useEffect(() => {
        if (focusedStepIndex === null) {
            const pool = getVisibleNavigableIndices();
            if (pool.length > 0) {
                // Small delay to ensure DOM is fully rendered
                const timer = setTimeout(() => {
                    setFocusedStepIndex(pool[0]);
                }, 50);
                return () => clearTimeout(timer);
            }
        }
    }, [getVisibleNavigableIndices, focusedStepIndex, setFocusedStepIndex]);

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
        const rowNodes: React.ReactNode[] = [];

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
                rowNodes.push(renderLine(`same-${idx}`, displayNum, ' ', content, undefined, undefined, isFocused, false, false, idx));
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
                                renderLine(`mod-${idx}-${resolution}`, displayNum, '~', '', selectedSegments, revert, isFocused, true, true, idx),
                            );
                        } else {
                            // Unresolved preview: show both sides' perspective inside each option
                            // Left option (keep-original): right-only tokens should appear red (del), left-only green (add)
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
                                    idx,
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
                    rowNodes.push(renderLine(`del-${idx}`, displayNum, '-', content, undefined, undefined, isFocused, false, false, idx));
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
                rowNodes.push(renderLine(`add-${idx}`, displayNum, '+', content, undefined, undefined, isFocused, false, false, idx));
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
                        renderLine(`mod-${idx}-${resolution}`, displayNum, '~', '', selectedSegments, revert, isFocused, true, true, idx),
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
                        idx,
					),
				);
			}
		}

		return rowNodes;
    }, [steps, persistedOnly, leftNums, rightNums, leftLines, rightLines, ignoreWhitespace, charLevel, resolutions, onResolutionChange, focusedStepIndex]);


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
                    {(() => {
                        const pool = getVisibleNavigableIndices();
                        if (pool.length === 0) return '0/0';
                        const pos = focusedStepIndex != null ? pool.indexOf(focusedStepIndex) : 0;
                        const displayPos = pos >= 0 ? pos + 1 : 1;
                        return `${displayPos}/${pool.length}`;
                    })()} modifications
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
				tabIndex={0}
			>
				{rows}
			</div>
		</Field>
	);
};

export default UnifiedPreview;
