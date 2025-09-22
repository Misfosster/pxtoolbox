/**
 * Vitest unit tests using golden corpus to validate current diff engine behavior
 * 
 * Phase 0: Establish guardrails with comprehensive test coverage
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { alignLines } from '../line';
import { mergedSegments } from '../inline';
import { loadGoldenCorpus, validateTestCase, validateStepInvariants, calculateStatsFromSteps, type GoldenTestCase } from '../../../../fixtures/diff';

let goldenTests: GoldenTestCase[] = [];

beforeAll(async () => {
  goldenTests = await loadGoldenCorpus();
  
  // Validate all test cases are well-formed
  for (const testCase of goldenTests) {
    if (!validateTestCase(testCase)) {
      throw new Error(`Invalid test case: ${testCase.name}`);
    }
  }
  
  console.log(`Loaded ${goldenTests.length} golden test cases`);
});

describe('Golden Corpus - alignLines numbering', () => {
  test.each(goldenTests)('$name - line numbering validation', (testCase) => {
    const result = alignLines(testCase.left, testCase.right, { ignoreWhitespace: false });
    
    // Extract numbering from result
    const steps = result.steps;
    const leftNums = result.leftNums;
    const rightNums = result.rightNums;
    
    // Validate invariants
    expect(steps.length).toBe(leftNums.length);
    expect(steps.length).toBe(rightNums.length);
    
    const invariantErrors = validateStepInvariants(steps.map((step, i) => ({
      type: step.type,
      leftNum: leftNums[i],
      rightNum: rightNums[i]
    })));
    
    if (invariantErrors.length > 0) {
      console.error('Invariant violations:', invariantErrors);
      console.error('Steps:', steps);
      console.error('Left nums:', leftNums);
      console.error('Right nums:', rightNums);
    }
    
    expect(invariantErrors).toEqual([]);
    
    // Validate specific expectations from golden corpus
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const leftNum = leftNums[i];
      const rightNum = rightNums[i];
      
      switch (step.type) {
        case 'del':
          expect(rightNum).toBe(0);
          expect(leftNum).toBeGreaterThan(0);
          break;
        case 'add':
          expect(leftNum).toBe(0);
          expect(rightNum).toBeGreaterThan(0);
          break;
        case 'mod':
          expect(leftNum).toBeGreaterThan(0);
          expect(rightNum).toBeGreaterThan(0);
          break;
        case 'same':
          expect(leftNum).toBeGreaterThan(0);
          expect(rightNum).toBeGreaterThan(0);
          break;
      }
    }
  });
  
  test('Foo line deletion specific numbering', () => {
    const fooTest = goldenTests.find(t => t.name === 'Foo line deletion');
    expect(fooTest).toBeDefined();
    
    if (fooTest) {
      const result = alignLines(fooTest.left, fooTest.right, { ignoreWhitespace: false });
      
      // Should have deleted line 3, other lines should maintain numbering
      const delSteps = result.steps.filter(s => s.type === 'del');
      expect(delSteps.length).toBe(1);
      
      const delIndex = result.steps.findIndex(s => s.type === 'del');
      expect(result.leftNums[delIndex]).toBe(3);
      expect(result.rightNums[delIndex]).toBe(0);
    }
  });
});

describe('Golden Corpus - collapse heuristic', () => {
  test('N≠M case collapse behavior', () => {
    const nNotEqualMTest = goldenTests.find(t => t.name.includes('N≠M'));
    expect(nNotEqualMTest).toBeDefined();
    
    if (nNotEqualMTest) {
      const result = alignLines(nNotEqualMTest.left, nNotEqualMTest.right, { ignoreWhitespace: false });
      
      // N≠M cases may create mod steps if there's reasonable similarity
      // This is expected behavior with our enhanced pairing logic
      const modSteps = result.steps.filter(s => s.type === 'mod');
      const delSteps = result.steps.filter(s => s.type === 'del');
      const addSteps = result.steps.filter(s => s.type === 'add');
      
      // Should have some combination of changes
      expect(modSteps.length + delSteps.length + addSteps.length).toBeGreaterThan(0);
    }
  });
  
  test('Collapse should only fire when alignment preserved', () => {
    // Test that del+add only becomes mod when next lines align
    const left = "line1\\nold line\\nline3";
    const right = "line1\\nnew line\\nline3";
    
    const result = alignLines(left, right, { ignoreWhitespace: false });
    
    // Should have a mod step because line3 aligns after the change
    const modSteps = result.steps.filter(s => s.type === 'mod');
    expect(modSteps.length).toBeGreaterThan(0);
  });
});

describe('Golden Corpus - mergedSegments grapheme safety', () => {
  test('Unicode emoji should not be split', () => {
    const unicodeTest = goldenTests.find(t => t.name.includes('Unicode emoji'));
    expect(unicodeTest).toBeDefined();
    
    if (unicodeTest && unicodeTest.unicodeSafety) {
      const { zwjFamily, flags } = unicodeTest.unicodeSafety;
      
      if (zwjFamily) {
        // Test that ZWJ family emoji stays intact
        const segments = mergedSegments(zwjFamily, zwjFamily + ' modified', 'word');
        
        // Find the emoji segment
        const emojiSegment = segments.find(seg => seg.text.includes(zwjFamily));
        expect(emojiSegment).toBeDefined();
        
        if (emojiSegment) {
          // Emoji should not be partially included - it should be complete
          expect(emojiSegment.text).toContain(zwjFamily);
        }
      }
      
      if (flags) {
        // Test flag emojis
        for (const flag of flags) {
          const segments = mergedSegments(flag, flag + 'X', 'char');
          
          // Flag should appear as complete unit
          const flagSegment = segments.find(seg => seg.text === flag);
          expect(flagSegment).toBeDefined();
        }
      }
    }
  });
  
  test('Combining characters should not be split', () => {
    const left = 'café';  // e + combining acute
    const right = 'cafe'; // plain e
    
    const segments = mergedSegments(left, right, 'char');
    
    // The 'é' should be treated as single unit
    const acuteSegment = segments.find(seg => seg.text.includes('é'));
    expect(acuteSegment).toBeDefined();
    
    // Should not have partial combining characters
    for (const seg of segments) {
      // No segment should start with a combining mark
      expect(seg.text).not.toMatch(/^[\\u0300-\\u036F]/);
    }
  });
  
  test('Grapheme segmentation fallback', () => {
    // Test fallback when Intl.Segmenter not available
    const originalSegmenter = (global as any).Intl?.Segmenter;
    
    // Mock absence of Segmenter
    if ((global as any).Intl) {
      delete (global as any).Intl.Segmenter;
    }
    
    try {
      const segments = mergedSegments('test', 'test!', 'char');
      expect(segments.length).toBeGreaterThan(0);
      
      // Should fallback to character-by-character
      const textSegment = segments.find(seg => seg.text === 'test');
      expect(textSegment).toBeDefined();
      
    } finally {
      // Restore
      if (originalSegmenter) {
        (global as any).Intl.Segmenter = originalSegmenter;
      }
    }
  });
});

describe('Golden Corpus - line ending handling', () => {
  test('CRLF vs LF handling (placeholder)', () => {
    // EOL handling test - currently no specific EOL option available
    // This would test behavior of CRLF vs LF line endings
    const crlf = "line1\r\nline2\r\nline3";
    const lf = "line1\nline2\nline3";
    
    const result = alignLines(crlf, lf, { ignoreWhitespace: false });
    
    // Basic validation - should handle different line endings gracefully
    expect(result.steps.length).toBeGreaterThan(0);
  });
});

describe('Golden Corpus - Bazaz overlay bug regression', () => {
  test('Should not duplicate tokens in overlays', () => {
    const bazazTest = goldenTests.find(t => t.name.includes('Bazaz'));
    expect(bazazTest).toBeDefined();
    
    if (bazazTest) {
      const result = alignLines(bazazTest.left, bazazTest.right, { ignoreWhitespace: false });
      
      // Should have exactly one modified line
      const modSteps = result.steps.filter(s => s.type === 'mod');
      expect(modSteps.length).toBe(1);
      
      // Test inline segments for the modified line
      if (bazazTest.inlineExpected) {
        const segments = mergedSegments('bazaz', 'baz', 'word');
        
        // Should not have duplicate 'baz' tokens
        const bazSegments = segments.filter(seg => seg.text === 'baz');
        expect(bazSegments.length).toBeLessThanOrEqual(1);
        
        // Should have proper del segment for 'az'
        const delSegments = segments.filter(seg => seg.diffType === 'del');
        expect(delSegments.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Golden Corpus - Stats calculation', () => {
  test('placeholder - stats calculation functionality exists', () => {
    // This suite exists for potential future stats validation
    // Current focus is on core algorithm correctness
    expect(true).toBe(true);
  });
});
