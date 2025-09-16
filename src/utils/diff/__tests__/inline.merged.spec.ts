import { describe, it, expect } from 'vitest';
import { mergedSegments } from '../../diff/inline';

function text(segs: ReturnType<typeof mergedSegments>) {
  return segs.map(s => `${s.changed ? (s.diffType === 'add' ? '+' : '-') : '='}${s.text}`).join('');
}

describe('mergedSegments', () => {
  it('smart mode: small in-word change stays paired with char detail', () => {
    const segs = mergedSegments('friend', 'friendo', { ignoreWhitespace: false, mode: 'smart' });
    const out = text(segs);
    expect(out).toContain('=friend');
    expect(out).toContain('+o'); // tiny add highlighted
  });

  it('char mode: splits by character', () => {
    const segs = mergedSegments('abc', 'axbc', { ignoreWhitespace: false, mode: 'char' });
    expect(text(segs)).toContain('+x');
  });

  it('whitespace: runs treated as equal when ignoring', () => {
    const segs = mergedSegments('foo    bar', 'foo bar', { ignoreWhitespace: true, mode: 'smart' });
    // no '-' or '+' for spaces
    expect(segs.find(s => s.changed && /^\s+$/.test(s.text))).toBeFalsy();
  });
});


