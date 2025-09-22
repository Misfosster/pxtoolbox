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
	/** Which side this overlay represents; used for stable test hooks */
	side?: 'left' | 'right';
	/** Line tinting roles for each line */
	lineRoles?: ('none' | 'add' | 'del')[];
	/** Tint opacity for line backgrounds */
	tintOpacity?: number;
	/** Optional ID for testing */
	id?: string;
}

const InlineTokenOverlay: React.FC<InlineTokenOverlayProps> = ({ segmentsPerLine, leftOffsetPx, topOffsetPx, scrollTop, contentWidthPx, fontFamily, fontSize, fontWeight, letterSpacing, lineHeightPx, showAdd, showDel, side, lineRoles = [], tintOpacity = 0.10, id }) => {
    const lines = useMemo(() => segmentsPerLine, [segmentsPerLine]);
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
            {lines.map((line, li) => {
                const lineRole = lineRoles[li] || 'none';
                const tintClass = lineRole !== 'none' ? `diff-row-tint ${lineRole}` : '';
                
                return (
                    <div key={li} data-line-index={li} className={`relative ${tintClass}`}>
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
                        {line.map((seg, si) => {
                            const show = seg.changed ? ((seg.diffType === 'add' && showAdd) || (seg.diffType === 'del' && showDel)) : true;
                            const className = seg.changed && show ? (seg.diffType === 'add' ? 'diff-seg diff-add' : 'diff-seg diff-del') : undefined;
                            const style = className ? undefined : { color: 'transparent' as const };
                            return (
                                <span key={si} className={className} style={style} data-diff-token data-type={seg.changed ? (seg.diffType === 'add' ? 'add' : 'del') : 'eq'}>{seg.text || ' '}</span>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};

export default InlineTokenOverlay;


