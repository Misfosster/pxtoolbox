/**
 * Tests for grapheme-aware mergedSegments in character mode
 */

import { describe, test, expect } from 'vitest';
import { mergedSegments } from '../inline';

describe('Grapheme-Aware Inline Diffs', () => {
  test('emoji with skin tone modifier treated as single token', () => {
    const left = '👍';
    const right = '👍🏻';
    
    const segments = mergedSegments(left, right, { 
      ignoreWhitespace: false, 
      mode: 'char' 
    });
    
    // Should have del segment for original emoji and add segment for modified emoji
    const delSegments = segments.filter(s => s.changed && s.diffType === 'del');
    const addSegments = segments.filter(s => s.changed && s.diffType === 'add');
    
    expect(delSegments).toHaveLength(1);
    expect(addSegments).toHaveLength(1);
    
    expect(delSegments[0].text).toBe('👍');
    expect(addSegments[0].text).toBe('👍🏻');
    
    // Should not split the skin tone modifier emoji
    expect(addSegments[0].text).toHaveLength(4); // Complete emoji with skin tone
  });

  test('ZWJ family emoji treated as single token', () => {
    const left = '👨‍👩‍👧';
    const right = '👨‍👩‍👧‍👦';
    
    const segments = mergedSegments(left, right, { 
      ignoreWhitespace: false, 
      mode: 'char' 
    });
    
    const delSegments = segments.filter(s => s.changed && s.diffType === 'del');
    const addSegments = segments.filter(s => s.changed && s.diffType === 'add');
    
    expect(delSegments).toHaveLength(1);
    expect(addSegments).toHaveLength(1);
    
    // Should preserve complete ZWJ sequences
    expect(delSegments[0].text).toBe('👨‍👩‍👧');
    expect(addSegments[0].text).toBe('👨‍👩‍👧‍👦');
  });

  test('composed vs decomposed accents', () => {
    // NFC vs NFD café comparison
    const leftComposed = 'café'; // é is U+00E9 (composed)
    const rightDecomposed = 'cafe\u0301'; // e + U+0301 (decomposed)
    
    const segments = mergedSegments(leftComposed, rightDecomposed, { 
      ignoreWhitespace: false, 
      mode: 'char' 
    });
    
    // Due to NFC normalization, these should be treated as the same
    const changedSegments = segments.filter(s => s.changed);
    expect(changedSegments).toHaveLength(0); // Should be identical after normalization
    
    // All segments should be unchanged
    const unchangedSegments = segments.filter(s => !s.changed);
    expect(unchangedSegments.length).toBeGreaterThan(0);
  });

  test('mixed emoji and text with proper segmentation', () => {
    const left = 'Hello 👍 World';
    const right = 'Hello 👍🏻 World';
    
    const segments = mergedSegments(left, right, { 
      ignoreWhitespace: false, 
      mode: 'char' 
    });
    
    // Find the emoji-related segments
    const emojiDelSegment = segments.find(s => s.changed && s.diffType === 'del' && s.text.includes('👍'));
    const emojiAddSegment = segments.find(s => s.changed && s.diffType === 'add' && s.text.includes('👍'));
    
    expect(emojiDelSegment).toBeDefined();
    expect(emojiAddSegment).toBeDefined();
    
    expect(emojiDelSegment!.text).toBe('👍');
    expect(emojiAddSegment!.text).toBe('👍🏻');
    
    // Verify surrounding text is unchanged
    const helloSegment = segments.find(s => !s.changed && s.text === 'H');
    const spaceSegment = segments.find(s => !s.changed && s.text === ' ');
    const worldSegment = segments.find(s => !s.changed && s.text === 'W');
    
    expect(helloSegment).toBeDefined();
    expect(spaceSegment).toBeDefined();
    expect(worldSegment).toBeDefined();
  });

  test('word mode unchanged (no grapheme splitting)', () => {
    const left = 'hello 👍 world';
    const right = 'hello 👍🏻 world';
    
    const segments = mergedSegments(left, right, { 
      ignoreWhitespace: false, 
      mode: 'word' 
    });
    
    // In word mode, emojis should still be treated as separate "words"
    const changedSegments = segments.filter(s => s.changed);
    expect(changedSegments.length).toBeGreaterThan(0);
    
    // Verify word boundaries are respected
    const emojiSegments = segments.filter(s => s.text.includes('👍'));
    expect(emojiSegments.length).toBeGreaterThan(0);
  });

  test('complex grapheme clusters in character mode', () => {
    // Professional woman with skin tone
    const left = '👩‍💻';
    const right = '👩🏻‍💻';
    
    const segments = mergedSegments(left, right, { 
      ignoreWhitespace: false, 
      mode: 'char' 
    });
    
    const delSegments = segments.filter(s => s.changed && s.diffType === 'del');
    const addSegments = segments.filter(s => s.changed && s.diffType === 'add');
    
    expect(delSegments).toHaveLength(1);
    expect(addSegments).toHaveLength(1);
    
    // Should preserve complete ZWJ + skin tone sequences
    expect(delSegments[0].text).toBe('👩‍💻');
    expect(addSegments[0].text).toBe('👩🏻‍💻');
  });

  test('reconstruct original text correctly', () => {
    const left = 'Text with 👍🏻 emoji';
    const right = 'Text with 👍 emoji';
    
    const segments = mergedSegments(left, right, { 
      ignoreWhitespace: false, 
      mode: 'char' 
    });
    
    // Reconstruct left text from segments
    const leftOverlay = segments.filter(s => !s.changed || s.diffType === 'del');
    const reconstructedLeft = leftOverlay.map(s => s.text).join('');
    expect(reconstructedLeft).toBe(left);
    
    // Reconstruct right text from segments
    const rightOverlay = segments.filter(s => !s.changed || s.diffType === 'add');
    const reconstructedRight = rightOverlay.map(s => s.text).join('');
    expect(reconstructedRight).toBe(right);
  });
});
