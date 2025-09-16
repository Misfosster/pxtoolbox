export type DiffSeg = { text: string; changed: boolean; diffType?: 'add' | 'del' };

const graphemeSeg = typeof Intl !== 'undefined' && (Intl as any).Segmenter
	? new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' })
	: null;
const wordSeg = typeof Intl !== 'undefined' && (Intl as any).Segmenter
	? new (Intl as any).Segmenter(undefined, { granularity: 'word' })
	: null;

const toGraphemes = (s: string): string[] => {
	if (!s) return [];
	return graphemeSeg ? Array.from((graphemeSeg as any).segment(s), (x: any) => x.segment) : Array.from(s);
};

function splitSubwords(token: string): string[] {
	// Split camel/PascalCase boundaries, letter<->digit boundaries, and isolate '_' and '-'
	if (!token) return [''];
	if (/^\s+$/.test(token)) return [token];
	const out: string[] = [];
	let buf = '';
	const flush = () => { if (buf) { out.push(buf); buf = ''; } };
	for (let i = 0; i < token.length; i++) {
		const ch = token[i];
		const prev = i > 0 ? token[i - 1] : '';
		if (ch === '_' || ch === '-') { flush(); out.push(ch); continue; }
		const isUpper = ch >= 'A' && ch <= 'Z';
		const isLower = ch >= 'a' && ch <= 'z';
		const isLetter = isUpper || isLower;
		const isDigit = ch >= '0' && ch <= '9';
		const prevIsUpper = prev >= 'A' && prev <= 'Z';
		const prevIsLower = prev >= 'a' && prev <= 'z';
		const prevIsLetter = prevIsUpper || prevIsLower;
		const prevIsDigit = prev >= '0' && prev <= '9';
		if (
			(i > 0 && prevIsLower && isUpper) ||
			(i > 0 && ((prevIsLetter && isDigit) || (prevIsDigit && isLetter)))
		) {
			flush();
		}
		buf += ch;
	}
	flush();
	return out;
}

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

export function mergedSegments(
	a: string,
	b: string,
	ops: { ignoreWhitespace: boolean; mode: 'char' | 'word' | 'smart' }
): DiffSeg[] {
	if (a === b) return [{ text: a, changed: false }];

	// Tokenize with Unicode word segmentation, then heuristic subword splitting; preserve whitespace tokens
	function buildTokens(src: string) {
		const norm: string[] = [];
		const map: string[] = [];
		if (ops.mode === 'char') {
			const g = toGraphemes(src);
			for (const ch of g) {
				if (ops.ignoreWhitespace && /^\s+$/.test(ch)) { norm.push(' '); map.push(ch); }
				else { norm.push(ch); map.push(ch); }
			}
			return { norm, map };
		}
		if (wordSeg) {
			const iterator = (wordSeg as any).segment(src) as Iterable<any>;
			for (const part of iterator as any) {
				const segText: string = part.segment;
				const isWordLike = !!part.isWordLike;
				if (!isWordLike) {
					if (ops.ignoreWhitespace && /^\s+$/.test(segText)) { norm.push(' '); map.push(segText); }
					else { norm.push(segText); map.push(segText); }
					continue;
				}
				for (const sub of splitSubwords(segText)) {
					if (ops.ignoreWhitespace && /^\s+$/.test(sub)) { norm.push(' '); map.push(sub); }
					else { norm.push(sub); map.push(sub); }
				}
			}
			return { norm, map };
		}
		// Fallback: whitespace split then heuristic subword split
		const parts = src.match(/(\s+|[^\s]+)/g) || [];
		for (const t of parts) {
			if (/^\s+$/.test(t)) {
				if (ops.ignoreWhitespace) { norm.push(' '); map.push(t); } else { norm.push(t); map.push(t); }
				continue;
			}
			for (const sub of splitSubwords(t)) { norm.push(sub); map.push(sub); }
		}
		return { norm, map };
	}

	const A = buildTokens(a);
	const B = buildTokens(b);
	const equals = (i: number, j: number) => A.norm[i] === B.norm[j]; // strict equality
	const opsSeq = lcsIndices(A.norm, B.norm, equals);

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
		// Refine only when the pair is reasonably similar (avoid over-highlighting unrelated replacements)
		if (
			cur && nxt && cur.type === 'del' && nxt.type === 'add' &&
			!/^\s+$/.test(String(cur.a)) && !/^\s+$/.test(String(nxt.b)) &&
			(
				// heuristic similarity: quick length ratio + first/last grapheme match
				(() => {
					const aStr = String(cur.a);
					const bStr = String(nxt.b);
					const aLen = aStr.length || 1;
					const bLen = bStr.length || 1;
					const ratio = aLen > bLen ? bLen / aLen : aLen / bLen;
					if (ratio < 0.34) return false;
					const aG = toGraphemes(aStr);
					const bG = toGraphemes(bStr);
					if (aG.length && bG.length && aG[0] === bG[0]) return true;
					if (aG.length && bG.length && aG[aG.length - 1] === bG[bG.length - 1]) return true;
					return aStr.toLowerCase()[0] === bStr.toLowerCase()[0];
				})()
			)
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


