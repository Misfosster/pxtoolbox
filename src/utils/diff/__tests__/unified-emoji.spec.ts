/**
 * Test that unified preview shows emoji changes as modifications, not del+add
 */

import { describe, test, expect } from 'vitest';
import { alignLines } from '../line';

describe('Unified Preview Emoji Handling', () => {
  test('unified preview should show emoji changes as single mod step', () => {
    const left = `hello friend
emoji: 👍 + family: 👨‍👩‍👧
end line`;

    const right = `hello friend
emoji: 👍🏻 + family: 👨‍👩‍👧‍👦
end line`;

    const { steps } = alignLines(left, right, { ignoreWhitespace: false });
    
    console.log('Unified preview emoji steps:', steps.map((s, i) => `${s.type}[${i}]`));
    
    // Should have 3 steps: same, mod, same
    expect(steps).toHaveLength(3);
    expect(steps[0].type).toBe('same'); // hello friend
    expect(steps[1].type).toBe('mod');  // emoji line - should be mod, not del+add
    expect(steps[2].type).toBe('same'); // end line
    
    // Specifically check that there's no separate del and add for emoji
    const delSteps = steps.filter(s => s.type === 'del');
    const addSteps = steps.filter(s => s.type === 'add');
    expect(delSteps).toHaveLength(0); // No deletions
    expect(addSteps).toHaveLength(0); // No additions
  });

  test('unified preview with canonical emoji example should show mod', () => {
    const left = `unicode: café — touché
emoji: 👍 + family: 👨‍👩‍👧
mixedScript: LatinРусскийMix`;

    const right = `unicode: café — touché
emoji: 👍🏻 + family: 👨‍👩‍👧‍👦
mixedScript: LatinРусскийMixX`;

    const { steps } = alignLines(left, right, { ignoreWhitespace: false });
    
    console.log('Canonical emoji unified steps:', steps.map((s, i) => `${s.type}[${i}]`));
    
    // Should have: same, mod, mod
    expect(steps).toHaveLength(3);
    expect(steps[0].type).toBe('same'); // unicode (identical)
    expect(steps[1].type).toBe('mod');  // emoji (should be mod)
    expect(steps[2].type).toBe('mod');  // mixedScript (should be mod)
    
    // Verify no del+add pairs for emoji
    let hasDelAddPair = false;
    for (let i = 0; i < steps.length - 1; i++) {
      if (steps[i].type === 'del' && steps[i + 1].type === 'add') {
        hasDelAddPair = true;
        break;
      }
    }
    expect(hasDelAddPair).toBe(false);
  });
});
