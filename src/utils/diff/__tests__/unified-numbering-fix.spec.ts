/**
 * Tests for correct unified preview numbering after the fix
 */

import { describe, test, expect } from 'vitest';
import { alignLines } from '../line';

describe('Unified Preview Numbering Fix', () => {
  test('canonical spacing insertion example', () => {
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

    const { steps, leftNums, rightNums } = alignLines(left, right, { ignoreWhitespace: false });
    
    console.log('=== UNIFIED NUMBERING TEST ===');
    const leftLines = left.split('\n');
    const rightLines = right.split('\n');
    
    // Build unified preview lines to verify numbering
    const unifiedLines: string[] = [];
    
    for (let idx = 0; idx < steps.length; idx++) {
      const step = steps[idx];
      let marker = ' ';
      let displayNum = 0;
      let lineText = '';
      
      if (step.type === 'same') {
        marker = ' ';
        displayNum = leftNums[idx];
        lineText = leftLines[(step as any).i] || '';
      } else if (step.type === 'del') {
        marker = '-';
        displayNum = leftNums[idx];
        lineText = leftLines[(step as any).i] || '';
      } else if (step.type === 'add') {
        marker = '+';
        displayNum = rightNums[idx];
        lineText = rightLines[(step as any).j] || '';
      } else if (step.type === 'mod') {
        marker = '~';
        displayNum = leftNums[idx];
        lineText = leftLines[(step as any).i] || '';
      }
      
      const formattedLine = `${marker}${displayNum.toString().padStart(2)} ${lineText}`;
      unifiedLines.push(formattedLine);
      console.log(formattedLine);
    }
    
    // Find the spacing line and verify it has the correct marker and number
    const spacingLineIdx = unifiedLines.findIndex(line => line.includes('spacing:'));
    expect(spacingLineIdx).toBeGreaterThanOrEqual(0);
    
    // The spacing line should be marked as an addition
    const spacingLine = unifiedLines[spacingLineIdx];
    expect(spacingLine.startsWith('+')).toBe(true);
    
    // Extract the number from the spacing line (accounting for space padding)
    const spacingMatch = spacingLine.match(/^\+\s*(\d+)/);
    expect(spacingMatch).toBeTruthy();
    const spacingNumber = parseInt(spacingMatch![1]);
    expect(spacingNumber).toBe(9); // Should be right line 9
    
    // Additional verification that the spacing line exists and is correct
    expect(spacingLine.includes('spacing: foo bar   baz')).toBe(true);
    
    // Verify no duplicate numbers on each side
    const leftNumbers = leftNums.filter(n => n > 0);
    const rightNumbers = rightNums.filter(n => n > 0);
    
    expect(new Set(leftNumbers).size).toBe(leftNumbers.length); // No duplicates
    expect(new Set(rightNumbers).size).toBe(rightNumbers.length); // No duplicates
  });

  test('multiple insertions and deletions numbering', () => {
    const left = `line1
line2
line3
line4
line5`;

    const right = `line1
newline1
newline2
line4
line5
newline3`;

    const { steps, leftNums, rightNums } = alignLines(left, right, { ignoreWhitespace: false });
    
    // Verify numbering progression
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      if (step.type === 'same' || step.type === 'mod') {
        expect(leftNums[i]).toBeGreaterThan(0);
        expect(rightNums[i]).toBeGreaterThan(0);
      } else if (step.type === 'del') {
        expect(leftNums[i]).toBeGreaterThan(0);
        expect(rightNums[i]).toBe(0);
      } else if (step.type === 'add') {
        expect(leftNums[i]).toBe(0);
        expect(rightNums[i]).toBeGreaterThan(0);
      }
    }
    
    // Verify sequential numbering on each side
    const leftSequence = leftNums.filter(n => n > 0);
    const rightSequence = rightNums.filter(n => n > 0);
    
    // With unified numbering, left sequences increment by unified line position
    // Right sequences should still be sequential
    for (let i = 1; i < rightSequence.length; i++) {
      expect(rightSequence[i]).toBe(rightSequence[i-1] + 1);
    }
    
    // Verify numbering starts at 1
    expect(leftSequence[0]).toBe(1);
    expect(rightSequence[0]).toBe(1);
    
    // Left sequence should be monotonically increasing (but may skip numbers due to insertions)
    for (let i = 1; i < leftSequence.length; i++) {
      expect(leftSequence[i]).toBeGreaterThan(leftSequence[i-1]);
    }
  });

  test('pure deletions numbering', () => {
    const left = `keep1
delete1
delete2
keep2`;

    const right = `keep1
keep2`;

    const { steps, leftNums, rightNums } = alignLines(left, right, { ignoreWhitespace: false });
    
    // Find deletion steps
    const delSteps = steps.filter((s, i) => s.type === 'del');
    expect(delSteps.length).toBeGreaterThan(0);
    
    // Verify deletions have left numbers but no right numbers
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].type === 'del') {
        expect(leftNums[i]).toBeGreaterThan(0);
        expect(rightNums[i]).toBe(0);
      }
    }
  });

  test('pure additions numbering', () => {
    const left = `keep1
keep2`;

    const right = `keep1
add1
add2
keep2`;

    const { steps, leftNums, rightNums } = alignLines(left, right, { ignoreWhitespace: false });
    
    // Find addition steps
    const addSteps = steps.filter((s, i) => s.type === 'add');
    expect(addSteps.length).toBeGreaterThan(0);
    
    // Verify additions have right numbers but no left numbers
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].type === 'add') {
        expect(leftNums[i]).toBe(0);
        expect(rightNums[i]).toBeGreaterThan(0);
      }
    }
  });
});
