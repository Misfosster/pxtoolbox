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
	tabSize?: number;
	showAdd: boolean;
	showDel: boolean;
	/** Which side this overlay represents; used for stable test hooks */
	side?: 'left' | 'right';
	/** Line tinting roles for each line */
	lineRoles?: ('none' | 'add' | 'del')[];
	/** Tint opacity for line backgrounds */
	tintOpacity?: number;
	/** Optional ID for testing */
	id?: string;
	/** Optional highlighted line index */
	highlightLineIndex?: number;
	/** Highlight fill color */
	highlightColor?: string;
	/** Enable pointer interaction for acceptance mode */
	interactive?: boolean;
	/** Callback when a line is clicked (interactive only) */
	onLineClick?: (lineIndex: number) => void;
}

const InlineTokenOverlay: React.FC<InlineTokenOverlayProps> = ({
	segmentsPerLine,
	leftOffsetPx,
	topOffsetPx,
	scrollTop,
	contentWidthPx,
	fontFamily,
	fontSize,
	fontWeight,
	letterSpacing,
	lineHeightPx,
	tabSize,
	showAdd,
	showDel,
	side,
	lineRoles = [],
	tintOpacity = 0.1,
	id,
	highlightLineIndex,
	highlightColor = 'rgba(255, 215, 0, 0.35)',
	interactive = false,
	onLineClick,
}) => {
	const lines = useMemo(() => segmentsPerLine, [segmentsPerLine]);
	const baseBodyStyle: React.CSSProperties = {
		display: 'inline-flex',
		alignItems: 'center',
		gap: 4,
		width: '100%',
		whiteSpace: 'pre-wrap',
		wordBreak: 'break-word' as const,
		overflowWrap: 'anywhere' as const,
		minWidth: 0,
	};

    return (
        <div
            id={id}
            data-testid={side === 'right' ? 'overlay-right' : (side === 'left' ? 'overlay-left' : undefined)}
            dir="auto"
            aria-hidden
            style={{
                position: 'absolute',
                left: leftOffsetPx,
                right: contentWidthPx ? undefined : 0,
                width: contentWidthPx ? `${contentWidthPx}px` : undefined,
                top: topOffsetPx,
                transform: `translateY(${-scrollTop}px)`,
                pointerEvents: interactive ? 'auto' : 'none',
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
                tabSize: tabSize ?? 4,
                color: 'transparent',
            }}
        >
            {lines.map((line, li) => {
                const lineRole = lineRoles[li] || 'none';
                const tintClass = lineRole !== 'none' ? `diff-row-tint ${lineRole}` : '';
                const isHighlighted = typeof highlightLineIndex === 'number' && highlightLineIndex === li;
				const lineStyle: React.CSSProperties = {
					width: '100%',
					display: 'inline-flex',
					alignItems: 'center',
					gap: 4,
					...(interactive ? { cursor: 'pointer' } : {}),
				};
				const bodyStyle: React.CSSProperties =
					lineRole !== 'none'
						? {
								...baseBodyStyle,
								backgroundColor:
									lineRole === 'add'
										? `var(--diff-add-row-bg, rgba(34, 197, 94, ${tintOpacity}))`
										: `var(--diff-del-row-bg, rgba(239, 68, 68, ${tintOpacity}))`,
						  }
						: baseBodyStyle;
                
                return (
                    <div
                        key={li}
                        data-line-index={li}
                        className={`relative ${tintClass}`}
                        onClick={interactive ? () => onLineClick?.(li) : undefined}
                        style={lineStyle}
                    >
                        {/* Focus highlight */}
                        {isHighlighted && (
                            <div
                                className="absolute inset-0"
                                style={{ backgroundColor: highlightColor, borderRadius: 4, zIndex: -5 }}
                            />
                        )}
                        {/* Line tint background */}
                        {lineRole !== 'none' && (
                            <div 
                                className="absolute inset-0 -z-10"
                                style={{ 
                                    backgroundColor: lineRole === 'add' 
                                        ? `var(--diff-add-row-bg, rgba(34, 197, 94, ${tintOpacity}))` 
                                        : `var(--diff-del-row-bg, rgba(239, 68, 68, ${tintOpacity}))` 
                                }}
                            />
                        )}
                        {/* Token highlights */}
                        <span className={lineRole !== 'none' ? 'overlay-line-body' : undefined} style={bodyStyle}>
							{line.map((seg, si) => {
								const show = seg.changed
									? (seg.diffType === 'add' && showAdd) || (seg.diffType === 'del' && showDel)
									: true;
								const className = seg.changed && show ? (seg.diffType === 'add' ? 'diff-seg diff-add' : 'diff-seg diff-del') : undefined;
								const style = className
									? {
											whiteSpace: 'pre-wrap',
											wordBreak: 'break-word' as const,
											overflowWrap: 'anywhere' as const,
									  }
									: { color: 'transparent' as const };
								return (
									<span
										key={si}
										className={className}
										style={style}
										data-diff-token
										data-type={seg.changed ? (seg.diffType === 'add' ? 'add' : 'del') : 'eq'}
									>
										{seg.text || ' '}
									</span>
								);
							})}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default InlineTokenOverlay;
