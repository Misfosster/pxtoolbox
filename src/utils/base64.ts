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

export function normalizeBase64Input(raw: string): string {
	let s = raw.replace(/\s+/g, '');
	s = s.replace(/-/g, '+').replace(/_/g, '/');
	const remainder = s.length % 4;
	if (remainder === 1) {
		throw new Error('Invalid Base64 length');
	} else if (remainder === 2) {
		s += '==';
	} else if (remainder === 3) {
		s += '=';
	}
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


