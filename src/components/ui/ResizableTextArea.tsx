import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { TextArea, type TextAreaProps } from '@blueprintjs/core';

export interface ResizableTextAreaProps extends TextAreaProps {
	minRows?: number;
	autosize?: boolean;
	maxRows?: number;
	/** Native CSS resize handle. Defaults to 'none'. When not 'none', autosize is disabled. */
	resizable?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const ResizableTextArea: React.FC<ResizableTextAreaProps> = ({ minRows = 3, style, fill = true, size = 'large', inputRef, onChange, value, defaultValue, autosize = true, maxRows, resizable = 'none', ...rest }) => {
	const elRef = useRef<HTMLTextAreaElement | null>(null);

	function isRefObject(r: React.Ref<HTMLTextAreaElement> | undefined): r is React.MutableRefObject<HTMLTextAreaElement | null> {
		return typeof r === 'object' && r !== null && 'current' in r;
	}

	function setRef(el: HTMLTextAreaElement | null) {
		elRef.current = el;
		if (typeof inputRef === 'function') inputRef(el);
		else if (isRefObject(inputRef)) inputRef.current = el;
	}

	const fit = useCallback(() => {
		const el = elRef.current;
		if (!el) return;
		const cs = window.getComputedStyle(el);
		const lineHeight = parseFloat(cs.lineHeight || '20');
		const paddingTop = parseFloat(cs.paddingTop || '0');
		const paddingBottom = parseFloat(cs.paddingBottom || '0');
		const minPx = minRows * lineHeight + paddingTop + paddingBottom;
		const maxPx = maxRows ? maxRows * lineHeight + paddingTop + paddingBottom : Infinity;
		el.style.height = 'auto';
		const next = Math.min(maxPx, Math.max(minPx, el.scrollHeight));
		el.style.height = `${next}px`;
	}, [minRows, maxRows]);

	const effectiveAutosize = autosize && resizable === 'none';

	useLayoutEffect(() => {
		if (!effectiveAutosize) return;
		fit();
		const el = elRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => fit());
		ro.observe(el);
		return () => ro.disconnect();
	}, [effectiveAutosize, fit]);

	useEffect(() => {
		if (effectiveAutosize) fit();
	}, [value, defaultValue, effectiveAutosize, fit]);

	return (
		<TextArea
			{...rest}
			value={value}
			defaultValue={defaultValue}
			rows={minRows}
			fill={fill}
			size={size}
			inputRef={setRef}
			style={{
				...style,
				resize: resizable,
				marginBottom: 0,
				// When autosize is disabled, respect an explicit height passed via style
				height: effectiveAutosize ? undefined : (style && (style as React.CSSProperties).height !== undefined ? (style as React.CSSProperties).height : undefined),
				overflow: effectiveAutosize && maxRows ? 'auto' : effectiveAutosize ? undefined : 'auto',
			}}
			onChange={(e) => {
				if (onChange) onChange(e);
				if (effectiveAutosize) requestAnimationFrame(() => fit());
			}}
		/>
	);
};

export default ResizableTextArea;


