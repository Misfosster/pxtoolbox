import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { Button, Card, Switch } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import ResizableTextArea from '../components/ui/ResizableTextArea';
import Field from '../components/ui/Field';
import { useLocalStorageBoolean } from '../components/ui/useLocalStorageBoolean';

// LCS-based line diff to properly handle insertions/deletions and minimize churn
function normalizeLineForWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function lcsLineDiff(a: string, b: string, ignoreWhitespace: boolean): string {
  if (!a && !b) return '';
  if (!a && b) return b.split(/\r?\n/).map((l) => '+ ' + l).join('\n');
  if (a && !b) return a.split(/\r?\n/).map((l) => '- ' + l).join('\n');
  const aLines = a.split(/\r?\n/);
  const bLines = b.split(/\r?\n/);
  const aCmp = ignoreWhitespace ? aLines.map(normalizeLineForWhitespace) : aLines;
  const bCmp = ignoreWhitespace ? bLines.map(normalizeLineForWhitespace) : bLines;
  const n = aLines.length;
  const m = bLines.length;
  // DP table of LCS lengths
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    const ai = aCmp[i];
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = ai === bCmp[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  // Reconstruct edit script with a small lookahead heuristic:
  // Prefer classifying single-line insert/delete when it keeps alignment; otherwise emit a modify pair (- then +).
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (aCmp[i] === bCmp[j]) {
      out.push('  ' + aLines[i]);
      i++;
      j++;
      continue;
    }
    // Tie-breaker using lookahead to keep alignment intuitive
    const delKeepsAlign = i + 1 < n && aLines[i + 1] === bLines[j];
    const addKeepsAlign = j + 1 < m && aLines[i] === bLines[j + 1];
    if (delKeepsAlign && !addKeepsAlign) {
      out.push('- ' + aLines[i]);
      i++;
      continue;
    }
    if (addKeepsAlign && !delKeepsAlign) {
      out.push('+ ' + bLines[j]);
      j++;
      continue;
    }
    // Fall back to DP direction when clearly better
    if (dp[i + 1][j] > dp[i][j + 1]) {
      out.push('- ' + aLines[i]);
      i++;
      continue;
    }
    if (dp[i + 1][j] < dp[i][j + 1]) {
      out.push('+ ' + bLines[j]);
      j++;
      continue;
    }
    // Otherwise treat as modification (pair)
    out.push('- ' + aLines[i]);
    out.push('+ ' + bLines[j]);
    i++;
    j++;
  }
  while (i < n) {
    out.push('- ' + aLines[i]);
    i++;
  }
  while (j < m) {
    out.push('+ ' + bLines[j]);
    j++;
  }
  return out.join('\n');
}

const DiffViewerTool: React.FC = () => {
  const [leftText, setLeftText] = useState<string>('');
  const [rightText, setRightText] = useState<string>('');
  const leftRef = useRef<HTMLTextAreaElement | null>(null);
  const rightRef = useRef<HTMLTextAreaElement | null>(null);
  const [leftMetrics, setLeftMetrics] = useState<{ lineHeight: number; paddingTop: number }>({ lineHeight: 20, paddingTop: 8 });
  const [rightMetrics, setRightMetrics] = useState<{ lineHeight: number; paddingTop: number }>({ lineHeight: 20, paddingTop: 8 });
  const [leftGutter, setLeftGutter] = useState<string>('');
  const [rightGutter, setRightGutter] = useState<string>('');

  useLayoutEffect(() => {
    const el = leftRef.current;
    if (!el) return;
    const cs = window.getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight || '20');
    const pt = parseFloat(cs.paddingTop || '8');
    setLeftMetrics({ lineHeight: lh, paddingTop: pt });
  }, [leftText]);

  useLayoutEffect(() => {
    const el = rightRef.current;
    if (!el) return;
    const cs = window.getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight || '20');
    const pt = parseFloat(cs.paddingTop || '8');
    setRightMetrics({ lineHeight: lh, paddingTop: pt });
  }, [rightText]);

  // Fixed gutter width to contain both line numbers and any inline indicators
  const GUTTER_WIDTH_PX = 40; // shared by textareas and preview
  const GUTTER_INNER_LEFT_PX = 0; // minimal space before numbers
  const CONTENT_GAP_PX = 8; // space between gutter and text content
  const MIN_ROWS = 16; // revert to shorter vertical size
  const PREVIEW_HEIGHT = 300; // moderate preview height

  function computeGutter(text: string, el: HTMLTextAreaElement | null): string {
    if (!text) return '';
    if (!el) return text.split('\n').map((_, i) => String(i + 1)).join('\n');
    const cs = window.getComputedStyle(el);
    const paddingLeft = parseFloat(cs.paddingLeft || '0');
    const paddingRight = parseFloat(cs.paddingRight || '0');
    const contentWidth = Math.max(0, el.clientWidth - paddingLeft - paddingRight);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return text.split('\n').map((_, i) => String(i + 1)).join('\n');
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const measure = (s: string) => ctx!.measureText(s).width;

    function countWrapsForLine(line: string): number {
      if (!line) return 1;
      let width = 0;
      let wraps = 1;
      for (let idx = 0; idx < line.length; idx++) {
        const ch = line[idx];
        const w = measure(ch);
        if (width + w <= contentWidth || width === 0) {
          width += w;
        } else {
          wraps++;
          width = w;
        }
      }
      return Math.max(1, wraps);
    }
    const gutterLines: string[] = [];
    const logical = text.split('\n');
    for (let i = 0; i < logical.length; i++) {
      const line = logical[i];
      const wraps = countWrapsForLine(line);
      gutterLines.push(String(i + 1));
      for (let j = 1; j < wraps; j++) gutterLines.push('');
    }
    return gutterLines.join('\n');
  }

  useLayoutEffect(() => {
    setLeftGutter(computeGutter(leftText, leftRef.current));
    const el = leftRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLeftGutter(computeGutter(leftText, leftRef.current)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [leftText]);

  useLayoutEffect(() => {
    setRightGutter(computeGutter(rightText, rightRef.current));
    const el = rightRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setRightGutter(computeGutter(rightText, rightRef.current)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [rightText]);

  const [ignoreWs, setIgnoreWs] = useLocalStorageBoolean('pxtoolbox.diff.ignoreWhitespace', false);
  const [charInline, setCharInline] = useLocalStorageBoolean('pxtoolbox.diff.inlineChar', true);
  const diffText = useMemo(() => lcsLineDiff(leftText, rightText, ignoreWs), [leftText, rightText, ignoreWs]);

  return (
    <ToolShell
      title="Diff Viewer"
      description="Compare two texts side by side. Inline diffs use word-level by default; enable the toggle to diff per character. Unified diff is shown centered below."
    >
      <Card elevation={1}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(191, 204, 214, 0.85)', userSelect: 'none', lineHeight: '20px' }}>Ignore whitespace</span>
            <Switch checked={ignoreWs} onChange={(e) => setIgnoreWs((e.currentTarget as HTMLInputElement).checked)} aria-label="Ignore whitespace" label={undefined} style={{ margin: 0 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(191, 204, 214, 0.85)', userSelect: 'none', lineHeight: '20px' }}>Character-level inline</span>
            <Switch checked={charInline} onChange={(e) => setCharInline((e.currentTarget as HTMLInputElement).checked)} aria-label="Character-level inline" label={undefined} style={{ margin: 0 }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'nowrap', alignItems: 'stretch' }}>
          <div style={{ flex: '1 1 600px', minWidth: 520 }}>
            <Field label="Original" inputId="diff-left">
              <div style={{ position: 'relative' }}>
                <ResizableTextArea
                  id="diff-left"
                  value={leftText}
                  onChange={(e) => setLeftText(e.target.value)}
                  placeholder="Paste original text…"
                  minRows={MIN_ROWS}
                  autosize
                  style={{
                    paddingLeft: GUTTER_WIDTH_PX + CONTENT_GAP_PX,
                    whiteSpace: 'pre-wrap',
                    overflowX: 'hidden',
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  }}
                  inputRef={(el) => (leftRef.current = el)}
                />
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: GUTTER_INNER_LEFT_PX,
                    top: leftMetrics.paddingTop,
                    width: GUTTER_WIDTH_PX - GUTTER_INNER_LEFT_PX,
                    textAlign: 'right',
                    color: 'rgba(138,155,168,0.7)',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    whiteSpace: 'pre-line',
                    lineHeight: `${leftMetrics.lineHeight}px`,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  }}
                >
                  {leftGutter}
                </div>
              </div>
            </Field>
          </div>
          <div style={{ flex: '1 1 600px', minWidth: 520 }}>
            <Field label="Altered" inputId="diff-right">
              <div style={{ position: 'relative' }}>
                <ResizableTextArea
                  id="diff-right"
                  value={rightText}
                  onChange={(e) => setRightText(e.target.value)}
                  placeholder="Paste altered text…"
                  minRows={MIN_ROWS}
                  autosize
                  style={{
                    paddingLeft: GUTTER_WIDTH_PX + CONTENT_GAP_PX,
                    whiteSpace: 'pre-wrap',
                    overflowX: 'hidden',
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  }}
                  inputRef={(el) => (rightRef.current = el)}
                />
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: GUTTER_INNER_LEFT_PX,
                    top: rightMetrics.paddingTop,
                    width: GUTTER_WIDTH_PX - GUTTER_INNER_LEFT_PX,
                    textAlign: 'right',
                    color: 'rgba(138,155,168,0.7)',
                    userSelect: 'none',
                    pointerEvents: 'none',
                    whiteSpace: 'pre-line',
                    lineHeight: `${rightMetrics.lineHeight}px`,
                    fontFamily:
                      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  }}
                >
                  {rightGutter}
                </div>
              </div>
            </Field>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
          <div style={{ flex: '1 1 0', width: '100%' }}>
            <Field label="Unified diff (preview)" inputId="diff-output">
              <div
                id="diff-output"
                style={{
                  width: '100%',
                  height: PREVIEW_HEIGHT,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  resize: 'both',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  whiteSpace: 'normal',
                  border: '1px solid rgba(138,155,168,0.15)',
                  borderRadius: 3,
                  background: 'rgba(16,22,26,0.3)',
                  padding: 8,
                }}
              >
                {(() => {
                  const lines = diffText.split('\n');
                  const rows: React.ReactNode[] = [];
                  const muted = 'rgba(191, 204, 214, 0.85)';

                  type DiffSeg = { text: string; changed: boolean; diffType?: 'add' | 'del' };

                  function renderLine(displayNum: number, marker: '+' | '-' | ' ' | '~', content: string, segments?: DiffSeg[]) {
                    const isAdd = marker === '+';
                    const isDel = marker === '-';
                    const isMod = marker === '~';
                    const bg = isAdd
                      ? 'rgba(46, 160, 67, 0.10)'
                      : isDel
                      ? 'rgba(248, 81, 73, 0.10)'
                      : isMod
                      ? 'rgba(100, 148, 237, 0.14)'
                      : 'transparent';
                    const fg = isAdd ? '#7ee787' : isDel ? '#ffa198' : muted;
                    return (
                      <div
                        key={`l-${displayNum}-${marker}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `${GUTTER_WIDTH_PX}px 1fr`,
                          columnGap: CONTENT_GAP_PX,
                          alignItems: 'baseline',
                          padding: '0 6px 0 0',
                          background: bg,
                          color: fg,
                        }}
                      >
                        <span style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'baseline', gap: 6, color: 'rgba(138,155,168,0.7)', userSelect: 'none' }}>
                          <span style={{ width: 14, textAlign: 'center' }}>{marker !== ' ' ? marker : ''}</span>
                          <span>{displayNum}</span>
                        </span>
                        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0 }}>
                          {segments
                            ? segments.map((s, i) => (
                                <span
                                  key={i}
                                  style={
                                    s.changed
                                      ? (s.diffType === 'add'
                                          ? { background: 'rgba(46, 160, 67, 0.55)', color: '#c0ffd0', borderRadius: 2, fontWeight: 600 }
                                          : { background: 'rgba(248, 81, 73, 0.55)', color: '#ffd1cc', borderRadius: 2, fontWeight: 600 }
                                        )
                                      : undefined
                                  }
                                >
                                  {s.text || ' '}
                                </span>
                              ))
                            : content || ' '}
                        </span>
                      </div>
                    );
                  }

                  function mergedSegments(a: string, b: string, ignoreWhitespace: boolean, mode: 'char' | 'word'): DiffSeg[] {
                    if (a === b) return [{ text: a, changed: false }];

                    // Build normalized token arrays either per char or per word, with mapping back to original slices
                    const buildNorm = (src: string) => {
                      const norm: string[] = [];
                      const map: string[] = [];
                      if (mode === 'char') {
                        let i = 0;
                        while (i < src.length) {
                          const ch = src[i];
                          if (ignoreWhitespace && /\s/.test(ch)) {
                            let j = i + 1;
                            while (j < src.length && /\s/.test(src[j])) j++;
                            norm.push(' ');
                            map.push(src.slice(i, j));
                            i = j;
                          } else {
                            norm.push(ch);
                            map.push(ch);
                            i++;
                          }
                        }
                      } else {
                        // word mode: split on whitespace but keep whitespace tokens
                        const regex = /(\s+|[^\s]+)/g;
                        const tokens = src.match(regex) || [];
                        for (const t of tokens) {
                          if (ignoreWhitespace && /^\s+$/.test(t)) {
                            norm.push(' ');
                            map.push(t);
                          } else {
                            norm.push(t);
                            map.push(t);
                          }
                        }
                      }
                      return { norm, map };
                    };

                    const A = buildNorm(a);
                    const B = buildNorm(b);
                    const n = A.norm.length;
                    const m = B.norm.length;
                    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
                    for (let i = n - 1; i >= 0; i--) {
                      for (let j = m - 1; j >= 0; j--) {
                        dp[i][j] = A.norm[i] === B.norm[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
                      }
                    }
                    type Op = { type: 'eq' | 'del' | 'add'; piece: string };
                    const ops: Op[] = [];
                    let i = 0;
                    let j = 0;
                    while (i < n && j < m) {
                      if (A.norm[i] === B.norm[j]) {
                        ops.push({ type: 'eq', piece: A.map[i] });
                        i++; j++;
                      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
                        ops.push({ type: 'del', piece: A.map[i] });
                        i++;
                      } else {
                        ops.push({ type: 'add', piece: B.map[j] });
                        j++;
                      }
                    }
                    while (i < n) { ops.push({ type: 'del', piece: A.map[i++] }); }
                    while (j < m) { ops.push({ type: 'add', piece: B.map[j++] }); }

                    const segs: DiffSeg[] = [];
                    let curType: Op['type'] | null = null;
                    let buf = '';
                    const flush = () => {
                      if (curType === null || buf === '') return;
                      if (curType === 'eq') segs.push({ text: buf, changed: false });
                      else if (curType === 'del') segs.push({ text: buf, changed: true, diffType: 'del' });
                      else segs.push({ text: buf, changed: true, diffType: 'add' });
                      buf = '';
                      curType = null;
                    };
                    for (const op0 of ops) {
                      const op = ignoreWhitespace && op0.piece.trim() === '' ? { type: 'eq' as const, piece: op0.piece } : op0;
                      if (curType === null) { curType = op.type; buf = op.piece; continue; }
                      if (op.type === curType) buf += op.piece;
                      else { flush(); curType = op.type; buf = op.piece; }
                    }
                    flush();
                    return segs;
                  }

                  let lineNo = 1;
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i] || '';
                    if (line.startsWith('- ') && i + 1 < lines.length && lines[i + 1].startsWith('+ ')) {
                      const aRaw = line.slice(2);
                      const bRaw = lines[i + 1].slice(2);
                      const merged = mergedSegments(aRaw, bRaw, ignoreWs, charInline ? 'char' : 'word');
                      rows.push(renderLine(lineNo, '~', '', merged));
                      i++;
                      lineNo++;
                      continue;
                    }
                    const marker: '+' | '-' | ' ' = line.startsWith('+ ')
                      ? '+'
                      : line.startsWith('- ')
                      ? '-'
                      : ' ';
                    rows.push(renderLine(lineNo, marker, marker === ' ' ? line.slice(2) : line.slice(2)));
                    lineNo++;
                  }
                  return rows;
                })()}
              </div>
            </Field>
          </div>
        </div>
        <div className="card-bottom" style={{ justifyItems: 'start' }}>
          <Button icon="eraser" onClick={() => { setLeftText(''); setRightText(''); }} disabled={!leftText && !rightText}>Clear</Button>
        </div>
      </Card>
    </ToolShell>
  );
};

export default DiffViewerTool;


