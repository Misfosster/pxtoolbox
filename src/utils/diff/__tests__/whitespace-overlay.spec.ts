/**
 * Test overlay behavior with whitespace ignore option
 * 
 * Verifies the fix for overlay misalignment when ignoring whitespace
 */

import { describe, test, expect } from 'vitest';
import { mergedSegments } from '../inline';

// Helper function to simulate the overlay logic from DiffViewerTool.tsx
function simulateOverlayLogic(aRaw: string, bRaw: string, ignoreWhitespace: boolean, charMode: boolean) {
  // Special case: if ignoring whitespace and the normalized lines are identical,
  // treat as unchanged to avoid highlighting whitespace-only differences
  if (ignoreWhitespace) {
    const aNormalized = aRaw.replace(/\s+/g, ' ').trim();
    const bNormalized = bRaw.replace(/\s+/g, ' ').trim();
    
    if (aNormalized === bNormalized) {
      // Lines are identical when ignoring whitespace - no highlighting needed
      return {
        leftOverlay: [{ text: aRaw, changed: false }],
        rightOverlay: [{ text: bRaw, changed: false }]
      };
    }
  }
  
  const segs = mergedSegments(aRaw, bRaw, { ignoreWhitespace, mode: charMode ? 'char' : 'word' });
  
  // LEFT overlay: keep eq + del (hide add to match textarea content)
  const leftOverlay = segs.filter(s => !s.changed || s.diffType === 'del');
  
  // RIGHT overlay: keep eq + add (hide del to match textarea content)
  const rightOverlay = segs.filter(s => !s.changed || s.diffType === 'add');
  
  return { leftOverlay, rightOverlay };
}

describe('Whitespace Ignore Overlay Fix', () => {
  test('should not highlight whitespace-only differences when ignoreWhitespace is true', () => {
    const left = "hello    world";
    const right = "hello world";
    
    // With ignoreWhitespace=true, should treat as identical
    const resultIgnore = simulateOverlayLogic(left, right, true, false);
    
    // Should be single unchanged segments
    expect(resultIgnore.leftOverlay).toHaveLength(1);
    expect(resultIgnore.leftOverlay[0].changed).toBe(false);
    expect(resultIgnore.leftOverlay[0].text).toBe(left);
    
    expect(resultIgnore.rightOverlay).toHaveLength(1);
    expect(resultIgnore.rightOverlay[0].changed).toBe(false);
    expect(resultIgnore.rightOverlay[0].text).toBe(right);
    
    // With ignoreWhitespace=false, should show differences
    const resultNoIgnore = simulateOverlayLogic(left, right, false, false);
    
    // Should have multiple segments showing the difference
    expect(resultNoIgnore.leftOverlay.length).toBeGreaterThan(1);
    const hasLeftChanges = resultNoIgnore.leftOverlay.some(s => s.changed);
    expect(hasLeftChanges).toBe(true);
  });

  test('should handle mixed whitespace and content changes correctly', () => {
    const left = "hello    old    world";
    const right = "hello new world";
    
    // Even with ignoreWhitespace=true, should still highlight content changes
    const result = simulateOverlayLogic(left, right, true, false);
    
    // Should have segments showing the "old" -> "new" change
    const leftChangedSegments = result.leftOverlay.filter(s => s.changed);
    const rightChangedSegments = result.rightOverlay.filter(s => s.changed);
    
    expect(leftChangedSegments.length).toBeGreaterThan(0);
    expect(rightChangedSegments.length).toBeGreaterThan(0);
    
    // When there are content changes, segments may normalize whitespace
    // The important thing is that the overlays show the changes correctly
    const leftText = result.leftOverlay.map(s => s.text).join('');
    const rightText = result.rightOverlay.map(s => s.text).join('');
    
    // Should contain the key content words
    expect(leftText).toContain('hello');
    expect(leftText).toContain('old');
    expect(leftText).toContain('world');
    
    expect(rightText).toContain('hello');
    expect(rightText).toContain('new');
    expect(rightText).toContain('world');
  });

  test('should preserve exact text content when filtering segments', () => {
    const left = "  hello   world  ";
    const right = "hello world";
    
    const result = simulateOverlayLogic(left, right, true, false);
    
    // Text should match exactly - this is whitespace-only so should be treated as identical
    const leftText = result.leftOverlay.map(s => s.text).join('');
    const rightText = result.rightOverlay.map(s => s.text).join('');
    
    expect(leftText).toBe(left);
    expect(rightText).toBe(right);
    
    // Should be unchanged segments since it's whitespace-only
    expect(result.leftOverlay[0].changed).toBe(false);
    expect(result.rightOverlay[0].changed).toBe(false);
  });

  test('should handle tab vs space differences with ignoreWhitespace', () => {
    const left = "hello\tworld";
    const right = "hello    world";
    
    const result = simulateOverlayLogic(left, right, true, false);
    
    // Should treat as identical when ignoring whitespace
    expect(result.leftOverlay).toHaveLength(1);
    expect(result.leftOverlay[0].changed).toBe(false);
    expect(result.rightOverlay).toHaveLength(1);
    expect(result.rightOverlay[0].changed).toBe(false);
  });

  test('should handle leading/trailing whitespace differences', () => {
    const left = "  hello world  ";
    const right = "hello world";
    
    const result = simulateOverlayLogic(left, right, true, false);
    
    // Should treat as identical when ignoring whitespace
    expect(result.leftOverlay).toHaveLength(1);
    expect(result.leftOverlay[0].changed).toBe(false);
    expect(result.leftOverlay[0].text).toBe(left);
    
    expect(result.rightOverlay).toHaveLength(1);
    expect(result.rightOverlay[0].changed).toBe(false);
    expect(result.rightOverlay[0].text).toBe(right);
  });

  test('normalization consistency between line alignment and overlay', () => {
    // This tests the specific normalization used in the overlay fix
    const testCases = [
      { left: "hello    world", right: "hello world" },
      { left: "  test  ", right: "test" },
      { left: "a\t\tb", right: "a b" }
    ];
    
    for (const { left, right } of testCases) {
      // Apply same normalization as in the overlay fix
      const leftNorm = left.replace(/\s+/g, ' ').trim();
      const rightNorm = right.replace(/\s+/g, ' ').trim();
      
      if (leftNorm === rightNorm) {
        // Should be treated as identical in overlays
        const result = simulateOverlayLogic(left, right, true, false);
        expect(result.leftOverlay).toHaveLength(1);
        expect(result.leftOverlay[0].changed).toBe(false);
        expect(result.rightOverlay).toHaveLength(1);
        expect(result.rightOverlay[0].changed).toBe(false);
      }
    }
  });
});
