import { describe, it, expect } from 'vitest';
import { normalizeEOL } from '../../diff/normalize';

describe('normalizeEOL', () => {
  it('normalizes CRLF/CR to LF', () => {
    expect(normalizeEOL('a\r\nb\rc')).toBe('a\nb\nc');
  });
});


