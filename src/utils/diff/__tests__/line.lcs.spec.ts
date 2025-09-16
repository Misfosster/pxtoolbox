import { describe, it, expect } from 'vitest';
import { lcsLineDiff } from '../../diff/line';

const lines = (s: string) => s.split('\n');

describe('lcsLineDiff (pairing & stability)', () => {
  it('single deleted line is one deletion (no cascade)', () => {
    const a = ['A','DELETE_ME','B','C'].join('\n');
    const b = ['A','B','C'].join('\n');
    const out = lcsLineDiff(a, b, { ignoreWhitespace: false });
    const L = lines(out);

    // exactly one deletion
    expect(L.filter(l => l.startsWith('- '))).toHaveLength(1);
    expect(L).toContain('- DELETE_ME');

    // surrounding lines are unchanged
    expect(L).toContain('  A');
    expect(L).toContain('  B');
    expect(L).toContain('  C');
  });

  it('treats replace as modify pair (- then +) when both sides have content', () => {
    const a = ['A','old','C'].join('\n');
    const b = ['A','new','C'].join('\n');
    const L = lines(lcsLineDiff(a, b, { ignoreWhitespace: false }));
    const iDel = L.indexOf('- old');
    const iAdd = L.indexOf('+ new');
    expect(iDel).toBeGreaterThan(-1);
    expect(iAdd).toBe(iDel + 1);
  });

  it('ignores whitespace when requested', () => {
    const a = 'foo    bar';
    const b = 'foo bar';
    const L = lines(lcsLineDiff(a, b, { ignoreWhitespace: true }));
    expect(L).toEqual(['  foo    bar']); // kept as same after normalization
  });

  it('respects unicode/combining chars without splitting lines', () => {
    const a = 'café — touché';
    const b = 'café — touché';
    const L = lines(lcsLineDiff(a, b, { ignoreWhitespace: false }));
    expect(L).toEqual(['  café — touché']);
  });
});


