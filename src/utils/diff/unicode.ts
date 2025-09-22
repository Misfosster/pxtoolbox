/**
 * Unicode-safe utilities for consistent text comparison and normalization
 * 
 * Ensures all diff operations use the same normalization strategy:
 * - NFC normalization for consistent composed/decomposed handling
 * - Optional whitespace normalization
 * - Grapheme cluster tokenization for proper emoji/accent handling
 */

export type CompareOpts = { ignoreWhitespace?: boolean };

/**
 * Create a consistent comparison key for text
 * Used by both line alignment and inline tokenization
 */
export function compareKey(s: string, opts: CompareOpts = {}): string {
  let t = s.normalize('NFC');           // pick NFC and stick with it
  if (opts.ignoreWhitespace) {
    t = t.replace(/\s+/g, ' ').trim();  // collapse whitespace and trim
  }
  return t;
}

/**
 * Tokenize text into grapheme clusters for safe inline diffing
 * Prevents splitting of composed characters, emoji ZWJ sequences, etc.
 */
export function graphemesNFC(s: string): string[] {
  const nfc = s.normalize('NFC');
  
  // Use Intl.Segmenter if available (modern browsers)
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return Array.from(seg.segment(nfc), r => r.segment);
  }
  
  // Fallback: split by character but avoid breaking surrogates
  // This is a minimal fallback - in production might want a proper Unicode library
  return Array.from(nfc); // In modern environments, this iterates by code points
}

/**
 * Map grapheme indices back to byte/character positions in original string
 * Used to extract original text slices after LCS on normalized graphemes
 */
export function mapGraphemeSlices(original: string, graphemes: string[]): Array<{ start: number; end: number; text: string }> {
  const result: Array<{ start: number; end: number; text: string }> = [];
  let pos = 0;
  
  for (const grapheme of graphemes) {
    const start = pos;
    const end = pos + grapheme.length;
    result.push({ start, end, text: original.slice(start, end) });
    pos = end;
  }
  
  return result;
}
