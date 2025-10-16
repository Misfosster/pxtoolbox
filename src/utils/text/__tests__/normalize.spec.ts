import { describe, expect, it } from 'vitest';
import { normalizePlaintext } from '../normalize';

describe('normalizePlaintext', () => {
  it('returns empty string for empty input', () => {
    expect(normalizePlaintext('')).toBe('');
  });

  it('preserves leading indentation and collapses interior spaces', () => {
    const input = '    foo   bar\n\tbaz    qux';
    const expected = '    foo bar\n\tbaz qux';
    expect(normalizePlaintext(input)).toBe(expected);
  });

  it('removes zero-width characters and trims trailing whitespace', () => {
    const input = 'foo\u200bbar  \nqux\t ';
    const expected = 'foobar\nqux';
    expect(normalizePlaintext(input)).toBe(expected);
  });

  it('collapses multiple blank lines into a single blank line', () => {
    const input = 'alpha\n\n\n\nbeta\n\n\ngamma';
    const expected = 'alpha\n\nbeta\n\ngamma';
    expect(normalizePlaintext(input)).toBe(expected);
  });

  it('is idempotent', () => {
    const input = 'foo\u200b  bar\n\n\nbaz   ';
    const once = normalizePlaintext(input);
    const twice = normalizePlaintext(once);
    expect(twice).toBe(once);
  });
});

