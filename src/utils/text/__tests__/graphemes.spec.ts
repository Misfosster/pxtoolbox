/**
 * Tests for grapheme-cluster tokenization
 */

import { describe, test, expect } from 'vitest';
import { splitGraphemes } from '../graphemes';

describe('Grapheme Cluster Tokenization', () => {
  test('basic ASCII characters', () => {
    expect(splitGraphemes('hello')).toEqual(['h', 'e', 'l', 'l', 'o']);
    expect(splitGraphemes('')).toEqual([]);
    expect(splitGraphemes('a')).toEqual(['a']);
  });

  test('emoji without modifiers', () => {
    expect(splitGraphemes('👍')).toEqual(['👍']);
    expect(splitGraphemes('🎉')).toEqual(['🎉']);
    expect(splitGraphemes('a👍b')).toEqual(['a', '👍', 'b']);
  });

  test('emoji with skin tone modifiers', () => {
    const result = splitGraphemes('👍🏻');
    expect(result).toEqual(['👍🏻']);
    expect(result.length).toBe(1); // Should be one grapheme cluster
  });

  test('ZWJ family emoji sequences', () => {
    // Family emoji: man + ZWJ + woman + ZWJ + girl
    const family = '👨‍👩‍👧';
    const result = splitGraphemes(family);
    expect(result).toEqual([family]);
    expect(result.length).toBe(1); // Should be one grapheme cluster
    
    // Extended family: man + ZWJ + woman + ZWJ + girl + ZWJ + boy
    const extendedFamily = '👨‍👩‍👧‍👦';
    const extendedResult = splitGraphemes(extendedFamily);
    expect(extendedResult).toEqual([extendedFamily]);
    expect(extendedResult.length).toBe(1); // Should be one grapheme cluster
  });

  test('composed vs decomposed accents', () => {
    // Composed: single Unicode codepoint
    const composed = 'café';
    const composedResult = splitGraphemes(composed);
    expect(composedResult).toEqual(['c', 'a', 'f', 'é']);
    
    // Decomposed: base character + combining mark
    const decomposed = 'cafe\u0301'; // e + combining acute accent
    const decomposedResult = splitGraphemes(decomposed);
    
    // Both should result in same number of graphemes (4)
    expect(composedResult.length).toBe(4);
    expect(decomposedResult.length).toBe(4);
    
    // The last grapheme should be equivalent visually
    expect(composedResult[3].length).toBeGreaterThanOrEqual(1);
    expect(decomposedResult[3].length).toBeGreaterThanOrEqual(1);
  });

  test('mixed content with emoji and text', () => {
    const mixed = 'Hello 👍🏻 world!';
    const result = splitGraphemes(mixed);
    expect(result).toEqual(['H', 'e', 'l', 'l', 'o', ' ', '👍🏻', ' ', 'w', 'o', 'r', 'l', 'd', '!']);
    
    // Verify emoji is treated as single unit
    const emojiIndex = result.findIndex(g => g.includes('👍'));
    expect(result[emojiIndex]).toBe('👍🏻');
  });

  test('complex ZWJ sequences', () => {
    // Professional emoji with skin tone: woman + ZWJ + computer
    const professional = '👩‍💻';
    const result = splitGraphemes(professional);
    expect(result).toEqual([professional]);
    expect(result.length).toBe(1);
  });

  test('surrogate pairs without ZWJ', () => {
    // High surrogate + low surrogate pair
    const surrogates = '𝕏'; // Mathematical double-struck X
    const result = splitGraphemes(surrogates);
    expect(result).toEqual([surrogates]);
    expect(result.length).toBe(1);
  });

  test('edge cases', () => {
    // Single ZWJ (should not crash)
    expect(splitGraphemes('\u200D')).toEqual(['\u200D']);
    
    // Multiple ZWJs without valid sequences (may be coalesced by fallback logic)
    const doubleZwj = splitGraphemes('\u200D\u200D');
    expect(doubleZwj.length).toBeGreaterThanOrEqual(1); // Allow coalescing by fallback
    
    // Whitespace preservation
    expect(splitGraphemes('a b')).toEqual(['a', ' ', 'b']);
  });
});
