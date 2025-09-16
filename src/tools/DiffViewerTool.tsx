import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Switch } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import ResizableTextArea from '../components/ui/ResizableTextArea';
import Field from '../components/ui/Field';
import { useLocalStorageBoolean } from '../components/ui/useLocalStorageBoolean';
import { normalizeEOL } from '../utils/diff/normalize';
import { lcsLineDiff } from '../utils/diff/line';
import InlineTokenOverlay from '../components/InlineTokenOverlay';
import { mergedSegments, type DiffSeg } from '../utils/diff/inline';
import { useGutter } from '../hooks/useGutter';

const DiffViewerTool: React.FC = () => {
  const [leftText, setLeftText] = useState<string>('');
  const [rightText, setRightText] = useState<string>('');
  const leftRef = useRef<HTMLTextAreaElement | null>(null);
  const rightRef = useRef<HTMLTextAreaElement | null>(null);
  const { gutter: leftGutter, metrics: leftMetrics } = useGutter(leftText, leftRef.current);
  const { gutter: rightGutter, metrics: rightMetrics } = useGutter(rightText, rightRef.current);

  // Fixed gutter width to contain both line numbers and any inline indicators
  const GUTTER_WIDTH_PX = 40; // shared by textareas and preview
  const GUTTER_INNER_LEFT_PX = 0; // minimal space before numbers
  const CONTENT_GAP_PX = 8; // space between gutter and text content
  const MIN_ROWS = 16; // revert to shorter vertical size
  const PREVIEW_HEIGHT = 300; // moderate preview height

  // useGutter hook handles metrics and dynamic gutter computation

  const [ignoreWs, setIgnoreWs] = useLocalStorageBoolean('pxtoolbox.diff.ignoreWhitespace', false);
  const [charInline, setCharInline] = useLocalStorageBoolean('pxtoolbox.diff.inlineChar', false);
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(true);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(true);
  const [alteredOnly, setAlteredOnly] = useLocalStorageBoolean('pxtoolbox.diff.alteredOnly', false);
  const [leftScrollTop, setLeftScrollTop] = useState<number>(0);
  const [rightScrollTop, setRightScrollTop] = useState<number>(0);
  const [leftHeight, setLeftHeight] = useState<number>(140);
  const [rightHeight, setRightHeight] = useState<number>(140);
  // Debounced inputs to avoid thrashing
  const [debLeft, setDebLeft] = useState<string>('');
  const [debRight, setDebRight] = useState<string>('');
  const [debIgnoreWs, setDebIgnoreWs] = useState<boolean>(ignoreWs);
  const [debCharInline, setDebCharInline] = useState<boolean>(charInline);
  useEffect(() => {
    const id = setTimeout(() => setDebLeft(leftText), 120);
    return () => clearTimeout(id);
  }, [leftText]);
  useEffect(() => {
    const id = setTimeout(() => setDebRight(rightText), 120);
    return () => clearTimeout(id);
  }, [rightText]);
  useEffect(() => {
    const id = setTimeout(() => setDebIgnoreWs(ignoreWs), 120);
    return () => clearTimeout(id);
  }, [ignoreWs]);
  useEffect(() => {
    const id = setTimeout(() => setDebCharInline(charInline), 120);
    return () => clearTimeout(id);
  }, [charInline]);

  // Normalize EOLs before diffing
  const leftNorm = useMemo(() => normalizeEOL(debLeft), [debLeft]);
  const rightNorm = useMemo(() => normalizeEOL(debRight), [debRight]);

  // Build unified diff text using old behavior (line-level LCS with pairing)
  const diffText = useMemo(() => lcsLineDiff(leftNorm, rightNorm, { ignoreWhitespace: debIgnoreWs }), [leftNorm, rightNorm, debIgnoreWs]);

  // Build inline overlay segments per side using alignment
  const { leftOverlayLines, rightOverlayLines } = useMemo(() => {
    const lines = diffText ? diffText.split('\n') : [];
    const leftArr: DiffSeg[][] = [];
    const rightArr: DiffSeg[][] = [];
    for (let i = 0; i < lines.length; i++) {
      const cur = lines[i] || '';
      const nxt = lines[i + 1] || '';
      if (cur.startsWith('- ') && nxt.startsWith('+ ')) {
        const aRaw = cur.slice(2);
        const bRaw = nxt.slice(2);
        const segs = mergedSegments(aRaw, bRaw, { ignoreWhitespace: debIgnoreWs, mode: debCharInline ? 'char' : 'word' });
        leftArr.push(segs.filter((s) => (s.changed ? s.diffType === 'del' : true)));
        rightArr.push(segs.filter((s) => (s.changed ? s.diffType === 'add' : true)));
        i++;
        continue;
      }
      if (cur.startsWith('- ')) {
        leftArr.push([{ text: cur.slice(2), changed: true, diffType: 'del' }]);
        continue;
      }
      if (cur.startsWith('+ ')) {
        rightArr.push([{ text: cur.slice(2), changed: true, diffType: 'add' }]);
        continue;
      }
      const sameText = cur.startsWith('  ') ? cur.slice(2) : cur;
      leftArr.push([{ text: sameText, changed: false }]);
      rightArr.push([{ text: sameText, changed: false }]);
    }
    return { leftOverlayLines: leftArr, rightOverlayLines: rightArr };
  }, [diffText, debIgnoreWs, debCharInline]);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(191, 204, 214, 0.85)', userSelect: 'none', lineHeight: '20px' }}>Highlights: Altered only</span>
            <Switch checked={alteredOnly} onChange={(e) => setAlteredOnly((e.currentTarget as HTMLInputElement).checked)} aria-label="Altered only" label={undefined} style={{ margin: 0 }} />
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
                {!alteredOnly && (
                  <InlineTokenOverlay
                    segmentsPerLine={leftOverlayLines}
                    leftOffsetPx={GUTTER_WIDTH_PX + CONTENT_GAP_PX}
                    topOffsetPx={leftMetrics.paddingTop}
                    scrollTop={leftScrollTop}
                    fontFamily={leftMetrics.fontFamily}
                    fontSize={leftMetrics.fontSize}
                    fontWeight={leftMetrics.fontWeight}
                    letterSpacing={leftMetrics.letterSpacing}
                    lineHeightPx={leftMetrics.lineHeight}
                    showAdd={false}
                    showDel={true}
                  />
                )}
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
                <InlineTokenOverlay
                  segmentsPerLine={rightOverlayLines}
                  leftOffsetPx={GUTTER_WIDTH_PX + CONTENT_GAP_PX}
                  topOffsetPx={rightMetrics.paddingTop}
                  scrollTop={rightScrollTop}
                  fontFamily={rightMetrics.fontFamily}
                  fontSize={rightMetrics.fontSize}
                  fontWeight={rightMetrics.fontWeight}
                  letterSpacing={rightMetrics.letterSpacing}
                  lineHeightPx={rightMetrics.lineHeight}
                  showAdd={true}
                  showDel={!alteredOnly}
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
                  fontFamily: 'var(--diff-font, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
                  whiteSpace: 'pre-wrap',
                  border: '1px solid rgba(138,155,168,0.15)',
                  borderRadius: 3,
                  background: 'rgba(16,22,26,0.3)',
                  padding: 8,
                }}
              >
                {(() => {
                  const lines = diffText ? diffText.split('\n') : [];
                  const rows: React.ReactNode[] = [];
                  const muted = 'var(--diff-fg-muted, rgba(191, 204, 214, 0.85))';

                  type LocalSeg = { text: string; changed: boolean; diffType?: 'add' | 'del' };

                  function renderLine(displayNum: number, marker: '+' | '-' | ' ' | '~', content: string, segments?: LocalSeg[]) {
                    const isAdd = marker === '+';
                    const isDel = marker === '-';
                    const isMod = marker === '~';
                    const bg = isAdd
                      ? 'var(--diff-add-bg)'
                      : isDel
                      ? 'var(--diff-del-bg)'
                      : isMod
                      ? 'var(--diff-mod-bg)'
                      : 'transparent';
                    const fg = isAdd ? '#7ee787' : isDel ? '#ffa198' : muted;
                    const cls = isAdd ? 'diff-line add' : isDel ? 'diff-line del' : isMod ? 'diff-line mod' : 'diff-line';
                    return (
                      <div key={`l-${displayNum}-${marker}`} className={cls} style={{ padding: '0 6px 0 0', color: fg, background: bg }}>
                        <span style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'baseline', gap: 6, color: 'rgba(138,155,168,0.7)', userSelect: 'none' }}>
                          <span style={{ width: 14, textAlign: 'center' }}>{marker !== ' ' ? marker : ''}</span>
                          <span>{displayNum}</span>
                        </span>
                        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0 }}>
                          {segments
                            ? segments.map((s, i) => (
                                <span key={i} className={s.changed ? (s.diffType === 'add' ? 'diff-span add' : 'diff-span del') : undefined}>
                                  {s.text || ' '}
                                </span>
                              ))
                            : content || ' '}
                        </span>
                      </div>
                    );
                  }

                  let display = 1;
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i] || '';
                    if (line.startsWith('- ') && lines[i + 1]?.startsWith('+ ')) {
                      const aRaw = line.slice(2);
                      const bRaw = lines[i + 1].slice(2);
                      const segs = mergedSegments(aRaw, bRaw, { ignoreWhitespace: debIgnoreWs, mode: debCharInline ? 'char' : 'word' }) as unknown as LocalSeg[];
                      rows.push(renderLine(display, '~', '', segs));
                      i++;
                      display++;
                      continue;
                    }
                    const marker: '+' | '-' | ' ' = line.startsWith('+ ')
                      ? '+'
                      : line.startsWith('- ')
                      ? '-'
                      : ' ';
                    rows.push(renderLine(display, marker, line.slice(2)));
                    display++;
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


