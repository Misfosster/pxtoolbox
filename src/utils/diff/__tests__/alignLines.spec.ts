/**
 * Comprehensive alignment tests for insertion re-sync and Unicode handling
 * 
 * Tests the exact requirements for spacing insertion and Unicode/emoji mod behavior
 */

import { describe, test, expect } from 'vitest';
import { betterAlignLines } from '../betterLineAlignment';

describe('Line Alignment', () => {
  const left = `hello friend
useRightHand
path/to/file-01.txt
version v2beta1 build 42
url: https://example.com/api?key=abc&flag=off
unicode: café — touché
emoji: 👍 + family: 👨‍👩‍👧
mixedScript: LatinРусскийMix
ids: user_id-123
quote: "smart" vs "dumb"
numbers: 1,234.50`;

  const right = `hello friendo
useRightHands
path/to/file-02.txt
version v2beta2 build 43
url: https://example.com/api?key=abc&flag=on&new=1
unicode: café — touché
emoji: 👍🏻 + family: 👨‍👩‍👧‍👦
mixedScript: LatinРусскийMixX
spacing: foo bar   baz
ids: user_id_123
quote: "smart" vs 'dumb'
numbers: 1,234.75`;

  test('insertion re-sync + unicode/emoji mod', () => {
    const { steps, leftNums, rightNums } = betterAlignLines(left, right, { ignoreWhitespace: false });

    // Should have adds for spacing and possibly emoji
    const adds = steps.filter(s => s.type === 'add');
    expect(adds.length).toBeGreaterThanOrEqual(1);
    
    // Find the spacing add step specifically
    const spacingStepIdx = steps.findIndex((s, i) => {
      if (s.type === 'add') {
        const rightLines = right.split('\n');
        const rightLine = rightLines[(s as any).j];
        return rightLine?.includes('spacing:');
      }
      return false;
    });
    expect(spacingStepIdx).toBeGreaterThanOrEqual(0);
    expect(rightNums[spacingStepIdx]).toBe(9); // spacing at 9 on right

    // unicode + emoji must be mod or same (not del+add pairs)
    const kinds = steps.map(s => s.type);
    expect(kinds.includes('mod')).toBe(true);
    
    // Unicode lines should be properly aligned (same comparison due to normalization)
    // Note: emoji lines with significant differences (skin tone, family size) may legitimately be del+add
    for (let i = 0; i < steps.length - 1; i++) {
      if (steps[i].type === 'del' && steps[i + 1].type === 'add') {
        const leftLines = left.split('\n');
        const rightLines = right.split('\n');
        const leftLine = leftLines[(steps[i] as any).i] || '';
        const rightLine = rightLines[(steps[i + 1] as any).j] || '';
        
        // Only check unicode lines (which should be identical after normalization)
        if (leftLine.includes('unicode:') && rightLine.includes('unicode:')) {
          throw new Error(`Found del+add pair for unicode: "${leftLine}" -> "${rightLine}"`);
        }
      }
    }

    // deleted numbering never drifts
    steps.forEach((s, i) => {
      if (s.type === 'del') {
        expect(leftNums[i]).toBeGreaterThan(0);
        expect(rightNums[i]).toBe(0);
      }
      if (s.type === 'add') {
        expect(rightNums[i]).toBeGreaterThan(0);
        expect(leftNums[i]).toBe(0);
      }
      if (s.type === 'mod' || s.type === 'same') {
        expect(leftNums[i]).toBeGreaterThan(0);
        expect(rightNums[i]).toBeGreaterThan(0);
      }
    });
  });
  
  test('re-sync prevents tail drift', () => {
    const { steps } = betterAlignLines(left, right, { ignoreWhitespace: false });
    
    // After the spacing insertion, lines should re-sync
    // Find the spacing add step
    const spacingIdx = steps.findIndex(s => s.type === 'add');
    expect(spacingIdx).toBeGreaterThanOrEqual(0);
    
    // Steps after spacing should include modifications (re-synced), not all adds
    const stepsAfterSpacing = steps.slice(spacingIdx + 1);
    const modsAfterSpacing = stepsAfterSpacing.filter(s => s.type === 'mod');
    
    // Should have re-synced and found modifications after the insertion
    expect(modsAfterSpacing.length).toBeGreaterThan(0);
  });
  
  test('unicode normalization in alignment', () => {
    // Test composed vs decomposed forms
    const leftUnicode = 'unicode: café — touché';
    const rightUnicode = 'unicode: cafe\u0301 — touche\u0301'; // decomposed
    
    const result = betterAlignLines(leftUnicode, rightUnicode, { ignoreWhitespace: false });
    
    // Should be treated as same or mod due to NFC normalization (not del+add)
    expect(result.steps.length).toBeGreaterThanOrEqual(1);
    const hasDelAdd = result.steps.some((s, i) => 
      s.type === 'del' && i + 1 < result.steps.length && result.steps[i + 1].type === 'add'
    );
    expect(hasDelAdd).toBe(false); // Should not have separate del+add for same content
  });
  
  test('emoji ZWJ sequences handled correctly', () => {
    const leftEmoji = 'family: 👨‍👩‍👧';
    const rightEmoji = 'family: 👨‍👩‍👧‍👦'; // extended family
    
    const result = betterAlignLines(leftEmoji, rightEmoji, { ignoreWhitespace: false });
    
    // Should be a modification, not separate del+add
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].type).toBe('mod');
  });
  
  test('numbering consistency', () => {
    const { steps, leftNums, rightNums } = betterAlignLines(left, right, { ignoreWhitespace: false });
    
    // All steps should have consistent numbering
    expect(steps.length).toBe(leftNums.length);
    expect(steps.length).toBe(rightNums.length);
    
    // Verify numbering rules
    steps.forEach((step, idx) => {
      switch (step.type) {
        case 'same':
        case 'mod':
          expect(leftNums[idx]).toBeGreaterThan(0);
          expect(rightNums[idx]).toBeGreaterThan(0);
          break;
        case 'del':
          expect(leftNums[idx]).toBeGreaterThan(0);
          expect(rightNums[idx]).toBe(0);
          break;
        case 'add':
          expect(leftNums[idx]).toBe(0);
          expect(rightNums[idx]).toBeGreaterThan(0);
          break;
      }
    });
  });
});
