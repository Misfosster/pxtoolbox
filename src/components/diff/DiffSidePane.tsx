import React, { useCallback } from 'react';
import Field from '../ui/Field';
import ResizableTextArea from '../ui/ResizableTextArea';
import InlineTokenOverlay from '../InlineTokenOverlay';
import type { DiffSeg } from '../../utils/diff/inline';
import type { OverlayLineRole } from '../../hooks/useOverlaySegments';
import type { GutterMetrics } from '../../hooks/useGutter';

export interface DiffSidePaneProps {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	onFocus: () => void;
	onPasteCollapse: () => void;
	placeholder: string;
	textareaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
	collapsed: boolean;
	minRows: number;
	collapsedMaxRows: number;
	height: number;
	setHeight: (value: number) => void;
	scrollTop: number;
	setScrollTop: (value: number) => void;
	gutter: string;
	metrics: GutterMetrics;
	overlaySegments: DiffSeg[][];
	overlayRoles: OverlayLineRole[];
	overlayId: string;
	overlaySide: 'left' | 'right';
	showOverlay: boolean;
	showAdd: boolean;
	showDel: boolean;
	gutterWidth: number;
	gutterInnerLeft: number;
	contentGap: number;
	spellCheck?: boolean;
}

const DiffSidePane: React.FC<DiffSidePaneProps> = ({
	id,
	label,
	value,
	onChange,
	onFocus,
	onPasteCollapse,
	placeholder,
	textareaRef,
	collapsed,
	minRows,
	collapsedMaxRows,
	height,
	setHeight,
	scrollTop,
	setScrollTop,
	gutter,
	metrics,
	overlaySegments,
	overlayRoles,
	overlayId,
	overlaySide,
	showOverlay,
	showAdd,
	showDel,
	gutterWidth,
	gutterInnerLeft,
	contentGap,
	spellCheck = false,
}) => {
	const handlePointerDown = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			const startY = e.clientY;
			const startHeight = height;
			const prevCursor = document.body.style.cursor;
			const prevUserSelect = (document.body.style as any).userSelect;
			document.body.style.cursor = 'ns-resize';
			(document.body.style as any).userSelect = 'none';
			const startScrollY = window.scrollY;
			let pointerY = e.clientY;
			let dragging = true;
			let rafId = 0;

			const tick = () => {
				const zonePx = Math.max(40, Math.floor(window.innerHeight * 0.05));
				const bottomEdge = window.innerHeight - zonePx;
				const topEdge = zonePx;
				let dir = 0;
				let factor = 0;
				if (pointerY > bottomEdge) {
					dir = 1;
					factor = (pointerY - bottomEdge) / zonePx;
				} else if (pointerY < topEdge) {
					dir = -1;
					factor = (topEdge - pointerY) / zonePx;
				}
				const stepBase = 12;
				const speed = dir === 0 ? 0 : stepBase * (1 + 2.0 * Math.min(1, Math.max(0, factor)));
				if (dir !== 0) window.scrollBy(0, dir * speed);
				const clampedY = Math.min(Math.max(pointerY, topEdge), bottomEdge);
				const deltaY = clampedY - startY + (window.scrollY - startScrollY);
				let next = Math.max(80, startHeight + deltaY);
				const el = textareaRef.current;
				if (el) {
					const maxHeight = el.scrollHeight;
					next = Math.min(next, maxHeight);
				}
				setHeight(next);
				if (dragging) rafId = requestAnimationFrame(tick);
			};

			rafId = requestAnimationFrame(tick);

			const onMove = (ev: PointerEvent) => {
				pointerY = ev.clientY;
			};
			const onUp = () => {
				dragging = false;
				cancelAnimationFrame(rafId);
				window.removeEventListener('pointermove', onMove as any);
				window.removeEventListener('pointerup', onUp as any);
				document.body.style.cursor = prevCursor;
				(document.body.style as any).userSelect = prevUserSelect;
			};

			window.addEventListener('pointermove', onMove as any);
			window.addEventListener('pointerup', onUp as any);
		},
		[height, setHeight, textareaRef],
	);

	const contentWidthPx =
		textareaRef.current
			? textareaRef.current.clientWidth -
			  parseFloat(getComputedStyle(textareaRef.current).paddingLeft || '0') -
			  parseFloat(getComputedStyle(textareaRef.current).paddingRight || '0')
			: undefined;

	return (
		<Field label={label} inputId={id}>
			<div style={{ position: 'relative', overflow: 'hidden' }}>
				<ResizableTextArea
					id={id}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onFocus={onFocus}
					onPaste={onPasteCollapse}
					onScroll={(e) => setScrollTop((e.target as HTMLTextAreaElement).scrollTop)}
					placeholder={placeholder}
					minRows={collapsed ? 3 : minRows}
					maxRows={collapsed ? collapsedMaxRows : undefined}
					autosize={false}
					resizable="horizontal"
					spellCheck={spellCheck}
					style={{
						paddingLeft: gutterWidth + contentGap,
						whiteSpace: 'pre-wrap',
						overflowX: 'hidden',
						height,
						fontFamily:
							'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
					}}
					inputRef={(el) => (textareaRef.current = el)}
				/>
				{showOverlay && (
					<InlineTokenOverlay
						id={overlayId}
						segmentsPerLine={overlaySegments}
						leftOffsetPx={gutterWidth + contentGap}
						topOffsetPx={metrics.paddingTop}
						scrollTop={scrollTop}
						contentWidthPx={contentWidthPx}
						fontFamily={metrics.fontFamily}
						fontSize={metrics.fontSize}
						fontWeight={metrics.fontWeight}
						letterSpacing={metrics.letterSpacing}
						lineHeightPx={metrics.lineHeight}
						showAdd={showAdd}
						showDel={showDel}
						side={overlaySide}
						lineRoles={overlayRoles}
					/>
				)}
				<div
					data-testid={overlaySide === 'left' ? 'diff-left-gutter' : 'diff-right-gutter'}
					aria-hidden
					style={{
						position: 'absolute',
						left: gutterInnerLeft,
						top: metrics.paddingTop - scrollTop,
						width: gutterWidth - gutterInnerLeft,
						textAlign: 'right',
						color: 'rgba(138,155,168,0.7)',
						userSelect: 'none',
						pointerEvents: 'none',
						whiteSpace: 'pre-line',
						lineHeight: `${metrics.lineHeight}px`,
						fontFamily:
							'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
					}}
				>
					{gutter}
				</div>
				<div style={{ position: 'absolute', left: 0, right: 0, bottom: -2, height: 12 }}>
					<div
						role="separator"
						aria-label={`Resize ${label.toLowerCase()}`}
						className="v-resize-handle"
						onPointerDown={handlePointerDown}
					>
						<div className="line" />
					</div>
				</div>
			</div>
		</Field>
	);
};

export default DiffSidePane;
