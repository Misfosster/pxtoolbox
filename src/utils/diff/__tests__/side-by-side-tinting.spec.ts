/**
 * Acceptance tests for side-by-side overlay tinting and enhanced pairing
 * 
 * Tests the canonical fixture: spacing deleted, ids/quote/numbers modified,
 * emoji differs by skin-tone, unicode NFC/NFD handling
 */

import { describe, test, expect } from 'vitest';
import { alignLines } from '../line';
import { mergedSegments } from '../inline';

describe('Side-by-Side Tinting and Enhanced Pairing', () => {
  // Canonical fixture as specified
  const leftCanonical = `hello friend
useRightHand
path/to/file-01.txt
version v2beta1 build 42
url: https://example.com/api?key=abc&flag=off
unicode: café — touché
emoji: 👍 + family: 👨‍👩‍👧
mixedScript: LatinРусскийMix
spacing: foo bar   baz
ids: user_id-123
quote: "smart" vs "dumb"
numbers: 1,234.50`;

  const rightCanonical = `hello friendo
useRightHands
path/to/file-02.txt
version v2beta2 build 43
url: https://example.com/api?key=abc&flag=on&new=1
unicode: café — touché
emoji: 👍🏻 + family: 👨‍👩‍👧‍👦
mixedScript: LatinРусскийMixX
ids: user_id_123
quote: "smart" vs 'dumb'
numbers: 1,234.75`;

  test('enhanced pairing prevents flooding after delete', () => {
    const { steps } = alignLines(leftCanonical, rightCanonical, { ignoreWhitespace: false });
    
    console.log('=== ENHANCED PAIRING STEPS ===');
    const leftLines = leftCanonical.split('\n');
    const rightLines = rightCanonical.split('\n');
    
    steps.forEach((step, i) => {
      if (step.type === 'add') {
        const rightLine = rightLines[(step as any).j];
        console.log(`ADD[${i}]: ${rightLine}`);
      } else if (step.type === 'del') {
        const leftLine = leftLines[(step as any).i];
        console.log(`DEL[${i}]: ${leftLine}`);
      } else if (step.type === 'mod') {
        const leftLine = leftLines[(step as any).i];
        const rightLine = rightLines[(step as any).j];
        console.log(`MOD[${i}]: ${leftLine} -> ${rightLine}`);
      } else if (step.type === 'same') {
        const leftLine = leftLines[(step as any).i];
        console.log(`SAME[${i}]: ${leftLine}`);
      }
    });

    // Should have exactly one deletion (spacing line)
    const delSteps = steps.filter(s => s.type === 'del');
    expect(delSteps).toHaveLength(1);
    
    // The spacing line should be deleted
    const spacingDelStep = delSteps.find((s, i) => {
      const leftLine = leftLines[(s as any).i];
      return leftLine?.includes('spacing:');
    });
    expect(spacingDelStep).toBeDefined();

    // After spacing delete, subsequent lines should be paired as mod, not whole-line add
    const spacingStepIdx = steps.findIndex(s => s.type === 'del' && 
      leftLines[(s as any).i]?.includes('spacing:'));
    
    if (spacingStepIdx >= 0) {
      const stepsAfterSpacing = steps.slice(spacingStepIdx + 1);
      
      // ids, quote, numbers should be mod (paired), not add
      const idsStep = stepsAfterSpacing.find((s, i) => {
        if (s.type === 'mod') {
          const rightLine = rightLines[(s as any).j];
          return rightLine?.includes('ids:');
        }
        return false;
      });
      expect(idsStep).toBeDefined();
      
      const quoteStep = stepsAfterSpacing.find((s, i) => {
        if (s.type === 'mod') {
          const rightLine = rightLines[(s as any).j];
          return rightLine?.includes('quote:');
        }
        return false;
      });
      expect(quoteStep).toBeDefined();
      
      const numbersStep = stepsAfterSpacing.find((s, i) => {
        if (s.type === 'mod') {
          const rightLine = rightLines[(s as any).j];
          return rightLine?.includes('numbers:');
        }
        return false;
      });
      expect(numbersStep).toBeDefined();
    }
  });

  test('line tint roles for side-by-side overlays', () => {
    const { steps } = alignLines(leftCanonical, rightCanonical, { ignoreWhitespace: false });
    const leftLines = leftCanonical.split('\n');
    const rightLines = rightCanonical.split('\n');
    
    // Build line roles as DiffViewerTool would
    const leftLineRoles: ('none' | 'add' | 'del')[] = new Array(leftLines.length).fill('none');
    const rightLineRoles: ('none' | 'add' | 'del')[] = new Array(rightLines.length).fill('none');
    
    for (const st of steps) {
      if (st.type === 'same') {
        // Line roles remain 'none' for same
      } else if (st.type === 'del') {
        const li = st.i as number;
        leftLineRoles[li] = 'del'; // Whole line del tint
      } else if (st.type === 'add') {
        const rj = st.j as number;
        rightLineRoles[rj] = 'add'; // Whole line add tint
      } else if (st.type === 'mod') {
        const li = st.i as number;
        const rj = st.j as number;
        leftLineRoles[li] = 'del'; // Left side gets del tint for mod
        rightLineRoles[rj] = 'add'; // Right side gets add tint for mod
      }
    }
    
    // Check specific expectations
    
    // spacing line: should be pure delete (left del, right unchanged)
    const spacingLeftIdx = leftLines.findIndex(line => line.includes('spacing:'));
    expect(spacingLeftIdx).toBeGreaterThanOrEqual(0);
    expect(leftLineRoles[spacingLeftIdx]).toBe('del');
    
    // ids line: should be mod (left del tint, right add tint)
    const idsLeftIdx = leftLines.findIndex(line => line.includes('ids:'));
    const idsRightIdx = rightLines.findIndex(line => line.includes('ids:'));
    if (idsLeftIdx >= 0 && idsRightIdx >= 0) {
      expect(leftLineRoles[idsLeftIdx]).toBe('del');
      expect(rightLineRoles[idsRightIdx]).toBe('add');
    }
    
    // quote line: should be mod (left del tint, right add tint)
    const quoteLeftIdx = leftLines.findIndex(line => line.includes('quote:'));
    const quoteRightIdx = rightLines.findIndex(line => line.includes('quote:'));
    if (quoteLeftIdx >= 0 && quoteRightIdx >= 0) {
      expect(leftLineRoles[quoteLeftIdx]).toBe('del');
      expect(rightLineRoles[quoteRightIdx]).toBe('add');
    }
    
    // numbers line: should be mod (left del tint, right add tint)
    const numbersLeftIdx = leftLines.findIndex(line => line.includes('numbers:'));
    const numbersRightIdx = rightLines.findIndex(line => line.includes('numbers:'));
    if (numbersLeftIdx >= 0 && numbersRightIdx >= 0) {
      expect(leftLineRoles[numbersLeftIdx]).toBe('del');
      expect(rightLineRoles[numbersRightIdx]).toBe('add');
    }
    
    // unicode line: should be same (no tint)
    const unicodeLeftIdx = leftLines.findIndex(line => line.includes('unicode:'));
    if (unicodeLeftIdx >= 0) {
      expect(leftLineRoles[unicodeLeftIdx]).toBe('none');
    }
  });

  test('token-level highlights within tinted mod lines', () => {
    // Test that mod lines have proper token filtering
    const idsLeft = 'ids: user_id-123';
    const idsRight = 'ids: user_id_123';
    
    const segs = mergedSegments(idsLeft, idsRight, { 
      ignoreWhitespace: false, 
      mode: 'word' 
    });
    
    // Left overlay should have eq + del tokens only
    const leftOverlay = segs.filter(s => !s.changed || s.diffType === 'del');
    const leftText = leftOverlay.map(s => s.text).join('');
    expect(leftText).toBe(idsLeft);
    
    // Right overlay should have eq + add tokens only
    const rightOverlay = segs.filter(s => !s.changed || s.diffType === 'add');
    const rightText = rightOverlay.map(s => s.text).join('');
    expect(rightText).toBe(idsRight);
    
    // Should have both unchanged and changed segments
    const unchangedSegs = segs.filter(s => !s.changed);
    const changedSegs = segs.filter(s => s.changed);
    
    expect(unchangedSegs.length).toBeGreaterThan(0); // Should have "ids: user_id" unchanged
    expect(changedSegs.length).toBeGreaterThan(0); // Should have "-123" vs "_123" changed
  });

  test('emoji handling with skin-tone differences', () => {
    const emojiLeft = 'emoji: 👍 + family: 👨‍👩‍👧';
    const emojiRight = 'emoji: 👍🏻 + family: 👨‍👩‍👧‍👦';
    
    const result = alignLines(emojiLeft, emojiRight, { ignoreWhitespace: false });
    
    // Should be mod (not del+add) due to high similarity
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].type).toBe('mod');
    
    // Test token-level segmentation
    const segs = mergedSegments(emojiLeft, emojiRight, { 
      ignoreWhitespace: false, 
      mode: 'char' 
    });
    
    // Should have segments for unchanged parts and changed emoji
    const changedSegs = segs.filter(s => s.changed);
    expect(changedSegs.length).toBeGreaterThan(0);
    
    // Unchanged parts like "emoji: " and " + family: " should remain
    const unchangedSegs = segs.filter(s => !s.changed);
    expect(unchangedSegs.length).toBeGreaterThan(0);
  });

  test('unicode NFC/NFD normalization consistency', () => {
    const unicodeLeft = 'unicode: café — touché';
    const unicodeRightNFD = 'unicode: cafe\u0301 — touche\u0301'; // decomposed
    
    const result = alignLines(unicodeLeft, unicodeRightNFD, { ignoreWhitespace: false });
    
    // Should be treated as same due to NFC normalization
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].type).toBe('same');
  });
});
