import React from 'react';

interface FormatMarker {
	index: number;
	label: string;
	title: string;
}

export const CONTROL_CHAR_MARKERS: Record<string, FormatMarker> = {
	'\u200b': { index: 0, label: 'ZWSP', title: 'Zero-width space (U+200B)' },
	'\u200c': { index: 0, label: 'ZWNJ', title: 'Zero-width non-joiner (U+200C)' },
	'\u200d': { index: 0, label: 'ZWJ', title: 'Zero-width joiner (U+200D)' },
	'\ufeff': { index: 0, label: 'BOM', title: 'Byte Order Mark (U+FEFF)' },
};

export function extractControlMarkers(text: string): { cleaned: string; markers: FormatMarker[] } {
	if (!text) return { cleaned: text, markers: [] };
	const markers: FormatMarker[] = [];
	let cleaned = '';
	let visibleIndex = 0;
	for (const char of text) {
		const marker = CONTROL_CHAR_MARKERS[char];
		if (marker) {
			markers.push({ ...marker, index: visibleIndex });
			continue;
		}
		cleaned += char;
		visibleIndex += 1;
	}
	return { cleaned, markers };
}

export function normalizeSpaces(input: string): string {
    if (!input) return input;
    // Normalize NBSPs and collapse spaces and tabs
    const nbspNormalized = input.replace(/\u00A0/g, ' ');
    const collapsed = nbspNormalized.replace(/[ \t]+/g, ' ');
    // Remove trailing spaces
    let end = collapsed.length;
    while (end > 0 && collapsed[end - 1] === ' ') end--;
    return collapsed.slice(0, end);
}

export function injectMarkersIntoText(text: string, markers: FormatMarker[], style?: 'inline'): React.ReactNode {
	if (!markers.length) return text;
	const sorted = markers
		.slice()
		.sort((a, b) => a.index - b.index)
		.map((marker, idx) => ({ ...marker, key: idx }));
	const nodes: React.ReactNode[] = [];
	let cursor = 0;
	for (const marker of sorted) {
		const clampedIndex = Math.min(Math.max(marker.index, 0), text.length);
		if (clampedIndex > cursor) {
			nodes.push(text.slice(cursor, clampedIndex));
		}
		nodes.push(
			React.createElement('span', {
				key: `marker-${marker.key}-${marker.index}`,
				title: marker.title,
				style: {
					display: 'inline-flex',
					alignItems: 'center',
					justifyContent: 'center',
					padding: style === 'inline' ? '0 2px' : '0 4px',
					margin: style === 'inline' ? '0 1px' : '0 2px',
					borderRadius: 3,
					border: '1px solid rgba(191,204,214,0.25)',
					background: 'rgba(191,204,214,0.12)',
					color: 'rgba(191,204,214,0.78)',
					fontSize: '0.65em',
					fontWeight: 500,
					lineHeight: '1.4',
					letterSpacing: 0.4,
					userSelect: 'none',
					minWidth: 0,
					whiteSpace: 'pre-wrap',
					wordBreak: 'break-word',
					overflowWrap: 'anywhere',
				}
			}, marker.label)
		);
		cursor = clampedIndex;
	}
	if (cursor < text.length) {
		nodes.push(text.slice(cursor));
	}
	return nodes;
}

interface FormattedText {
	normalized: string;
	display: React.ReactNode;
	whitespaceOnly: boolean;
	markers: FormatMarker[];
}

export function formatTextForPreview(text: string, format: boolean): FormattedText {
	const { cleaned, markers: initialMarkers } = extractControlMarkers(text);
	if (!format) {
		return {
			normalized: cleaned,
			display: cleaned,
			whitespaceOnly: cleaned.trim().length === 0,
			markers: initialMarkers,
		};
	}

    const markers = [...initialMarkers];
    const normalized = normalizeSpaces(cleaned);
    const display = injectMarkersIntoText(normalized, markers);
	return {
		normalized,
		display,
		whitespaceOnly: normalized.trim().length === 0,
		markers,
	};
}
