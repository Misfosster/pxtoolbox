export function normalizeEOL(s: string): string {
	if (!s) return '';
	return s.replace(/\r\n?/g, '\n');
}

export function normalizeWhitespaceLine(s: string): string {
	// Collapse runs of whitespace to a single space and trim ends
	return s.replace(/\s+/g, ' ').trim();
}


