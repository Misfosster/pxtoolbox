export function encodeToBase64(input: string): string {
	const encoder = new TextEncoder();
	const bytes = encoder.encode(input);
	let binary = '';
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, i + chunkSize);
		binary += String.fromCharCode(...chunk);
	}
	return btoa(binary);
}

function stripDataUrlPrefix(raw: string): string {
	const prefix = /^data:.*?;base64,/i;
	return prefix.test(raw) ? raw.replace(prefix, '') : raw;
}

/** Normalizes Base64:
 * - trim
 * - strip `data:*;base64,` if present
 * - remove whitespace
 * - convert Base64URL (-, _) → (+, /)
 * - fix padding (length % 4 === 0), throw if remainder === 1
 */
export function normalizeBase64Input(raw: string): string {
	let s = raw.trim();
	s = stripDataUrlPrefix(s);
	s = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');

	const rem = s.length % 4;
	if (rem === 1) throw new Error('Invalid Base64 length');
	if (rem === 2) s += '==';
	else if (rem === 3) s += '=';

	return s;
}

export function decodeFromBase64(b64: string): string {
	const normalized = normalizeBase64Input(b64);
	const binary = atob(normalized);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) {
		bytes[i] = binary.charCodeAt(i);
	}
	const decoder = new TextDecoder('utf-8', { fatal: false });
	return decoder.decode(bytes);
}


