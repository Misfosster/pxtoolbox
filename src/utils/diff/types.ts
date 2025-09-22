/**
 * Type definitions for the new diff engine
 */

/** Line-level diff algorithms */
export type LineAlgorithm = 'patience' | 'histogram' | 'myers';

/** Intraline diff granularity modes */
export type InlineMode = 'word' | 'char' | 'smart' | 'off';

/** Configuration options for diff computation */
export interface DiffOptions {
  /** Algorithm for line-level diffing */
  lineAlgorithm: LineAlgorithm;
  
  /** Granularity for intraline diffing */
  inlineMode: InlineMode;
  
  /** Ignore whitespace differences */
  ignoreWhitespace: boolean;
  
  /** Ignore case differences */
  ignoreCase: boolean;
  
  /** Ignore end-of-line differences */
  ignoreEOL: boolean;
  
  /** Maximum characters for intraline processing (performance limit) */
  maxInlineChars: number;
  
  /** Enable Web Worker for heavy operations */
  workerEnabled: boolean;
  
  /** Locale for word segmentation (optional) */
  locale?: string;
}

/** Segment within a modified line */
export interface Segment {
  type: 'eq' | 'add' | 'del';
  text: string;
}

/** A row in the diff result */
export interface Row {
  /** Row type: equal, delete, add, modify */
  tag: '=' | '-' | '+' | '~';
  
  /** Left line number (1-based, undefined for additions) */
  leftNum?: number;
  
  /** Right line number (1-based, undefined for deletions) */
  rightNum?: number;
  
  /** Left side text content */
  leftText?: string;
  
  /** Right side text content */
  rightText?: string;
  
  /** Inline segments for modified rows */
  segments?: Segment[];
}

/** Statistics about the diff */
export interface DiffStats {
  added: number;
  deleted: number;
  modified: number;
  unchanged: number;
}

/** Performance metrics */
export interface DiffPerformance {
  lineAlgorithmMs: number;
  inlineAlgorithmMs: number;
  totalMs: number;
}

/** Complete diff result */
export interface DiffResult {
  rows: Row[];
  stats: DiffStats;
  performance: DiffPerformance;
  hasEOFMismatch: boolean;
  eofBadge?: string; // Git-style "\ No newline at end of file" message
}

/** Web Worker request message */
export interface DiffWorkerRequest {
  id: string;
  leftBuffer: ArrayBuffer;
  rightBuffer: ArrayBuffer;
  options: DiffOptions;
}

/** Web Worker response message */
export interface DiffWorkerResponse {
  id: string;
  result?: DiffResult;
  error?: string;
}

