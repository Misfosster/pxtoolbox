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
    const lineHeight = parseFloat(cs.lineHeight || '20');

    // Mirror element to measure soft-wrapped line heights precisely
    const mirror = document.createElement('div');
    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.pointerEvents = 'none';
    mirror.style.boxSizing = 'content-box';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.overflowWrap = 'anywhere';
    mirror.style.wordBreak = 'normal';
    mirror.style.padding = '0';
    mirror.style.border = '0';
    mirror.style.width = `${contentWidth}px`;
    mirror.style.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    mirror.style.letterSpacing = cs.letterSpacing || 'normal';
    document.body.appendChild(mirror);

    const gutterLines: string[] = [];
    const logical = text.split('\n');
    for (let i = 0; i < logical.length; i++) {
      const line = logical[i];
      mirror.textContent = line || ' ';
      const h = mirror.scrollHeight;
      const wraps = Math.max(1, Math.round(h / lineHeight));
      gutterLines.push(String(i + 1));
      for (let j = 1; j < wraps; j++) gutterLines.push('');
    }
    document.body.removeChild(mirror);
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
  const [charInline, setCharInline] = useLocalStorageBoolean('pxtoolbox.diff.inlineChar', false);
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(true);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(true);
  const [leftScrollTop, setLeftScrollTop] = useState<number>(0);
  const [rightScrollTop, setRightScrollTop] = useState<number>(0);
  const [leftHeight, setLeftHeight] = useState<number>(140);
  const [rightHeight, setRightHeight] = useState<number>(140);
  // legacy: wrapLines persisted key no longer used; always wrapping now
  const diffText = useMemo(() => lcsLineDiff(leftText, rightText, ignoreWs), [leftText, rightText, ignoreWs]);

  return (
    <ToolShell
      title="Diff Viewer"
      description="Compare two texts side by side. Inline diffs use smart word-level by default (small edits within a word are considered similar); enable the toggle to diff per character. Unified diff is shown centered below."
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
          {null}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
          <div style={{ flex: '1 1 600px', minWidth: 520 }}>
            <Field label="Original" inputId="diff-left">
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                <ResizableTextArea
                  id="diff-left"
                  value={leftText}
                  onChange={(e) => setLeftText(e.target.value)}
                  onPaste={() => setLeftCollapsed(true)}
                  onScroll={(e) => setLeftScrollTop((e.target as HTMLTextAreaElement).scrollTop)}
                  placeholder="Paste original text…"
                  minRows={leftCollapsed ? 3 : MIN_ROWS}
                  maxRows={leftCollapsed ? 6 : undefined}
                  autosize={false}
                  resizable="none"
                  style={{
                    paddingLeft: GUTTER_WIDTH_PX + CONTENT_GAP_PX,
                    whiteSpace: 'pre-wrap',
                    overflowX: 'hidden',
                    height: leftHeight,
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
                    top: leftMetrics.paddingTop - leftScrollTop,
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
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: -2, height: 12 }}>
                  <div
                    role="separator"
                    aria-label="Resize original"
                    className="v-resize-handle"
                    onPointerDown={(e) => {
                      const startY = e.clientY;
                      const startH = leftHeight;
                      const prevCursor = document.body.style.cursor;
                      const prevUserSelect = (document.body.style as any).userSelect;
                      document.body.style.cursor = 'ns-resize';
                      (document.body.style as any).userSelect = 'none';
                      const startScrollY = window.scrollY;
                      let pointerY = e.clientY;
                      let dragging = true;
                      let rafId = 0;
                      const tick = () => {
                        const zonePx = Math.max(40, Math.floor(window.innerHeight * 0.05));
                        const bottomEdge = window.innerHeight - zonePx;
                        const topEdge = zonePx;
                        let dir = 0;
                        let factor = 0;
                        if (pointerY > bottomEdge) { dir = 1; factor = (pointerY - bottomEdge) / zonePx; }
                        else if (pointerY < topEdge) { dir = -1; factor = (topEdge - pointerY) / zonePx; }
                        const stepBase = 12; // px per frame
                        const speed = dir === 0 ? 0 : stepBase * (1 + 2.0 * Math.min(1, Math.max(0, factor)));
                        if (dir !== 0) window.scrollBy(0, dir * speed);
                        const clampedY = Math.min(Math.max(pointerY, topEdge), bottomEdge);
                        const deltaY = (clampedY - startY) + (window.scrollY - startScrollY);
                        let next = Math.max(80, startH + deltaY);
                        const el = leftRef.current;
                        if (el) {
                          const maxH = el.scrollHeight; // content height incl. padding
                          next = Math.min(next, maxH);
                        }
                        setLeftHeight(next);
                        if (dragging) rafId = requestAnimationFrame(tick);
                      };
                      rafId = requestAnimationFrame(tick);
                      const onMove = (ev: PointerEvent) => { pointerY = ev.clientY; };
                      const onUp = () => {
                        dragging = false;
                        cancelAnimationFrame(rafId);
                        window.removeEventListener('pointermove', onMove as any);
                        window.removeEventListener('pointerup', onUp as any);
                        document.body.style.cursor = prevCursor;
                        (document.body.style as any).userSelect = prevUserSelect;
                      };
                      window.addEventListener('pointermove', onMove as any);
                      window.addEventListener('pointerup', onUp as any);
                    }}
                  >
                    <div className="line" />
                  </div>
                </div>
              </div>
            </Field>
          </div>
          <div style={{ flex: '1 1 600px', minWidth: 520 }}>
            <Field label="Altered" inputId="diff-right">
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                <ResizableTextArea
                  id="diff-right"
                  value={rightText}
                  onChange={(e) => setRightText(e.target.value)}
                  onPaste={() => setRightCollapsed(true)}
                  onScroll={(e) => setRightScrollTop((e.target as HTMLTextAreaElement).scrollTop)}
                  placeholder="Paste altered text…"
                  minRows={rightCollapsed ? 3 : MIN_ROWS}
                  maxRows={rightCollapsed ? 6 : undefined}
                  autosize={false}
                  resizable="none"
                  style={{
                    paddingLeft: GUTTER_WIDTH_PX + CONTENT_GAP_PX,
                    whiteSpace: 'pre-wrap',
                    overflowX: 'hidden',
                    height: rightHeight,
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
                    top: rightMetrics.paddingTop - rightScrollTop,
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
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: -2, height: 12 }}>
                  <div
                    role="separator"
                    aria-label="Resize altered"
                    className="v-resize-handle"
                    onPointerDown={(e) => {
                      const startY = e.clientY;
                      const startH = rightHeight;
                      const prevCursor = document.body.style.cursor;
                      const prevUserSelect = (document.body.style as any).userSelect;
                      document.body.style.cursor = 'ns-resize';
                      (document.body.style as any).userSelect = 'none';
                      const startScrollY = window.scrollY;
                      let pointerY = e.clientY;
                      let dragging = true;
                      let rafId = 0;
                      const tick = () => {
                        const zonePx = Math.max(40, Math.floor(window.innerHeight * 0.05));
                        const bottomEdge = window.innerHeight - zonePx;
                        const topEdge = zonePx;
                        let dir = 0;
                        let factor = 0;
                        if (pointerY > bottomEdge) { dir = 1; factor = (pointerY - bottomEdge) / zonePx; }
                        else if (pointerY < topEdge) { dir = -1; factor = (topEdge - pointerY) / zonePx; }
                        const stepBase = 12;
                        const speed = dir === 0 ? 0 : stepBase * (1 + 2.0 * Math.min(1, Math.max(0, factor)));
                        if (dir !== 0) window.scrollBy(0, dir * speed);
                        const clampedY = Math.min(Math.max(pointerY, topEdge), bottomEdge);
                        const deltaY = (clampedY - startY) + (window.scrollY - startScrollY);
                        let next = Math.max(80, startH + deltaY);
                        const el = rightRef.current;
                        if (el) {
                          const maxH = el.scrollHeight;
                          next = Math.min(next, maxH);
                        }
                        setRightHeight(next);
                        if (dragging) rafId = requestAnimationFrame(tick);
                      };
                      rafId = requestAnimationFrame(tick);
                      const onMove = (ev: PointerEvent) => { pointerY = ev.clientY; };
                      const onUp = () => {
                        dragging = false;
                        cancelAnimationFrame(rafId);
                        window.removeEventListener('pointermove', onMove as any);
                        window.removeEventListener('pointerup', onUp as any);
                        document.body.style.cursor = prevCursor;
                        (document.body.style as any).userSelect = prevUserSelect;
                      };
                      window.addEventListener('pointermove', onMove as any);
                      window.addEventListener('pointerup', onUp as any);
                    }}
                  >
                    <div className="line" />
                  </div>
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
                  whiteSpace: 'pre-wrap',
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

                  function mergedSegments(a: string, b: string, ignoreWhitespace: boolean, mode: 'char' | 'word' | 'smart'): DiffSeg[] {
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
                      } else { // word or smart
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
                    const isWhitespaceToken = (s: string) => /^\s+$/.test(s);
                    // Levenshtein with early exit; returns edit distance
                    function levenshtein(a0: string, b0: string, maxRatio: number): number {
                      if (a0 === b0) return 0;
                      const a1 = a0;
                      const b1 = b0;
                      const nA = a1.length;
                      const nB = b1.length;
                      if (nA === 0) return nB;
                      if (nB === 0) return nA;
                      const maxLen = Math.max(nA, nB);
                      const maxEdits = Math.floor(maxLen * maxRatio);
                      const prev = new Array<number>(nB + 1);
                      const curr = new Array<number>(nB + 1);
                      for (let j2 = 0; j2 <= nB; j2++) prev[j2] = j2;
                      for (let i2 = 1; i2 <= nA; i2++) {
                        curr[0] = i2;
                        let rowMin = curr[0];
                        const ai = a1.charCodeAt(i2 - 1);
                        for (let j2 = 1; j2 <= nB; j2++) {
                          const cost = ai === b1.charCodeAt(j2 - 1) ? 0 : 1;
                          const del = prev[j2] + 1;
                          const ins = curr[j2 - 1] + 1;
                          const sub = prev[j2 - 1] + cost;
                          let v = del < ins ? del : ins;
                          if (sub < v) v = sub;
                          curr[j2] = v;
                          if (v < rowMin) rowMin = v;
                        }
                        if (rowMin > maxEdits) return rowMin;
                        for (let j2 = 0; j2 <= nB; j2++) prev[j2] = curr[j2];
                      }
                      return prev[nB];
                    }
                    function tokensSimilar(aTok: string, bTok: string): boolean {
                      if (isWhitespaceToken(aTok) && isWhitespaceToken(bTok)) return true;
                      if (aTok === bTok) return true;
                      if (aTok.length <= 2 || bTok.length <= 2) return false;
                      const MAX_DIFF_RATIO = 0.3;
                      const dist = levenshtein(aTok, bTok, MAX_DIFF_RATIO);
                      const ratio = dist / Math.max(aTok.length, bTok.length);
                      return ratio <= MAX_DIFF_RATIO;
                    }
                    const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
                    const equals = (i2: number, j2: number): boolean => {
                      if (mode === 'char' || mode === 'word') return A.norm[i2] === B.norm[j2];
                      return tokensSimilar(A.norm[i2], B.norm[j2]);
                    };
                    for (let i2 = n - 1; i2 >= 0; i2--) {
                      for (let j2 = m - 1; j2 >= 0; j2--) {
                        dp[i2][j2] = equals(i2, j2) ? dp[i2 + 1][j2 + 1] + 1 : Math.max(dp[i2 + 1][j2], dp[i2][j2 + 1]);
                      }
                    }
                    type Op = { type: 'eq' | 'del' | 'add'; piece: string };
                    const ops: Op[] = [];
                    let i = 0;
                    let j = 0;
                    while (i < n && j < m) {
                      if (equals(i, j)) {
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
                    function charLevelSegments(x: string, y: string): DiffSeg[] {
                      if (x === y) return [{ text: x, changed: false }];
                      const aArr = Array.from(x);
                      const bArr = Array.from(y);
                      const na = aArr.length;
                      const nb = bArr.length;
                      const dp2: number[][] = Array.from({ length: na + 1 }, () => new Array<number>(nb + 1).fill(0));
                      for (let i3 = na - 1; i3 >= 0; i3--) {
                        for (let j3 = nb - 1; j3 >= 0; j3--) {
                          dp2[i3][j3] = aArr[i3] === bArr[j3] ? dp2[i3 + 1][j3 + 1] + 1 : Math.max(dp2[i3 + 1][j3], dp2[i3][j3 + 1]);
                        }
                      }
                      const pieces: { type: 'eq' | 'del' | 'add'; text: string }[] = [];
                      let i3 = 0, j3 = 0;
                      while (i3 < na && j3 < nb) {
                        if (aArr[i3] === bArr[j3]) { pieces.push({ type: 'eq', text: aArr[i3] }); i3++; j3++; }
                        else if (dp2[i3 + 1][j3] >= dp2[i3][j3 + 1]) { pieces.push({ type: 'del', text: aArr[i3] }); i3++; }
                        else { pieces.push({ type: 'add', text: bArr[j3] }); j3++; }
                      }
                      while (i3 < na) { pieces.push({ type: 'del', text: aArr[i3++] }); }
                      while (j3 < nb) { pieces.push({ type: 'add', text: bArr[j3++] }); }
                      const out: DiffSeg[] = [];
                      let lastType: 'eq' | 'del' | 'add' | null = null;
                      let buffer = '';
                      const flush2 = () => {
                        if (lastType === null || buffer === '') return;
                        if (lastType === 'eq') out.push({ text: buffer, changed: false });
                        else if (lastType === 'del') out.push({ text: buffer, changed: true, diffType: 'del' });
                        else out.push({ text: buffer, changed: true, diffType: 'add' });
                        lastType = null; buffer = '';
                      };
                      for (const p of pieces) {
                        if (lastType === null) { lastType = p.type; buffer = p.text; continue; }
                        if (p.type === lastType) buffer += p.text; else { flush2(); lastType = p.type; buffer = p.text; }
                      }
                      flush2();
                      return out;
                    }

                    for (let k = 0; k < ops.length; k++) {
                      const cur = ops[k];
                      const nxt = ops[k + 1];
                      if (
                        mode === 'smart' &&
                        cur && nxt && cur.type === 'del' && nxt.type === 'add' &&
                        cur.piece.trim() !== '' && nxt.piece.trim() !== ''
                      ) {
                        const similar = tokensSimilar(cur.piece, nxt.piece);
                        if (similar) {
                          // Small change: show char-level detail for the pair
                          const inner = charLevelSegments(cur.piece, nxt.piece);
                          for (const seg of inner) segs.push(seg);
                          k++;
                          continue;
                        }
                      }
                      if (cur.type === 'eq') {
                        segs.push({ text: cur.piece, changed: false });
                      } else if (cur.type === 'del') {
                        segs.push({ text: cur.piece, changed: true, diffType: 'del' });
                      } else {
                        segs.push({ text: cur.piece, changed: true, diffType: 'add' });
                      }
                    }
                    return segs;
                  }

                  let lineNo = 1;
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i] || '';
                    if (line.startsWith('- ') && i + 1 < lines.length && lines[i + 1].startsWith('+ ')) {
                      const aRaw = line.slice(2);
                      const bRaw = lines[i + 1].slice(2);
                      const merged = mergedSegments(aRaw, bRaw, ignoreWs, charInline ? 'char' : 'smart');
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
          <Button icon="eraser" onClick={() => { setLeftText(''); setRightText(''); setLeftCollapsed(false); setRightCollapsed(false); }} disabled={!leftText && !rightText}>Clear</Button>
        </div>
      </Card>
    </ToolShell>
  );
};

export default DiffViewerTool;


