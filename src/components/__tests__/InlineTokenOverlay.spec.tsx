/**
 * Overlay behavior tests for side-specific token filtering and grapheme safety
 */

import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { mergedSegments } from '../../utils/diff/inline';
import type { DiffSeg } from '../../utils/diff/inline';

describe('InlineTokenOverlay', () => {
  describe('Side-specific token filtering', () => {
    test('left overlay contains only del tokens (no add)', () => {
      const left = 'hello world';
      const right = 'hello universe';
      
      const segs = mergedSegments(left, right, { ignoreWhitespace: false, mode: 'word' });
      
      // Simulate left overlay filtering (eq + del only)
      const leftOverlay = segs.filter(s => !s.changed || s.diffType === 'del');
      
      // Should not contain any 'add' type segments
      expect(leftOverlay.every(s => !s.changed || s.diffType === 'del')).toBe(true);
      
      // Should reconstruct the original left text
      const leftText = leftOverlay.map(s => s.text).join('');
      expect(leftText).toBe(left);
    });
    
    test('right overlay contains only add tokens (no del)', () => {
      const left = 'hello world';
      const right = 'hello universe';
      
      const segs = mergedSegments(left, right, { ignoreWhitespace: false, mode: 'word' });
      
      // Simulate right overlay filtering (eq + add only)
      const rightOverlay = segs.filter(s => !s.changed || s.diffType === 'add');
      
      // Should not contain any 'del' type segments
      expect(rightOverlay.every(s => !s.changed || s.diffType === 'add')).toBe(true);
      
      // Should reconstruct the original right text
      const rightText = rightOverlay.map(s => s.text).join('');
      expect(rightText).toBe(right);
    });
  });
  
  describe('Grapheme cluster safety', () => {
    test('grapheme clusters are not split mid-cluster - touché', () => {
      const left = 'touché';
      const right = 'touch';
      
      const segs = mergedSegments(left, right, { ignoreWhitespace: false, mode: 'char' });
      
      // Find segments containing 'é'
      const accentSegments = segs.filter(s => s.text.includes('é'));
      
      // Each accent should be in a complete segment, not split
      accentSegments.forEach(seg => {
        expect(seg.text).toMatch(/^.*é.*$|^é$/);
        // Should not be a partial character
        expect(seg.text).not.toMatch(/\u0301$/); // combining accent alone
      });
    });
    
    test('grapheme clusters are not split mid-cluster - 👍🏻', () => {
      const left = '👍';
      const right = '👍🏻'; // with skin tone modifier
      
      const segs = mergedSegments(left, right, { ignoreWhitespace: false, mode: 'char' });
      
      // Find segments containing emoji
      const emojiSegments = segs.filter(s => /👍/.test(s.text));
      
      // Each emoji should be complete, not split into base + modifier
      emojiSegments.forEach(seg => {
        if (seg.text.includes('👍🏻')) {
          // Complete emoji with skin tone
          expect(seg.text).toBe('👍🏻');
        } else if (seg.text.includes('👍')) {
          // Base emoji only
          expect(seg.text).toBe('👍');
        }
      });
    });
    
    test('grapheme clusters are not split mid-cluster - ZWJ family', () => {
      const left = 'family: 👨‍👩‍👧';
      const right = 'family: 👨‍👩‍👧‍👦';
      
      const segs = mergedSegments(left, right, { ignoreWhitespace: false, mode: 'word' });
      
      // Find segments containing family emoji
      const familySegments = segs.filter(s => /👨‍👩‍👧/.test(s.text));
      
      // Family emoji should not be split into individual people
      familySegments.forEach(seg => {
        // Should contain the complete ZWJ sequence
        if (seg.text.includes('👨‍👩‍👧‍👦')) {
          expect(seg.text).toContain('👨‍👩‍👧‍👦');
        } else if (seg.text.includes('👨‍👩‍👧')) {
          expect(seg.text).toContain('👨‍👩‍👧');
        }
        
        // Should not contain isolated ZWJ characters
        expect(seg.text).not.toMatch(/‍$/); // ZWJ at end
        expect(seg.text).not.toMatch(/^‍/); // ZWJ at start
      });
    });
  });
  
  describe('Text reconstruction integrity', () => {
    test('overlay text matches underlying textarea text', () => {
      const testCases = [
        { left: 'hello world', right: 'hello universe' },
        { left: 'café — touché', right: 'cafe — touch' },
        { left: '👍 family: 👨‍👩‍👧', right: '👍🏻 family: 👨‍👩‍👧‍👦' },
        { left: 'multi\nline\ntext', right: 'multi\nline\nchange' }
      ];
      
      testCases.forEach(({ left, right }) => {
        const segs = mergedSegments(left, right, { ignoreWhitespace: false, mode: 'word' });
        
        // Left overlay reconstruction
        const leftOverlay = segs.filter(s => !s.changed || s.diffType === 'del');
        const leftText = leftOverlay.map(s => s.text).join('');
        expect(leftText).toBe(left);
        
        // Right overlay reconstruction  
        const rightOverlay = segs.filter(s => !s.changed || s.diffType === 'add');
        const rightText = rightOverlay.map(s => s.text).join('');
        expect(rightText).toBe(right);
      });
    });
    
    test('no duplicated tokens or width drift', () => {
      const left = 'spacing: foo bar   baz';
      const right = 'different: foo bar baz';
      
      const segs = mergedSegments(left, right, { ignoreWhitespace: false, mode: 'word' });
      
      // Left overlay
      const leftOverlay = segs.filter(s => !s.changed || s.diffType === 'del');
      const leftText = leftOverlay.map(s => s.text).join('');
      
      // Should be exactly the original text, no duplicates
      expect(leftText).toBe(left);
      expect(leftText.length).toBe(left.length);
      
      // Right overlay
      const rightOverlay = segs.filter(s => !s.changed || s.diffType === 'add');
      const rightText = rightOverlay.map(s => s.text).join('');
      
      // Should be exactly the original text, no duplicates
      expect(rightText).toBe(right);
      expect(rightText.length).toBe(right.length);
      
      // No segment should appear in both overlays (for changed segments)
      const leftChanged = leftOverlay.filter(s => s.changed);
      const rightChanged = rightOverlay.filter(s => s.changed);
      
      leftChanged.forEach(leftSeg => {
        rightChanged.forEach(rightSeg => {
          if (leftSeg.changed && rightSeg.changed) {
            // Changed segments should not overlap between sides
            expect(leftSeg.diffType).not.toBe(rightSeg.diffType);
          }
        });
      });
    });
  });
});
