/**
 * Test overlay text alignment with textarea content
 * 
 * Verifies the fix for overlay text divergence bug
 */

import { describe, test, expect } from 'vitest';
import { mergedSegments } from '../inline';

describe('Overlay Alignment Fix', () => {
  test('left overlay should only contain eq + del segments', () => {
    const left = "hello friend";
    const right = "hello mundo";
    
    const segs = mergedSegments(left, right, { ignoreWhitespace: false, mode: 'word' });
    
    // Filter as done in fixed overlay logic
    const leftOverlay = segs.filter(s => !s.changed || s.diffType === 'del');
    const rightOverlay = segs.filter(s => !s.changed || s.diffType === 'add');
    
    // Reconstruct text from segments
    const leftOverlayText = leftOverlay.map(s => s.text).join('');
    const rightOverlayText = rightOverlay.map(s => s.text).join('');
    
    // CRITICAL: overlay text must match original textarea content
    expect(leftOverlayText).toBe(left);
    expect(rightOverlayText).toBe(right);
    
    // Verify segment types
    const leftTypes = leftOverlay.map(s => s.changed ? s.diffType : 'eq');
    const rightTypes = rightOverlay.map(s => s.changed ? s.diffType : 'eq');
    
    // Left should not have any 'add' segments
    expect(leftTypes).not.toContain('add');
    // Right should not have any 'del' segments
    expect(rightTypes).not.toContain('del');
  });

  test('bazaz regression - no duplicate tokens', () => {
    const left = "bazaz";
    const right = "baz";
    
    const segs = mergedSegments(left, right, { ignoreWhitespace: false, mode: 'word' });
    
    // Apply overlay filtering
    const leftOverlay = segs.filter(s => !s.changed || s.diffType === 'del');
    const rightOverlay = segs.filter(s => !s.changed || s.diffType === 'add');
    
    // Text should match exactly
    const leftText = leftOverlay.map(s => s.text).join('');
    const rightText = rightOverlay.map(s => s.text).join('');
    
    expect(leftText).toBe("bazaz");
    expect(rightText).toBe("baz");
    
    // Should not have "baz" appearing twice in left overlay
    const leftTextParts = leftOverlay.map(s => s.text);
    const bazOccurrences = leftTextParts.filter(text => text === "baz").length;
    expect(bazOccurrences).toBeLessThanOrEqual(1);
  });

  test('complex mixed changes maintain text integrity', () => {
    const left = "The quick brown fox jumps";
    const right = "The slow red fox leaps";
    
    const segs = mergedSegments(left, right, { ignoreWhitespace: false, mode: 'word' });
    
    const leftOverlay = segs.filter(s => !s.changed || s.diffType === 'del');
    const rightOverlay = segs.filter(s => !s.changed || s.diffType === 'add');
    
    expect(leftOverlay.map(s => s.text).join('')).toBe(left);
    expect(rightOverlay.map(s => s.text).join('')).toBe(right);
    
    // Verify no cross-contamination
    const leftHasAdd = leftOverlay.some(s => s.diffType === 'add');
    const rightHasDel = rightOverlay.some(s => s.diffType === 'del');
    
    expect(leftHasAdd).toBe(false);
    expect(rightHasDel).toBe(false);
  });

  test('unicode safety with filtering', () => {
    const left = "Hello 👨‍👩‍👧‍👦 family";
    const right = "Hello 👨‍👩‍👧‍👦 group";
    
    const segs = mergedSegments(left, right, { ignoreWhitespace: false, mode: 'word' });
    
    const leftOverlay = segs.filter(s => !s.changed || s.diffType === 'del');
    const rightOverlay = segs.filter(s => !s.changed || s.diffType === 'add');
    
    const leftText = leftOverlay.map(s => s.text).join('');
    const rightText = rightOverlay.map(s => s.text).join('');
    
    expect(leftText).toBe(left);
    expect(rightText).toBe(right);
    
    // Verify emoji stays intact
    expect(leftText).toContain('👨‍👩‍👧‍👦');
    expect(rightText).toContain('👨‍👩‍👧‍👦');
  });

  test('empty and single character changes', () => {
    // Edge case: single character
    const segs1 = mergedSegments('a', 'b', { ignoreWhitespace: false, mode: 'char' });
    const left1 = segs1.filter(s => !s.changed || s.diffType === 'del');
    const right1 = segs1.filter(s => !s.changed || s.diffType === 'add');
    
    expect(left1.map(s => s.text).join('')).toBe('a');
    expect(right1.map(s => s.text).join('')).toBe('b');
    
    // Edge case: empty to text
    const segs2 = mergedSegments('', 'hello', { ignoreWhitespace: false, mode: 'word' });
    const left2 = segs2.filter(s => !s.changed || s.diffType === 'del');
    const right2 = segs2.filter(s => !s.changed || s.diffType === 'add');
    
    expect(left2.map(s => s.text).join('')).toBe('');
    expect(right2.map(s => s.text).join('')).toBe('hello');
  });
});
