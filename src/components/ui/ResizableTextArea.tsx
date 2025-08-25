import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { TextArea, type TextAreaProps } from '@blueprintjs/core';

export interface ResizableTextAreaProps extends TextAreaProps {
	minRows?: number;
	autosize?: boolean;
	maxRows?: number;
}

const ResizableTextArea: React.FC<ResizableTextAreaProps> = ({ minRows = 3, style, fill = true, large = true, inputRef, onChange, value, defaultValue, autosize = true, maxRows, ...rest }) => {
	const elRef = useRef<HTMLTextAreaElement | null>(null);

	function setRef(el: HTMLTextAreaElement | null) {
		elRef.current = el;
		if (typeof inputRef === 'function') inputRef(el);
		else if (inputRef && 'current' in (inputRef as any)) (inputRef as any).current = el;
	}

	function fit() {
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
	}

	useLayoutEffect(() => {
		if (!autosize) return;
		fit();
		const el = elRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => fit());
		ro.observe(el);
		return () => ro.disconnect();
	}, [autosize]);

	useEffect(() => {
		if (autosize) fit();
	}, [value, defaultValue, autosize]);

	return (
		<TextArea
			{...rest}
			value={value as any}
			defaultValue={defaultValue as any}
			rows={minRows}
			fill={fill}
			large={large}
			inputRef={setRef}
			style={{ ...style, resize: 'none', marginBottom: 0, height: autosize ? undefined : '100%', overflow: autosize && maxRows ? 'auto' : autosize ? undefined : 'auto' }}
			onChange={(e) => {
				if (onChange) onChange(e);
				if (autosize) requestAnimationFrame(() => fit());
			}}
		/>
	);
};

export default ResizableTextArea;


