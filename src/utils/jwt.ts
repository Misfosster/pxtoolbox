export function normalizeBase64Url(input: string): string {
	let s = input.replace(/-/g, '+').replace(/_/g, '/');
	const pad = s.length % 4;
	if (pad === 2) s += '==';
	else if (pad === 3) s += '=';
	else if (pad === 1) throw new Error('Invalid Base64 length');
	return s;
}

export function decodeSegment(segment: string): string {
	if (!segment) return '';
	const normalized = normalizeBase64Url(segment);
	const binary = atob(normalized);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	const decoder = new TextDecoder('utf-8', { fatal: false });
	return decoder.decode(bytes);
}

export function tryParseJson(text: string): { pretty: string | null; error: string | null } {
	if (!text) return { pretty: null, error: null };
	try {
		const obj = JSON.parse(text);
		return { pretty: JSON.stringify(obj, null, 2), error: null };
	} catch {
		return { pretty: null, error: 'Invalid JSON in segment' };
	}
}

export function formatRelative(targetMs: number, nowMs: number): string {
	const delta = targetMs - nowMs;
	const absMs = Math.abs(delta);
	const MIN = 60_000;
	if (absMs < MIN) return delta >= 0 ? 'in <1m' : '<1m ago';
	const HOUR = 60 * MIN;
	const DAY = 24 * HOUR;
	const MONTH = 30 * DAY; // approximate

	// Derive years/months primarily from total months so that 12 months => 1 year
	const totalMonths = Math.floor(absMs / MONTH);
	let years = Math.floor(totalMonths / 12);
	let months = totalMonths % 12;

	let rem = absMs - (years * 12 + months) * MONTH;
	const days = Math.floor(rem / DAY); rem -= days * DAY;
	const hours = Math.floor(rem / HOUR); rem -= hours * HOUR;
	const minutes = Math.floor(rem / MIN);

	const units: Array<[number, string]> = [
		[years, 'y'],
		[months, 'mo'],
		[days, 'd'],
		[hours, 'h'],
		[minutes, 'm'],
	];

	const parts: string[] = [];
	for (const [value, label] of units) {
		if (value > 0) parts.push(`${value}${label}`);
		if (parts.length >= 3) break; // keep readable: at most 3 units
	}
	if (parts.length === 0) parts.push('0m');
	const text = parts.join(' ');
	return delta >= 0 ? `in ${text}` : `${text} ago`;
}

export function formatUtc(tsSeconds: number): string {
	const d = new Date(tsSeconds * 1000);
	const yyyy = d.getUTCFullYear();
	const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
	const dd = String(d.getUTCDate()).padStart(2, '0');
	const hh = String(d.getUTCHours()).padStart(2, '0');
	const mi = String(d.getUTCMinutes()).padStart(2, '0');
	const ss = String(d.getUTCSeconds()).padStart(2, '0');
	return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss} UTC`;
}


