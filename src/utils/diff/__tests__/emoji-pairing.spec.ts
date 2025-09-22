/**
 * Specific tests for emoji pairing to ensure they show as modifications, not separate del/add
 */

import { describe, test, expect } from 'vitest';
import { alignLines } from '../line';

describe('Emoji Pairing Tests', () => {
  test('emoji skin tone variations should be paired as mod', () => {
    const left = 'emoji: 👍 + family: 👨‍👩‍👧';
    const right = 'emoji: 👍🏻 + family: 👨‍👩‍👧‍👦';
    
    const { steps } = alignLines(left, right, { ignoreWhitespace: false });
    
    console.log('Emoji pairing steps:', steps.map((s, i) => `${s.type}[${i}]`));
    
    // Should be a single mod step, not del+add
    expect(steps).toHaveLength(1);
    expect(steps[0].type).toBe('mod');
  });

  test('mixed emoji and text changes should be paired as mod', () => {
    const left = 'test: 👍 end';
    const right = 'test: 👍🏻 end';
    
    const { steps } = alignLines(left, right, { ignoreWhitespace: false });
    
    console.log('Mixed emoji steps:', steps.map((s, i) => `${s.type}[${i}]`));
    
    // Should be a single mod step
    expect(steps).toHaveLength(1);
    expect(steps[0].type).toBe('mod');
  });

  test('family emoji variations should be paired as mod', () => {
    const left = 'family: 👨‍👩‍👧';
    const right = 'family: 👨‍👩‍👧‍👦';
    
    const { steps } = alignLines(left, right, { ignoreWhitespace: false });
    
    console.log('Family emoji steps:', steps.map((s, i) => `${s.type}[${i}]`));
    
    // Should be a single mod step
    expect(steps).toHaveLength(1);
    expect(steps[0].type).toBe('mod');
  });

  test('multiple emoji lines should be properly aligned', () => {
    const left = `line1: normal text
emoji: 👍 + family: 👨‍👩‍👧
line3: more text`;

    const right = `line1: normal text
emoji: 👍🏻 + family: 👨‍👩‍👧‍👦
line3: more text`;

    const { steps } = alignLines(left, right, { ignoreWhitespace: false });
    
    console.log('Multiple lines with emoji:', steps.map((s, i) => `${s.type}[${i}]`));
    
    // Should have 3 steps: same, mod, same
    expect(steps).toHaveLength(3);
    expect(steps[0].type).toBe('same'); // line1
    expect(steps[1].type).toBe('mod');  // emoji line
    expect(steps[2].type).toBe('same'); // line3
  });

  test('different emoji should still be paired as mod if context is similar', () => {
    const left = 'reaction: 👍 good';
    const right = 'reaction: 👎 good';
    
    const { steps } = alignLines(left, right, { ignoreWhitespace: false });
    
    console.log('Different emoji steps:', steps.map((s, i) => `${s.type}[${i}]`));
    
    // Should be a single mod step due to similar context
    expect(steps).toHaveLength(1);
    expect(steps[0].type).toBe('mod');
  });
});
