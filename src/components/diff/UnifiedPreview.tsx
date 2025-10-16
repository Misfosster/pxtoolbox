import React, { useMemo } from 'react';
import { Switch } from '@blueprintjs/core';
import Field from '../ui/Field';
import type { Step } from '../../utils/diff/line';
import { mergedSegments, type DiffSeg } from '../../utils/diff/inline';
import { normalizePlaintext } from '../../utils/text/normalize';
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
	formatPreview: boolean;
	charLevel: boolean;
	changedOnly: boolean;
	resolutions?: Record<string, ModResolution>;
	onChangedOnlyChange: (value: boolean) => void;
	onFormatPreviewChange: (value: boolean) => void;
}

const MUTED_COLOR = 'var(--diff-fg-muted, rgba(191, 204, 214, 0.85))';

function formatDisplayValue(text: string): { display: string; whitespaceOnly: boolean } {
	const display = text;
	return { display, whitespaceOnly: display.trim().length === 0 };
}

function preparePreviewText(text: string, normalize: boolean): { display: string; whitespaceOnly: boolean } {
	const source = text ?? '';
	if (!normalize) {
		return formatDisplayValue(source);
	}
	return formatDisplayValue(normalizePlaintext(source));
}

function tryParseJson(text: string): unknown | null {
	if (!text) {
		return null;
	}
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

function formatJsonPair(left: string, right: string): { left: string; right: string } | null {
	const leftParsed = tryParseJson(left);
	if (leftParsed === null) return null;
	const rightParsed = tryParseJson(right);
	if (rightParsed === null) return null;

	return {
		left: JSON.stringify(leftParsed, null, 2),
		right: JSON.stringify(rightParsed, null, 2),
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
	formatPreview,
	charLevel,
	changedOnly,
	resolutions,
	onChangedOnlyChange,
	onFormatPreviewChange,
}) => {
	const previewModel = useMemo(() => {
		const leftIsEmpty = leftText.trim() === '';
		const rightIsEmpty = rightText.trim() === '';

		if (leftIsEmpty && rightIsEmpty) {
			return { steps: [] as Step[], leftNums: [] as number[], rightNums: [] as number[] };
		}
		if (leftIsEmpty && !rightIsEmpty) {
			const addSteps: Step[] = rightLines.map((_, j) => ({ type: 'add', j }));
			const previewLeftNums = addSteps.map(() => 0);
			const previewRightNums = rightLines.map((_, j) => j + 1);
			return { steps: addSteps, leftNums: previewLeftNums, rightNums: previewRightNums };
		}
		if (!leftIsEmpty && rightIsEmpty) {
			const delSteps: Step[] = leftLines.map((_, i) => ({ type: 'del', i }));
			const previewLeftNums = leftLines.map((_, i) => i + 1);
			const previewRightNums = delSteps.map(() => 0);
			return { steps: delSteps, leftNums: previewLeftNums, rightNums: previewRightNums };
		}
		return { steps, leftNums, rightNums };
	}, [leftText, rightText, leftLines, rightLines, steps, leftNums, rightNums]);

	const { steps: displaySteps, leftNums: displayLeftNums, rightNums: displayRightNums } = previewModel;

	const counts = useMemo(() => {
		let add = 0;
		let del = 0;
		let mod = 0;
		for (let idx = 0; idx < displaySteps.length; idx++) {
			const step = displaySteps[idx];
			if (step.type === 'add') {
				add++;
				continue;
			}
			if (step.type === 'del') {
				del++;
				continue;
			}
			if (step.type === 'mod') {
				const key = stepKeyForMod(step.i, step.j);
				if (key && resolutions && resolutions[key]) {
					continue;
				}
				mod++;
			}
		}
		return { add, del, mod };
	}, [displaySteps, resolutions]);

	const rows = useMemo(() => {
		let lastRenderedWhitespace = false;
		type LocalSeg = DiffSeg & { diffType?: 'add' | 'del' };
		const rowNodes: React.ReactNode[] = [];

		const renderLine = (
			key: string,
			displayNum: number,
			marker: '+' | '-' | ' ' | '~',
			content: string,
			segments?: LocalSeg[],
			resolved?: ModResolution,
		) => {
			const isAdd = marker === '+';
			const isDel = marker === '-';
			const isMod = marker === '~';
			const isResolved = Boolean(resolved);
			const cls = isResolved
				? 'diff-line resolved'
				: isAdd
				? 'diff-line add'
				: isDel
				? 'diff-line del'
				: isMod
				? 'diff-line mod'
				: 'diff-line';
			const bg = isResolved
				? 'var(--diff-resolved-bg, rgba(139, 92, 246, 0.18))'
				: isAdd
				? 'var(--diff-add-bg)'
				: isDel
				? 'var(--diff-del-bg)'
				: isMod
				? 'var(--diff-mod-bg)'
				: 'transparent';

			return (
				<div
					key={key}
					data-preview-line
					data-marker={marker}
					data-display-index={displayNum}
					data-resolved={resolved}
					className={cls}
					style={{ padding: '0 6px 0 0', color: MUTED_COLOR, background: bg }}
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
						<span style={{ width: 14, textAlign: 'center' }}>{marker !== ' ' ? marker : ''}</span>
						<span>{displayNum}</span>
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
										{seg.text || ' '}
									</span>
							  ))
							: content || ' '}
					</span>
				</div>
			);
		};

		for (let idx = 0; idx < displaySteps.length; idx++) {
			const step = displaySteps[idx];
			if (changedOnly && step.type === 'same') continue;

			if (step.type === 'same') {
				const displayNum = displayLeftNums[idx] || (step.i ?? 0) + 1;
				const contentRaw = step.i != null ? leftLines[step.i] ?? '' : '';
				const { display: content, whitespaceOnly } = preparePreviewText(contentRaw, formatPreview);
				const isWhitespaceRow = formatPreview && whitespaceOnly;
				if (formatPreview && isWhitespaceRow && lastRenderedWhitespace) {
					continue;
				}
				lastRenderedWhitespace = isWhitespaceRow;
				rowNodes.push(renderLine(`same-${idx}`, displayNum, ' ', content));
				continue;
			}

			if (step.type === 'del') {
				const displayNum = displayLeftNums[idx] || (step.i ?? 0) + 1;
				const contentRaw = step.i != null ? leftLines[step.i] ?? '' : '';
				const { display: content, whitespaceOnly } = preparePreviewText(contentRaw, formatPreview);
				const isWhitespaceRow = formatPreview && whitespaceOnly;
				if (formatPreview && isWhitespaceRow && lastRenderedWhitespace) {
					continue;
				}
				lastRenderedWhitespace = isWhitespaceRow;
				rowNodes.push(renderLine(`del-${idx}`, displayNum, '-', content));
				continue;
			}

			if (step.type === 'add') {
				const displayNum = displayRightNums[idx] || (step.j ?? 0) + 1;
				const contentRaw = step.j != null ? rightLines[step.j] ?? '' : '';
				const { display: content, whitespaceOnly } = preparePreviewText(contentRaw, formatPreview);
				const isWhitespaceRow = formatPreview && whitespaceOnly;
				if (formatPreview && isWhitespaceRow && lastRenderedWhitespace) {
					continue;
				}
				lastRenderedWhitespace = isWhitespaceRow;
				rowNodes.push(renderLine(`add-${idx}`, displayNum, '+', content));
				continue;
			}

			if (step.type === 'mod') {
				const aRaw = step.i != null ? leftLines[step.i] ?? '' : '';
				const bRaw = step.j != null ? rightLines[step.j] ?? '' : '';
				let leftFormatted = preparePreviewText(aRaw, formatPreview);
				let rightFormatted = preparePreviewText(bRaw, formatPreview);

				if (formatPreview) {
					const jsonPair = formatJsonPair(aRaw, bRaw);
					if (jsonPair) {
						leftFormatted = formatDisplayValue(jsonPair.left);
						rightFormatted = formatDisplayValue(jsonPair.right);
					}
				}

				const key = stepKeyForMod(step.i, step.j);
				const resolution = key && resolutions ? resolutions[key] : undefined;

				if (resolution) {
					if (changedOnly) {
						continue;
					}
					const resolvedFormatted = resolution === 'keep-original' ? leftFormatted : rightFormatted;
					const displayNum =
						resolution === 'keep-altered'
							? displayRightNums[idx] || (step.j ?? 0) + 1
							: displayLeftNums[idx] || (step.i ?? 0) + 1;
					const isWhitespaceRow = formatPreview && resolvedFormatted.whitespaceOnly;
					if (formatPreview && isWhitespaceRow && lastRenderedWhitespace) {
						continue;
					}
					lastRenderedWhitespace = isWhitespaceRow;
					rowNodes.push(
						renderLine(
							`mod-${idx}-resolved`,
							displayNum,
							' ',
							resolvedFormatted.display,
							undefined,
							resolution,
						),
					);
					continue;
				}

				const leftDiffSource = formatPreview ? leftFormatted.display : aRaw;
				const rightDiffSource = formatPreview ? rightFormatted.display : bRaw;

				let segs = mergedSegments(leftDiffSource, rightDiffSource, {
					ignoreWhitespace: false,
					mode: charLevel ? 'char' : 'word',
				}) as LocalSeg[];

				if (formatPreview) {
					segs = segs.map((seg, segIdx) => {
						const text = seg.text ?? '';
						if (segIdx > 0 && text.trim() === '') {
							const collapsed = text.includes('\t') ? text : text.length > 0 ? ' ' : text;
							return { ...seg, text: collapsed };
						}
						return seg;
					});
				}

				const hasInlineChanges = segs.some((seg) => seg.changed);
				const marker = hasInlineChanges ? '~' : ' ';
				const content = leftFormatted.display;
				const isWhitespaceRow = formatPreview && !hasInlineChanges && leftFormatted.whitespaceOnly;
				if (formatPreview && isWhitespaceRow && lastRenderedWhitespace) {
					continue;
				}
				lastRenderedWhitespace = isWhitespaceRow;
				rowNodes.push(renderLine(`mod-${idx}`, displayLeftNums[idx] || (step.i ?? 0) + 1, marker, content, segs));
			}
		}

		return rowNodes;
	}, [steps, changedOnly, leftNums, rightNums, leftLines, rightLines, formatPreview, charLevel, resolutions]);

	return (
		<Field label="Unified diff (preview)" inputId={id}>
			<div
				data-testid="diff-counters"
				style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8, color: 'rgba(138,155,168,0.9)' }}
			>
				<span data-testid="count-add" style={{ color: 'rgba(46,160,67,0.9)' }}>+{counts.add}</span>
				<span data-testid="count-del" style={{ color: 'rgba(248,81,73,0.9)' }}>-{counts.del}</span>
				<span data-testid="count-mod" style={{ color: 'rgba(100,148,237,0.9)' }}>~{counts.mod}</span>
				<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
					<span style={{ color: 'rgba(191, 204, 214, 0.85)', userSelect: 'none', lineHeight: '20px' }}>
						Changed-only preview
					</span>
					<Switch
						checked={changedOnly}
						onChange={(event) => onChangedOnlyChange((event.currentTarget as HTMLInputElement).checked)}
						aria-label="Changed-only preview"
						label={undefined}
						style={{ margin: 0 }}
						data-testid="toggle-changed-only-preview"
					/>
				</span>
				<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
					<span style={{ color: 'rgba(191, 204, 214, 0.85)', userSelect: 'none', lineHeight: '20px' }}>
						Normalize preview
					</span>
					<Switch
						checked={formatPreview}
						onChange={(event) => onFormatPreviewChange((event.currentTarget as HTMLInputElement).checked)}
						aria-label="Normalize preview"
						label={undefined}
						style={{ margin: 0 }}
						data-testid="toggle-normalize-preview"
					/>
				</span>
			</div>
			<div
				id={id}
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
