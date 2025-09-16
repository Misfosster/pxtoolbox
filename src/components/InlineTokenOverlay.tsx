import React, { useMemo } from 'react';
import type { DiffSeg } from '../utils/diff/inline';

export interface InlineTokenOverlayProps {
	segmentsPerLine: DiffSeg[][];
	leftOffsetPx: number;
	topOffsetPx: number;
	scrollTop: number;
	contentWidthPx?: number;
	fontFamily?: string;
	fontSize?: string;
	fontWeight?: string;
	letterSpacing?: string;
	lineHeightPx?: number;
	showAdd: boolean;
	showDel: boolean;
}

const InlineTokenOverlay: React.FC<InlineTokenOverlayProps> = ({ segmentsPerLine, leftOffsetPx, topOffsetPx, scrollTop, contentWidthPx, fontFamily, fontSize, fontWeight, letterSpacing, lineHeightPx, showAdd, showDel }) => {
	const lines = useMemo(() => segmentsPerLine, [segmentsPerLine]);
	return (
		<div
			data-testid={showAdd && !showDel ? 'overlay-right' : (!showAdd && showDel ? 'overlay-left' : undefined)}
			dir="auto"
			aria-hidden
			style={{
				position: 'absolute',
				left: leftOffsetPx,
				right: contentWidthPx ? undefined : 0,
				width: contentWidthPx ? `${contentWidthPx}px` : undefined,
				top: topOffsetPx - scrollTop,
				pointerEvents: 'none',
				zIndex: 1,
				fontFamily: fontFamily || 'var(--diff-font, inherit)',
				fontSize: fontSize || 'inherit',
				fontWeight: fontWeight || 'inherit',
				letterSpacing: letterSpacing || 'normal',
				whiteSpace: 'pre-wrap',
				overflowWrap: 'anywhere',
				wordBreak: 'normal',
				lineHeight: lineHeightPx ? `${lineHeightPx}px` : undefined,
				fontVariantLigatures: 'none',
				textRendering: 'optimizeSpeed',
				// @ts-ignore tabSize is supported
				tabSize: 4,
				color: 'transparent',
			}}
		>
			{lines.map((line, li) => (
				<div key={li} data-line-index={li}>
					{line.map((seg, si) => {
						const show = seg.changed ? ((seg.diffType === 'add' && showAdd) || (seg.diffType === 'del' && showDel)) : true;
						const className = seg.changed && show ? (seg.diffType === 'add' ? 'diff-span add' : 'diff-span del') : undefined;
						const style = className ? undefined : { color: 'transparent' as const };
						return (
							<span key={si} className={className} style={style} data-diff-token data-type={seg.changed ? (seg.diffType === 'add' ? 'add' : 'del') : 'eq'}>{seg.text || ' '}</span>
						);
					})}
				</div>
			))}
		</div>
	);
};

export default InlineTokenOverlay;


