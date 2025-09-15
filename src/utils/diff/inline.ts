export type DiffSeg = { text: string; changed: boolean; diffType?: 'add' | 'del' };

const seg = typeof Intl !== 'undefined' && (Intl as any).Segmenter
	? new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' })
	: null;

const toGraphemes = (s: string): string[] => {
	if (!s) return [];
	return seg ? Array.from((seg as any).segment(s), (x: any) => x.segment) : Array.from(s);
};

function lcsIndices<T>(A: T[], B: T[], equals: (i: number, j: number) => boolean): Array<{ type: 'eq' | 'del' | 'add'; a?: T; b?: T; i?: number; j?: number }> {
	const n = A.length, m = B.length;
	const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i][j] = equals(i, j) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}
	const ops: Array<{ type: 'eq' | 'del' | 'add'; a?: T; b?: T; i?: number; j?: number }> = [];
	let i = 0, j = 0;
	while (i < n && j < m) {
		if (equals(i, j)) { ops.push({ type: 'eq', a: A[i], b: B[j], i, j }); i++; j++; continue; }
		if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: 'del', a: A[i], i }); i++; }
		else { ops.push({ type: 'add', b: B[j], j }); j++; }
	}
	while (i < n) { ops.push({ type: 'del', a: A[i], i }); i++; }
	while (j < m) { ops.push({ type: 'add', b: B[j], j }); j++; }
	return ops;
}

function levenshteinSimilarity(a: string, b: string): number {
	if (a === b) return 1;
	const n = a.length, m = b.length;
	if (!n || !m) return 0;
	const prev = new Array<number>(m + 1);
	const curr = new Array<number>(m + 1);
	for (let j = 0; j <= m; j++) prev[j] = j;
	for (let i = 1; i <= n; i++) {
		curr[0] = i;
		const ai = a.charCodeAt(i - 1);
		for (let j = 1; j <= m; j++) {
			const cost = ai === b.charCodeAt(j - 1) ? 0 : 1;
			const del = prev[j] + 1;
			const ins = curr[j - 1] + 1;
			const sub = prev[j - 1] + cost;
			let v = del < ins ? del : ins; if (sub < v) v = sub;
			curr[j] = v;
		}
		for (let j = 0; j <= m; j++) prev[j] = curr[j];
	}
	const dist = prev[m];
	const ratio = 1 - dist / Math.max(n, m);
	return ratio;
}

function tokensSimilar(aTok: string, bTok: string): boolean {
	if (!aTok || !bTok) return false;
	if (/^\s+$/.test(aTok) && /^\s+$/.test(bTok)) return true;
	if (aTok === bTok) return true;
	if (aTok.length <= 2 || bTok.length <= 2) return false;
	return levenshteinSimilarity(aTok, bTok) >= 0.7;
}

export function mergedSegments(
	a: string,
	b: string,
	ops: { ignoreWhitespace: boolean; mode: 'char' | 'word' | 'smart' }
): DiffSeg[] {
	if (a === b) return [{ text: a, changed: false }];

	// Tokenize with optional whitespace collapsing
	function buildTokens(src: string) {
		if (ops.mode === 'char') {
			const out: { norm: string[]; map: string[] } = { norm: [], map: [] };
			let i = 0;
			while (i < src.length) {
				const ch = src[i];
				if (ops.ignoreWhitespace && /\s/.test(ch)) {
					let j = i + 1; while (j < src.length && /\s/.test(src[j])) j++;
					out.norm.push(' ');
					out.map.push(src.slice(i, j));
					i = j;
				} else {
					out.norm.push(ch);
					out.map.push(ch);
					i++;
				}
			}
			return out;
		}
		// word/smart
		const parts = src.match(/(\s+|[^\s]+)/g) || [];
		const norm: string[] = [];
		const map: string[] = [];
		for (const t of parts) {
			if (ops.ignoreWhitespace && /^\s+$/.test(t)) { norm.push(' '); map.push(t); }
			else { norm.push(t); map.push(t); }
		}
		return { norm, map };
	}

	const A = buildTokens(a);
	const B = buildTokens(b);
	const equals = (i: number, j: number) => A.norm[i] === B.norm[j]; // strict in all modes
	const opsSeq = lcsIndices(A.norm, B.norm, equals);

	// Post-pass: collapse adjacent del+add that are "similar" and refine with char diff
	const segs: DiffSeg[] = [];
	const MAX_CHAR_REFINEMENT = 2048; // graphemes
	function charLevelSegments(x: string, y: string): DiffSeg[] {
		if (x === y) return [{ text: x, changed: false }];
		const aG = toGraphemes(x);
		const bG = toGraphemes(y);
		if (aG.length > MAX_CHAR_REFINEMENT || bG.length > MAX_CHAR_REFINEMENT) {
			return [
				{ text: x, changed: true, diffType: 'del' },
				{ text: y, changed: true, diffType: 'add' },
			];
		}
		const equalsG = (i: number, j: number) => aG[i] === bG[j];
		const opsG = lcsIndices(aG, bG, equalsG);
		const out: DiffSeg[] = [];
		let last: 'eq' | 'del' | 'add' | null = null; let buf = '';
		const flush = () => {
			if (last === null || buf === '') return;
			if (last === 'eq') out.push({ text: buf, changed: false });
			else if (last === 'del') out.push({ text: buf, changed: true, diffType: 'del' });
			else out.push({ text: buf, changed: true, diffType: 'add' });
			last = null; buf = '';
		};
		for (const op of opsG) {
			const t = op.type;
			const ch = t === 'eq' ? (op.a as string) : t === 'del' ? (op.a as string) : (op.b as string);
			if (last === null) { last = t; buf = ch; continue; }
			if (last === t) { buf += ch; } else { flush(); last = t; buf = ch; }
		}
		flush();
		return out;
	}

	for (let k = 0; k < opsSeq.length; k++) {
		const cur = opsSeq[k];
		const nxt = opsSeq[k + 1];
		if (
			ops.mode === 'smart' && cur && nxt && cur.type === 'del' && nxt.type === 'add' &&
			(cur.a as string).trim() !== '' && (nxt.b as string).trim() !== '' &&
			tokensSimilar(cur.a as string, nxt.b as string)
		) {
			for (const seg of charLevelSegments(cur.a as string, nxt.b as string)) segs.push(seg);
			k++; // consume the add
			continue;
		}
		if (cur.type === 'eq') segs.push({ text: cur.a as string, changed: false });
		else if (cur.type === 'del') segs.push({ text: cur.a as string, changed: true, diffType: 'del' });
		else segs.push({ text: cur.b as string, changed: true, diffType: 'add' });
	}
	return segs;
}


