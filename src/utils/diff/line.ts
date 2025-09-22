import { normalizeWhitespaceLine } from './normalize';
import { compareKey } from './unicode';
import { computeLocalNumbers } from './numbering';

// Enhanced similarity function for better post-delete resync, emoji-aware
function lineSimilarity(a: string, b: string): number {
	if (a === b) return 1.0;
	if (!a || !b) return 0.0;
	
	// Use normalized strings for comparison to handle composed/decomposed Unicode
	const aNorm = compareKey(a, { ignoreWhitespace: false });
	const bNorm = compareKey(b, { ignoreWhitespace: false });
	
	if (aNorm === bNorm) return 1.0;
	
	// Character-level similarity for better matching
	const aChars = aNorm.toLowerCase();
	const bChars = bNorm.toLowerCase();
	
	// Levenshtein-like similarity
	const maxLen = Math.max(aChars.length, bChars.length);
	if (maxLen === 0) return 1.0;
	
	let matches = 0;
	const minLen = Math.min(aChars.length, bChars.length);
	
	// Count character matches at similar positions
	for (let i = 0; i < minLen; i++) {
		if (aChars[i] === bChars[i]) matches++;
	}
	
	// Add word-level similarity for structure, but be more lenient with emoji
	const aWords = a.toLowerCase().split(/\s+/).filter(w => w.length > 0);
	const bWords = b.toLowerCase().split(/\s+/).filter(w => w.length > 0);
	
	if (aWords.length > 0 && bWords.length > 0) {
		const aSet = new Set(aWords);
		const bSet = new Set(bWords);
		const intersection = new Set([...aSet].filter(w => bSet.has(w)));
		const union = new Set([...aSet, ...bSet]);
		const wordSim = intersection.size / union.size;
		
		// Combine character and word similarity
		const charSim = matches / maxLen;
		
		// Be more generous with emoji/unicode content - check for partial matches
		const hasEmoji = /[\u{1F000}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(a + b);
		const boost = hasEmoji ? 0.3 : 0.0; // Boost similarity for emoji content
		
		return Math.min(1.0, Math.max(charSim, wordSim * 0.8) + boost);
	}
	
	return matches / maxLen;
}

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

// Step definition for unified alignment
export type Step =
	| { type: 'same'; i: number; j: number }
	| { type: 'del'; i: number }
	| { type: 'add'; j: number }
	| { type: 'mod'; i: number; j: number };

export type AlignResult = {
	steps: Step[];
	leftNums: number[];  // 1-based; 0 when N/A
	rightNums: number[]; // 1-based; 0 when N/A
};

// Produce alignment steps and local number maps directly from raw strings
export function alignLines(a: string, b: string, opts: { ignoreWhitespace: boolean }): AlignResult {
    const aLines = splitLinesNoTrailingEmpty(a);
    const bLines = splitLinesNoTrailingEmpty(b);
    // Use consistent compareKey for Unicode-safe comparison
	const aCmp = aLines.map(line => compareKey(line, { ignoreWhitespace: opts.ignoreWhitespace }));
	const bCmp = bLines.map(line => compareKey(line, { ignoreWhitespace: opts.ignoreWhitespace }));
	const n = aLines.length;
	const m = bLines.length;
	const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			dp[i][j] = aCmp[i] === bCmp[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}

    const raw: Step[] = [];
	let i = 0, j = 0;
	const WINDOW = 10; // Enhanced re-sync window for better post-delete pairing
	const SIMILARITY_THRESHOLD = 0.72; // Higher threshold for more precise matching
	
	while (i < n && j < m) {
		if (aCmp[i] === bCmp[j]) { raw.push({ type: 'same', i, j }); i++; j++; continue; }
		
		const delKeeps = i + 1 < n && aCmp[i + 1] === bCmp[j];
		const addKeeps = j + 1 < m && aCmp[i] === bCmp[j + 1];
		if (delKeeps && !addKeeps) { raw.push({ type: 'del', i }); i++; continue; }
		if (addKeeps && !delKeeps) { raw.push({ type: 'add', j }); j++; continue; }
		
		// Enhanced re-sync window: look ahead to prevent tail drift with monotone constraint
		// Also try immediate pairing for similar lines (like emoji variations)
		let foundAhead = false;
		let bestSim = SIMILARITY_THRESHOLD;
		let bestK = -1;
		let bestDirection = '';
		
		// First, check immediate similarity for potential mod step
		const immediateSim = lineSimilarity(aLines[i], bLines[j]);
		if (immediateSim >= 0.6) { // Lower threshold for immediate pairing
			raw.push({ type: 'mod', i, j });
			i++;
			j++;
			continue;
		}
		
		for (let k = 1; k <= WINDOW; k++) {
			// Check if current left line appears ahead on right (monotone: j+k > j)
			if (j + k < m) {
				const sim = lineSimilarity(aLines[i], bLines[j + k]);
				if (sim > bestSim) {
					bestSim = sim;
					bestK = k;
					bestDirection = 'right';
				}
			}
			// Check if current right line appears ahead on left (monotone: i+k > i)
			if (i + k < n) {
				const sim = lineSimilarity(bLines[j], aLines[i + k]);
				if (sim > bestSim) {
					bestSim = sim;
					bestK = k;
					bestDirection = 'left';
				}
			}
		}
		
		if (bestK > 0) {
			if (bestDirection === 'right') {
				// Current left line matches k positions ahead on right
				// Emit k add steps for the intervening right lines (maintain monotone rightIdx)
				for (let a = 0; a < bestK; a++) {
					raw.push({ type: 'add', j: j + a });
				}
				j += bestK; // Move j past the added lines
				foundAhead = true;
			} else if (bestDirection === 'left') {
				// Current right line matches k positions ahead on left  
				// Emit k del steps for the intervening left lines
				for (let d = 0; d < bestK; d++) {
					raw.push({ type: 'del', i: i + d });
				}
				i += bestK; // Move i past the deleted lines
				foundAhead = true;
			}
		}
		if (foundAhead) continue;
		
		// Prefer pairing as modification on ties or when both sides could keep alignment
		if (dp[i + 1][j] === dp[i][j + 1] || (delKeeps && addKeeps)) { raw.push({ type: 'mod', i, j }); i++; j++; continue; }
		if (dp[i + 1][j] > dp[i][j + 1]) { raw.push({ type: 'del', i }); i++; continue; }
		if (dp[i + 1][j] < dp[i][j + 1]) { raw.push({ type: 'add', j }); j++; continue; }
		// Fallback tie-break: emit both as separate steps
		raw.push({ type: 'del', i });
		raw.push({ type: 'add', j });
		i++; j++;
	}
	while (i < n) { raw.push({ type: 'del', i }); i++; }
	while (j < m) { raw.push({ type: 'add', j }); j++; }

    // Collapse isolated del+add pairs into mod only when doing so keeps alignment
    // CRITICAL: Use the same aCmp/bCmp comparison keys as the DP above
	const steps: Step[] = [];
	for (let k = 0; k < raw.length; k++) {
		const cur = raw[k];
		const nxt = raw[k + 1];
        if (cur && nxt && cur.type === 'del' && nxt.type === 'add') {
            const iDel = (cur as any).i as number;
            const jAdd = (nxt as any).j as number;
            // Use compareKey for consistency - same normalization as DP
            const look1 = (iDel + 1 < n) && (jAdd + 1 < m) && (aCmp[iDel + 1] === bCmp[jAdd + 1]);
            const look2 = (iDel + 1 < n) && (aCmp[iDel + 1] === bCmp[jAdd]);
            const look3 = (jAdd + 1 < m) && (aCmp[iDel] === bCmp[jAdd + 1]);
            if (look1 || look2 || look3) {
                steps.push({ type: 'mod', i: iDel, j: jAdd });
                k++; // Skip the next 'add' step since we've collapsed it
                continue;
            }
        }
		steps.push(cur);
	}

	// Use two-cursor approach for correct local numbering
	const { leftNums, rightNums } = computeLocalNumbers(steps);

    if (process.env.NODE_ENV !== 'production') {
        if (steps.length !== leftNums.length || steps.length !== rightNums.length) {
            // eslint-disable-next-line no-console
            console.warn('alignLines invariant failed: length mismatch', { steps: steps.length, leftNums: leftNums.length, rightNums: rightNums.length });
        }
    }
    return { steps, leftNums, rightNums };
}

