import React, { useMemo } from 'react';
import type { DiffSeg } from '../utils/diff/inline';

export interface InlineTokenOverlayProps {
	segmentsPerLine: DiffSeg[][];
	leftOffsetPx: number;
	topOffsetPx: number;
	scrollTop: number;
	fontFamily?: string;
	fontSize?: string;
	fontWeight?: string;
	letterSpacing?: string;
	lineHeightPx?: number;
	showAdd: boolean;
	showDel: boolean;
}

const InlineTokenOverlay: React.FC<InlineTokenOverlayProps> = ({ segmentsPerLine, leftOffsetPx, topOffsetPx, scrollTop, fontFamily, fontSize, fontWeight, letterSpacing, lineHeightPx, showAdd, showDel }) => {
	const lines = useMemo(() => segmentsPerLine, [segmentsPerLine]);
	return (
		<div
			aria-hidden
			style={{
				position: 'absolute',
				left: leftOffsetPx,
				right: 0,
				top: topOffsetPx - scrollTop,
				pointerEvents: 'none',
				fontFamily: fontFamily || 'inherit',
				fontSize: fontSize || 'inherit',
				fontWeight: fontWeight || 'inherit',
				letterSpacing: letterSpacing || 'normal',
				whiteSpace: 'pre-wrap',
				lineHeight: lineHeightPx ? `${lineHeightPx}px` : undefined,
				color: 'transparent',
			}}
		>
			{lines.map((segs, idx) => (
				<React.Fragment key={idx}>
					{segs.map((s, i) => {
						const visible = s.changed && ((s.diffType === 'add' && showAdd) || (s.diffType === 'del' && showDel));
						const style = visible
							? (s.diffType === 'add'
								? { background: 'rgba(46, 160, 67, 0.55)', borderRadius: 2 }
								: { background: 'rgba(248, 81, 73, 0.55)', borderRadius: 2 })
							: undefined;
						return (
							<span key={i} style={style}>{s.text || ' '}</span>
						);
					})}
					{idx < lines.length - 1 ? '\n' : null}
				</React.Fragment>
			))}
		</div>
	);
};

export default InlineTokenOverlay;


