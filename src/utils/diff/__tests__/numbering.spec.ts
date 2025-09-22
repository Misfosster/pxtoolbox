/**
 * Tests for correct local numbering with two-cursor approach
 */

import { describe, test, expect } from 'vitest';
import { computeLocalNumbers } from '../numbering';

describe('Local Numbering Computation', () => {
  test('simple same/mod sequence', () => {
    const steps = [
      { type: 'same' as const, i: 0, j: 0 },
      { type: 'mod' as const, i: 1, j: 1 },
      { type: 'same' as const, i: 2, j: 2 },
    ];
    
    const { leftNums, rightNums } = computeLocalNumbers(steps);
    
    expect(leftNums).toEqual([1, 2, 3]);
    expect(rightNums).toEqual([1, 2, 3]);
  });

  test('insertion in middle', () => {
    const steps = [
      { type: 'same' as const, i: 0, j: 0 },
      { type: 'same' as const, i: 1, j: 1 },
      { type: 'add' as const, j: 2 }, // Insertion
      { type: 'same' as const, i: 2, j: 3 },
    ];
    
    const { leftNums, rightNums } = computeLocalNumbers(steps);
    
    expect(leftNums).toEqual([1, 2, 0, 4]); // No left number for addition, but unified numbering continues
    expect(rightNums).toEqual([1, 2, 3, 4]); // Right numbers continue incrementing
  });

  test('deletion in middle', () => {
    const steps = [
      { type: 'same' as const, i: 0, j: 0 },
      { type: 'same' as const, i: 1, j: 1 },
      { type: 'del' as const, i: 2 }, // Deletion
      { type: 'same' as const, i: 3, j: 2 },
    ];
    
    const { leftNums, rightNums } = computeLocalNumbers(steps);
    
    expect(leftNums).toEqual([1, 2, 3, 4]); // Left numbers continue incrementing
    expect(rightNums).toEqual([1, 2, 0, 3]); // No right number for deletion
  });

  test('canonical spacing insertion example', () => {
    // Simulates: hello(same) -> useRight(mod) -> path(mod) -> version(mod) -> 
    // url(mod) -> unicode(same) -> emoji(mod) -> mixedScript(mod) -> 
    // spacing(add) -> ids(mod) -> quote(mod) -> numbers(mod)
    const steps = [
      { type: 'mod' as const, i: 0, j: 0 },   // hello
      { type: 'mod' as const, i: 1, j: 1 },   // useRight
      { type: 'mod' as const, i: 2, j: 2 },   // path
      { type: 'mod' as const, i: 3, j: 3 },   // version
      { type: 'mod' as const, i: 4, j: 4 },   // url
      { type: 'same' as const, i: 5, j: 5 },  // unicode
      { type: 'mod' as const, i: 6, j: 6 },   // emoji
      { type: 'mod' as const, i: 7, j: 7 },   // mixedScript
      { type: 'add' as const, j: 8 },         // spacing insertion
      { type: 'mod' as const, i: 8, j: 9 },   // ids
      { type: 'mod' as const, i: 9, j: 10 },  // quote
      { type: 'mod' as const, i: 10, j: 11 }, // numbers
    ];
    
    const { leftNums, rightNums } = computeLocalNumbers(steps);
    
    // Left numbers: 1-12 with unified display numbering
    expect(leftNums).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0, 10, 11, 12]);
    
    // Right numbers: 1-12 (insertion at position 9)
    expect(rightNums).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    
    // Verify spacing shows right number 9
    const spacingStepIdx = steps.findIndex(s => s.type === 'add');
    expect(rightNums[spacingStepIdx]).toBe(9);
    expect(leftNums[spacingStepIdx]).toBe(0);
  });

  test('multiple insertions and deletions', () => {
    const steps = [
      { type: 'same' as const, i: 0, j: 0 },
      { type: 'del' as const, i: 1 },
      { type: 'add' as const, j: 1 },
      { type: 'add' as const, j: 2 },
      { type: 'same' as const, i: 2, j: 3 },
      { type: 'del' as const, i: 3 },
      { type: 'same' as const, i: 4, j: 4 },
    ];
    
    const { leftNums, rightNums } = computeLocalNumbers(steps);
    
    expect(leftNums).toEqual([1, 2, 0, 0, 5, 6, 7]); // Unified numbering after double insertion
    expect(rightNums).toEqual([1, 0, 2, 3, 4, 0, 5]);
    
    // Verify no duplicate numbers on either side
    const leftNonZero = leftNums.filter(n => n > 0);
    const rightNonZero = rightNums.filter(n => n > 0);
    
    expect(new Set(leftNonZero).size).toBe(leftNonZero.length); // No duplicates
    expect(new Set(rightNonZero).size).toBe(rightNonZero.length); // No duplicates
  });

  test('empty steps array', () => {
    const { leftNums, rightNums } = computeLocalNumbers([]);
    expect(leftNums).toEqual([]);
    expect(rightNums).toEqual([]);
  });

  test('all deletions', () => {
    const steps = [
      { type: 'del' as const, i: 0 },
      { type: 'del' as const, i: 1 },
      { type: 'del' as const, i: 2 },
    ];
    
    const { leftNums, rightNums } = computeLocalNumbers(steps);
    
    expect(leftNums).toEqual([1, 2, 3]);
    expect(rightNums).toEqual([0, 0, 0]);
  });

  test('all additions', () => {
    const steps = [
      { type: 'add' as const, j: 0 },
      { type: 'add' as const, j: 1 },
      { type: 'add' as const, j: 2 },
    ];
    
    const { leftNums, rightNums } = computeLocalNumbers(steps);
    
    expect(leftNums).toEqual([0, 0, 0]);
    expect(rightNums).toEqual([1, 2, 3]);
  });
});
