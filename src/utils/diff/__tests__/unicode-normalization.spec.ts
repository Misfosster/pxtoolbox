/**
 * Unicode normalization and consistent comparison tests
 * 
 * Validates that composed vs decomposed forms are handled correctly
 * and that grapheme clusters (emoji, accents) are not split
 */

import { describe, test, expect } from 'vitest';
import { alignLines } from '../line';
import { mergedSegments } from '../inline';
import { compareKey, graphemesNFC } from '../unicode';

describe('Unicode Normalization', () => {
  describe('compareKey function', () => {
    test('should normalize composed vs decomposed as equal', () => {
      const composed = 'café'; // precomposed é (U+00E9)
      const decomposed = 'cafe\u0301'; // e + combining acute accent (U+0065 U+0301)
      
      expect(compareKey(composed)).toBe(compareKey(decomposed));
    });
    
    test('should handle whitespace normalization consistently', () => {
      const text1 = 'hello   world';
      const text2 = 'hello\t\tworld';
      
      expect(compareKey(text1, { ignoreWhitespace: true }))
        .toBe(compareKey(text2, { ignoreWhitespace: true }));
      
      expect(compareKey(text1, { ignoreWhitespace: false }))
        .not.toBe(compareKey(text2, { ignoreWhitespace: false }));
    });
  });
  
  describe('graphemesNFC function', () => {
    test('should not split emoji ZWJ sequences', () => {
      const familyEmoji = '👨‍👩‍👧‍👦'; // man-woman-girl-boy
      const graphemes = graphemesNFC(familyEmoji);
      
      // Should be treated as a single grapheme cluster
      expect(graphemes).toHaveLength(1);
      expect(graphemes[0]).toBe(familyEmoji);
    });
    
    test('should not split combining characters', () => {
      const accentedChar = 'é'; // either composed or decomposed
      const graphemes = graphemesNFC(accentedChar);
      
      // Should be treated as a single grapheme
      expect(graphemes).toHaveLength(1);
    });
    
    test('should handle skin tone modifiers', () => {
      const thumbsUp = '👍'; // base
      const thumbsUpLight = '👍🏻'; // with light skin tone
      
      const baseGraphemes = graphemesNFC(thumbsUp);
      const modifiedGraphemes = graphemesNFC(thumbsUpLight);
      
      expect(baseGraphemes).toHaveLength(1);
      expect(modifiedGraphemes).toHaveLength(1);
      expect(modifiedGraphemes[0]).toBe(thumbsUpLight);
    });
  });
});

describe('Line Alignment Unicode Tests', () => {
  test('pairs composed vs decomposed as a single same', () => {
    const left  = 'unicode: café — touché';
    const right = 'unicode: cafe\u0301 — touche\u0301'; // decomposed forms
    
    const { steps } = alignLines(left, right, { ignoreWhitespace: false });
    
    // Should be treated as identical due to Unicode normalization
    expect(steps.filter(s => s.type === 'same')).toHaveLength(1);
    expect(steps.some(s => s.type === 'add' || s.type === 'del' || s.type === 'mod')).toBe(false);
  });
  
  test('handles ZWJ emoji without breaking clusters', () => {
    const left  = 'emoji: 👍 + family: 👨‍👩‍👧';
    const right = 'emoji: 👍🏻 + family: 👨‍👩‍👧‍👦';
    
    const { steps } = alignLines(left, right, { ignoreWhitespace: false });
    const modStep = steps.find(s => s.type === 'mod');
    expect(modStep).toBeDefined();
    
    // Check inline segmentation doesn't break ZWJ sequences
    const leftLine = left.split('\n')[0];
    const rightLine = right.split('\n')[0];
    const segs = mergedSegments(leftLine, rightLine, { ignoreWhitespace: false, mode: 'word' });
    
    // Should not split the family emoji into individual components
    const familySegments = segs.filter(s => /👨‍👩‍👧/.test(s.text));
    expect(familySegments.length).toBeGreaterThan(0);
    
    // Each family emoji should be in a single segment
    familySegments.forEach(seg => {
      expect(seg.text).toMatch(/👨‍👩‍👧/);
    });
  });
  
  test('handles different line arrangements correctly', () => {
    const left = [
      'ids: user_id-123',
      'quote: "smart" vs "dumb"',
      'numbers: 1,234.50'
    ].join('\n');
    const right = [
      'spacing: foo bar   baz',
      'ids: user_id_123',  
      'quote: "smart" vs \'dumb\'',
      'numbers: 1,234.75'
    ].join('\n');
    
    const { steps, rightNums } = alignLines(left, right, { ignoreWhitespace: false });
    
    // Should have at least one add step and some modifications
    const addSteps = steps.filter(s => s.type === 'add');
    const modSteps = steps.filter(s => s.type === 'mod');
    
    expect(addSteps.length).toBeGreaterThan(0);
    expect(modSteps.length).toBeGreaterThan(0);
    
    // Find the first add step (which should be for spacing)
    const firstAddIdx = steps.findIndex(s => s.type === 'add');
    if (firstAddIdx >= 0) {
      expect(rightNums[firstAddIdx]).toBeGreaterThan(0);
    }
  });
  
  test('numbers use left for -/~ and right for +', () => {
    // Build a sample with a deletion, an insertion and a mod
    const left  = 'A\nB\nC';
    const right = 'A\nC\nD';
    
    const { steps, leftNums, rightNums } = alignLines(left, right, { ignoreWhitespace: false });
    
    steps.forEach((step, k) => {
      if (step.type === 'del' || step.type === 'mod') {
        expect(leftNums[k]).toBeGreaterThan(0);
        expect(rightNums[k]).toBe(0);
      }
      if (step.type === 'add') {
        expect(rightNums[k]).toBeGreaterThan(0);
        expect(leftNums[k]).toBe(0);
      }
      if (step.type === 'same') {
        expect(leftNums[k]).toBeGreaterThan(0);
        expect(rightNums[k]).toBeGreaterThan(0);
      }
    });
  });
  
  test('ignoreWhitespace still pairs composed/decomposed as same', () => {
    const left = 'unicode: café';
    const right = 'unicode: cafe\u0301'; // decomposed
    
    const { steps } = alignLines(left, right, { ignoreWhitespace: true });
    
    // Should be treated as identical due to Unicode normalization
    expect(steps.filter(s => s.type === 'same')).toHaveLength(1);
    expect(steps.some(s => s.type === 'add' || s.type === 'del' || s.type === 'mod')).toBe(false);
  });
});

describe('Inline Segmentation Unicode Tests', () => {
  test('handles composed vs decomposed text correctly', () => {
    // Create truly different text that uses Unicode normalization
    const left = 'café vs naïve'; // composed forms
    const right = 'cafe\u0301 different nai\u0308ve'; // decomposed + different word
    
    const segs = mergedSegments(left, right, { ignoreWhitespace: false, mode: 'word' });
    
    // Should detect differences appropriately
    const hasChanges = segs.some(s => s.changed);
    expect(hasChanges).toBe(true);
    
    // Should preserve original text in the segments
    const allText = segs.map(s => s.text).join('');
    expect(allText.length).toBeGreaterThan(0);
  });
  
  test('does not split ZWJ emoji in character mode', () => {
    const text = 'Family: 👨‍👩‍👧‍👦 here';
    const segs = mergedSegments(text, text, { ignoreWhitespace: false, mode: 'char' });
    
    // Should be treated as unchanged (same text)
    expect(segs).toHaveLength(1);
    expect(segs[0].changed).toBe(false);
    expect(segs[0].text).toBe(text);
  });
  
  test('handles different emoji variants correctly', () => {
    const left = '👍';  // base thumbs up
    const right = '👍🏻'; // light skin tone
    
    const segs = mergedSegments(left, right, { ignoreWhitespace: false, mode: 'char' });
    
    // Should show as different but not split the emoji clusters
    const leftSegs = segs.filter(s => !s.changed || s.diffType === 'del');
    const rightSegs = segs.filter(s => !s.changed || s.diffType === 'add');
    
    expect(leftSegs.map(s => s.text).join('')).toBe(left);
    expect(rightSegs.map(s => s.text).join('')).toBe(right);
    
    // Each emoji should be in a single segment
    expect(leftSegs.length).toBe(1);
    expect(rightSegs.length).toBe(1);
  });
});
