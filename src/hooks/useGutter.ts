import { useLayoutEffect, useState } from 'react';

export interface GutterMetrics {
	lineHeight: number;
	paddingTop: number;
	fontFamily: string;
	fontSize: string;
	fontWeight: string;
	letterSpacing: string;
}

export function useGutter(text: string, textarea: HTMLTextAreaElement | null) {
	const [gutter, setGutter] = useState<string>('');
	const [metrics, setMetrics] = useState<GutterMetrics>({ lineHeight: 20, paddingTop: 8, fontFamily: 'monospace', fontSize: '14px', fontWeight: '400', letterSpacing: 'normal' });

	function computeGutter(text0: string, el: HTMLTextAreaElement | null): string {
		if (!text0) return '';
		if (!el) return text0.split('\n').map((_, i) => String(i + 1)).join('\n');
		const cs = window.getComputedStyle(el);
		const paddingLeft = parseFloat(cs.paddingLeft || '0');
		const paddingRight = parseFloat(cs.paddingRight || '0');
		const contentWidth = Math.max(0, el.clientWidth - paddingLeft - paddingRight);
		const lineHeight = parseFloat(cs.lineHeight || '20');
		const mirror = document.createElement('div');
		mirror.style.position = 'absolute';
		mirror.style.visibility = 'hidden';
		mirror.style.pointerEvents = 'none';
		mirror.style.boxSizing = 'content-box';
		mirror.style.whiteSpace = 'pre-wrap';
		mirror.style.overflowWrap = 'anywhere';
		mirror.style.wordBreak = 'normal';
		mirror.style.padding = '0';
		mirror.style.border = '0';
		mirror.style.width = `${contentWidth}px`;
		mirror.style.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
		mirror.style.letterSpacing = cs.letterSpacing || 'normal';
		document.body.appendChild(mirror);
		const gutterLines: string[] = [];
		const logical = text0.split('\n');
		for (let i = 0; i < logical.length; i++) {
			const line = logical[i];
			mirror.textContent = line || ' ';
			const h = mirror.scrollHeight;
			const wraps = Math.max(1, Math.round(h / lineHeight));
			gutterLines.push(String(i + 1));
			for (let j = 1; j < wraps; j++) gutterLines.push('');
		}
		document.body.removeChild(mirror);
		return gutterLines.join('\n');
	}

	useLayoutEffect(() => {
		const el = textarea;
		if (!el) return;
		const cs = window.getComputedStyle(el);
		const lh = parseFloat(cs.lineHeight || '20');
		const pt = parseFloat(cs.paddingTop || '8');
		setMetrics({
			lineHeight: lh,
			paddingTop: pt,
			fontFamily: cs.fontFamily || 'monospace',
			fontSize: cs.fontSize || '14px',
			fontWeight: cs.fontWeight || '400',
			letterSpacing: cs.letterSpacing || 'normal',
		});
	}, [text, textarea]);

	useLayoutEffect(() => {
		setGutter(computeGutter(text, textarea));
		const el = textarea;
		if (!el) return;
		const ro = new ResizeObserver(() => setGutter(computeGutter(text, el)));
		ro.observe(el);
		return () => ro.disconnect();
	}, [text, textarea]);

	return { gutter, metrics } as const;
}


