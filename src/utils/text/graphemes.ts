/**
 * Grapheme-cluster tokenization for proper handling of emoji, ZWJ sequences, and composed accents
 */

export type GraphemeIterator = (s: string) => string[];

let seg: Intl.Segmenter | null = null;
try { 
  seg = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' }); 
} catch {}

const FALLBACK_GRAPHEME = /(\uD83C[\uDFFB-\uDFFF])|(?:\u200D)|([\uD800-\uDBFF][\uDC00-\uDFFF])|./gu;

/**
 * Split string into grapheme clusters, keeping emoji sequences and accents intact
 */
export function splitGraphemes(s: string): string[] {
  if (seg) {
    return Array.from(seg.segment(s), (x: any) => x.segment);
  }
  
  // Naive fallback: keeps surrogate pairs, ZWJ chain pieces grouped loosely
  const parts = s.match(FALLBACK_GRAPHEME) ?? [];
  
  // Coalesce ZWJ chains
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    let g = parts[i];
    
    // Look ahead for ZWJ sequences
    while (i + 1 < parts.length && parts[i + 1] === '\u200D') {
      g += parts[i + 1] + (parts[i + 2] ?? '');
      i += 2;
    }
    
    out.push(g);
  }
  
  return out;
}
