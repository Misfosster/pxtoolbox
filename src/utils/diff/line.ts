import { normalizeWhitespaceLine } from './normalize';

export function splitLinesNoTrailingEmpty(s: string): string[] {
  // Split into lines and drop a trailing empty element if it's only from a terminal newline
  const lines = s.split(/\n/);
  if (lines.length > 0 && lines[lines.length - 1] === '' && /\n$/.test(s)) {
    lines.pop();
  }
  return lines;
}

// Minimal LCS-based line diff. TODO: Replace with Myers for optimal scripts.
export function lcsLineDiff(a: string, b: string, opts: { ignoreWhitespace: boolean }): string {
	if (!a && !b) return '';
	if (!a && b) return splitLinesNoTrailingEmpty(b).map((l) => '+ ' + l).join('\n');
	if (a && !b) return splitLinesNoTrailingEmpty(a).map((l) => '- ' + l).join('\n');
	const aLines = splitLinesNoTrailingEmpty(a);
	const bLines = splitLinesNoTrailingEmpty(b);
	const aCmp = opts.ignoreWhitespace ? aLines.map(normalizeWhitespaceLine) : aLines;
	const bCmp = opts.ignoreWhitespace ? bLines.map(normalizeWhitespaceLine) : bLines;
	const n = aLines.length;
	const m = bLines.length;
	const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--) {
		const ai = aCmp[i];
		for (let j = m - 1; j >= 0; j--) {
			dp[i][j] = ai === bCmp[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}
	const out: string[] = [];
	let i = 0, j = 0;
	while (i < n && j < m) {
		if (aCmp[i] === bCmp[j]) { out.push('  ' + aLines[i]); i++; j++; continue; }
		const delKeepsAlign = i + 1 < n && aCmp[i + 1] === bCmp[j];
		const addKeepsAlign = j + 1 < m && aCmp[i] === bCmp[j + 1];
		if (delKeepsAlign && !addKeepsAlign) { out.push('- ' + aLines[i]); i++; continue; }
		if (addKeepsAlign && !delKeepsAlign) { out.push('+ ' + bLines[j]); j++; continue; }
		if (dp[i + 1][j] > dp[i][j + 1]) { out.push('- ' + aLines[i]); i++; continue; }
		if (dp[i + 1][j] < dp[i][j + 1]) { out.push('+ ' + bLines[j]); j++; continue; }
		out.push('- ' + aLines[i]);
		out.push('+ ' + bLines[j]);
		i++; j++;
	}
	while (i < n) { out.push('- ' + aLines[i]); i++; }
	while (j < m) { out.push('+ ' + bLines[j]); j++; }
	return out.join('\n');
}

export type AlignStep = { type: 'same' | 'del' | 'add' | 'mod'; i?: number; j?: number };

// Produces an alignment of lines between pre-split arrays. Pairs adjacent del+add (or add+del) as 'mod'.
export function alignLines(aLines: string[], bLines: string[], opts: { ignoreWhitespace: boolean }): AlignStep[] {
	const aCmp = opts.ignoreWhitespace ? aLines.map(normalizeWhitespaceLine) : aLines;
	const bCmp = opts.ignoreWhitespace ? bLines.map(normalizeWhitespaceLine) : bLines;
	const n = aLines.length;
	const m = bLines.length;
	const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i][j] = aCmp[i] === bCmp[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}
	const ops: Array<{ type: 'eq' | 'del' | 'add'; i?: number; j?: number }> = [];
	let i = 0, j = 0;
	while (i < n && j < m) {
		if (aCmp[i] === bCmp[j]) { ops.push({ type: 'eq', i, j }); i++; j++; continue; }
		if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: 'del', i }); i++; }
		else { ops.push({ type: 'add', j }); j++; }
	}
	while (i < n) { ops.push({ type: 'del', i }); i++; }
	while (j < m) { ops.push({ type: 'add', j }); j++; }

	const out: AlignStep[] = [];
	for (let k = 0; k < ops.length; k++) {
		const cur = ops[k];
		const nxt = ops[k + 1];
		if (cur.type === 'eq') { out.push({ type: 'same', i: cur.i, j: cur.j }); continue; }
		// Pair single add+del or del+add as modification
		if (nxt && ((cur.type === 'del' && nxt.type === 'add') || (cur.type === 'add' && nxt.type === 'del'))) {
			const iIdx = cur.type === 'del' ? cur.i : nxt.i;
			const jIdx = cur.type === 'add' ? cur.j : nxt.j;
			out.push({ type: 'mod', i: iIdx, j: jIdx });
			k++;
			continue;
		}
		if (cur.type === 'del') { out.push({ type: 'del', i: cur.i }); continue; }
		if (cur.type === 'add') { out.push({ type: 'add', j: cur.j }); continue; }
	}
	return out;
}


