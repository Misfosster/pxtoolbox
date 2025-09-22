/**
 * Better line alignment algorithm that considers similarity
 * 
 * This improves upon the basic LCS by considering line similarity
 * to find more intuitive alignments
 */

import { compareKey } from './unicode';

export interface BetterAlignResult {
  steps: Array<{ type: 'same' | 'del' | 'add' | 'mod'; i?: number; j?: number }>;
  leftNums: number[];
  rightNums: number[];
}

/**
 * Calculate similarity between two lines (0 = completely different, 1 = identical)
 */
function lineSimilarity(a: string, b: string): number {
  if (a === b) return 1.0;
  
  // Normalize for comparison
  const aNorm = a.toLowerCase().trim();
  const bNorm = b.toLowerCase().trim();
  
  if (aNorm === bNorm) return 0.95;
  
  // Check for word-based similarity first
  const aWords = aNorm.split(/\s+/);
  const bWords = bNorm.split(/\s+/);
  
  // If they share the same first 2+ words, they're very likely related
  if (aWords.length >= 2 && bWords.length >= 2) {
    if (aWords[0] === bWords[0] && aWords[1] === bWords[1]) {
      return 0.85; // High similarity for same structure
    }
  }
  
  // Check if they share a common prefix (like "ids:", "emoji:", etc.)
  if (aWords.length > 0 && bWords.length > 0 && aWords[0] === bWords[0]) {
    // Same starting word - calculate more detailed similarity
    const minLen = Math.min(aNorm.length, bNorm.length);
    const maxLen = Math.max(aNorm.length, bNorm.length);
    
    if (minLen === 0) return 0;
    
    // Count matching characters from the start
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (aNorm[i] === bNorm[i]) matches++;
    }
    
    const baseSimilarity = matches / maxLen;
    
    // Special boost for lines that start with the same word
    if (baseSimilarity > 0.5) {
      return Math.min(0.9, baseSimilarity + 0.2);
    }
    return baseSimilarity;
  }
  
  // For completely different structures, use longest common subsequence approach
  const minLen = Math.min(aNorm.length, bNorm.length);
  const maxLen = Math.max(aNorm.length, bNorm.length);
  
  if (minLen === 0) return 0;
  
  // Simple character matching
  let matches = 0;
  for (let i = 0; i < minLen; i++) {
    if (aNorm[i] === bNorm[i]) matches++;
  }
  
  return matches / maxLen;
}

/**
 * Better line alignment using similarity-based approach
 */
export function betterAlignLines(
  leftText: string, 
  rightText: string, 
  opts: { ignoreWhitespace: boolean }
): BetterAlignResult {
  const leftLines = leftText.split('\n').filter((line, i, arr) => 
    i < arr.length - 1 || line !== '' // Remove trailing empty line
  );
  const rightLines = rightText.split('\n').filter((line, i, arr) => 
    i < arr.length - 1 || line !== ''
  );
  
  // Use consistent Unicode normalization via compareKey
  const leftCmp = leftLines.map(line => compareKey(line, { ignoreWhitespace: opts.ignoreWhitespace }));
  const rightCmp = rightLines.map(line => compareKey(line, { ignoreWhitespace: opts.ignoreWhitespace }));
  
  const n = leftLines.length;
  const m = rightLines.length;
  
  // First pass: find exact matches and high-similarity pairs
  const leftUsed = new Array(n).fill(false);
  const rightUsed = new Array(m).fill(false);
  const pairs: Array<{ type: 'same' | 'mod'; i: number; j: number }> = [];
  
  // Find exact matches first - ensure they are marked as 'same'
  for (let i = 0; i < n; i++) {
    if (leftUsed[i]) continue;
    for (let j = 0; j < m; j++) {
      if (rightUsed[j]) continue;
      // Check both normalized and original text for exact matches
      if (leftCmp[i] === rightCmp[j] || leftLines[i] === rightLines[j]) {
        pairs.push({ type: 'same', i, j });
        leftUsed[i] = true;
        rightUsed[j] = true;
        break;
      }
    }
  }
  
  // Find high-similarity pairs (threshold 0.6)
  for (let i = 0; i < n; i++) {
    if (leftUsed[i]) continue;
    let bestJ = -1;
    let bestSim = 0.6; // Lower threshold to catch more similar lines
    
    for (let j = 0; j < m; j++) {
      if (rightUsed[j]) continue;
      const sim = lineSimilarity(leftCmp[i], rightCmp[j]);
      if (sim > bestSim) {
        bestSim = sim;
        bestJ = j;
      }
    }
    
    if (bestJ >= 0) {
      pairs.push({ type: 'mod', i, j: bestJ });
      leftUsed[i] = true;
      rightUsed[bestJ] = true;
    }
  }
  
  // Sort pairs by position to maintain order
  pairs.sort((a, b) => {
    const aPos = a.i + a.j * 0.1; // Slight bias toward left position
    const bPos = b.i + b.j * 0.1;
    return aPos - bPos;
  });
  
  // Generate final alignment steps
  const steps: Array<{ type: 'same' | 'del' | 'add' | 'mod'; i?: number; j?: number }> = [];
  const leftNums: number[] = [];
  const rightNums: number[] = [];
  
  let leftIdx = 0;
  let rightIdx = 0;
  let pairIdx = 0;
  
  while (leftIdx < n || rightIdx < m || pairIdx < pairs.length) {
    // Check if we have a pair at current position
    const nextPair = pairIdx < pairs.length ? pairs[pairIdx] : null;
    
    if (nextPair && nextPair.i === leftIdx && nextPair.j === rightIdx) {
      // Emit the pair
      steps.push({ type: nextPair.type, i: leftIdx, j: rightIdx });
      leftNums.push(leftIdx + 1);
      rightNums.push(rightIdx + 1);
      leftIdx++;
      rightIdx++;
      pairIdx++;
    } else if (nextPair && nextPair.i === leftIdx && nextPair.j > rightIdx) {
      // Need to add right lines before the pair
      steps.push({ type: 'add', j: rightIdx });
      leftNums.push(0);
      rightNums.push(rightIdx + 1);
      rightIdx++;
    } else if (nextPair && nextPair.i > leftIdx) {
      // Need to delete left lines before the pair
      steps.push({ type: 'del', i: leftIdx });
      leftNums.push(leftIdx + 1);
      rightNums.push(0);
      leftIdx++;
    } else if (leftIdx < n && !leftUsed[leftIdx]) {
      // Unmatched left line - delete
      steps.push({ type: 'del', i: leftIdx });
      leftNums.push(leftIdx + 1);
      rightNums.push(0);
      leftIdx++;
    } else if (rightIdx < m && !rightUsed[rightIdx]) {
      // Unmatched right line - add
      steps.push({ type: 'add', j: rightIdx });
      leftNums.push(0);
      rightNums.push(rightIdx + 1);
      rightIdx++;
    } else {
      // Skip used lines
      if (leftIdx < n && leftUsed[leftIdx]) leftIdx++;
      if (rightIdx < m && rightUsed[rightIdx]) rightIdx++;
    }
  }
  
  return { steps, leftNums, rightNums };
}
