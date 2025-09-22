import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Switch } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import ResizableTextArea from '../components/ui/ResizableTextArea';
import Field from '../components/ui/Field';
import { useLocalStorageBoolean } from '../components/ui/useLocalStorageBoolean';
import { normalizeEOL } from '../utils/diff/normalize';
import { alignLines, splitLinesNoTrailingEmpty } from '../utils/diff/line';
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
  const [changedOnlyPreview, setChangedOnlyPreview] = useLocalStorageBoolean('pxtoolbox.diff.changedOnlyPreview', false);
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

  // Normalize EOLs (debounced for heavy diff)
  const leftNorm = useMemo(() => normalizeEOL(debLeft), [debLeft]);
  const rightNorm = useMemo(() => normalizeEOL(debRight), [debRight]);
  // Normalize EOLs (immediate) previously used for overlay; retained approach removed to keep one source of truth

  // Build alignment (steps + local numbering) used for side-by-side view and overlay (debounced)
  const { steps } = useMemo(() => {
    return alignLines(leftNorm, rightNorm, { ignoreWhitespace: debIgnoreWs });
  }, [leftNorm, rightNorm, debIgnoreWs]);


  // Split lines for content lookup
  const leftLines = useMemo(() => splitLinesNoTrailingEmpty(leftNorm), [leftNorm]);
  const rightLines = useMemo(() => splitLinesNoTrailingEmpty(rightNorm), [rightNorm]);

  // Note: overlays use the same steps as preview to keep a single source of truth.

  // Build inline overlay segments and line roles per side mapped to ACTUAL lines per side (no placeholder rows)
  const { leftOverlayLines, rightOverlayLines, leftLineRoles, rightLineRoles } = useMemo(() => {
    const leftArr: DiffSeg[][] = new Array(leftLines.length);
    const rightArr: DiffSeg[][] = new Array(rightLines.length);
    const leftRoles: ('none' | 'add' | 'del')[] = new Array(leftLines.length).fill('none');
    const rightRoles: ('none' | 'add' | 'del')[] = new Array(rightLines.length).fill('none');
    
    
    for (const st of steps) {
      if (st.type === 'same') {
        const li = (st as any).i as number;
        const rj = (st as any).j as number;
        const lText = leftLines[li] || '';
        const rText = rightLines[rj] || '';
        console.log(`SAME line ${li}/${rj}: "${lText}" === "${rText}"`);
        // For 'same' lines, never run intraline diff - they are considered identical
        leftArr[li] = [{ text: lText, changed: false }];
        rightArr[rj] = [{ text: rText, changed: false }];
        continue;
      }
      if (st.type === 'del') {
        const li = (st as any).i as number;
        const lText = leftLines[li] || '';
        leftArr[li] = [{ text: lText, changed: true, diffType: 'del' }];
        leftRoles[li] = 'del'; // Whole line del tint
        // Right side has no row for pure deletions
        continue;
      }
      if (st.type === 'add') {
        const rj = (st as any).j as number;
        const rText = rightLines[rj] || '';
        rightArr[rj] = [{ text: rText, changed: true, diffType: 'add' }];
        rightRoles[rj] = 'add'; // Whole line add tint
        // Left side has no row for pure additions
        continue;
      }
      if (st.type === 'mod') {
        const li = (st as any).i as number;
        const rj = (st as any).j as number;
        const aRaw = leftLines[li] || '';
        const bRaw = rightLines[rj] || '';
        
        // For overlays, always use ignoreWhitespace: false to ensure segments align with raw textarea content
        // The line alignment already handled whitespace normalization at the line level  
        const segs = mergedSegments(aRaw, bRaw, { ignoreWhitespace: false, mode: debCharInline ? 'char' : 'word' });
        
        // For mod steps in unified preview: show the LEFT content (not segments)
        // This ensures the unified preview shows the original left content with ~ marker
        
        // LEFT overlay: keep eq + del only (hide add to match textarea content)
        leftArr[li] = segs.filter(s => !s.changed || s.diffType === 'del');
        leftRoles[li] = 'del'; // Left side gets del tint for mod
        
        // RIGHT overlay: keep eq + add only (hide del to match textarea content)  
        rightArr[rj] = segs.filter(s => !s.changed || s.diffType === 'add');
        rightRoles[rj] = 'add'; // Right side gets add tint for mod
        
        // Guardrail: verify overlay text matches textarea content
        if (process.env.NODE_ENV !== 'production') {
          const leftOverlayText = leftArr[li].map(s => s.text).join('');
          const rightOverlayText = rightArr[rj].map(s => s.text).join('');
          
          if (leftOverlayText !== aRaw) {
            console.warn(`Left overlay mismatch at line ${li + 1}:`, { expected: aRaw, got: leftOverlayText });
          }
          if (rightOverlayText !== bRaw) {
            console.warn(`Right overlay mismatch at line ${rj + 1}:`, { expected: bRaw, got: rightOverlayText });
          }
        }
      }
    }
    // Fill any untouched lines as unchanged segments to preserve mirror layout
    for (let i = 0; i < leftArr.length; i++) if (!leftArr[i]) leftArr[i] = [{ text: leftLines[i] || '', changed: false }];
    for (let j = 0; j < rightArr.length; j++) if (!rightArr[j]) rightArr[j] = [{ text: rightLines[j] || '', changed: false }];
    return { 
      leftOverlayLines: leftArr, 
      rightOverlayLines: rightArr,
      leftLineRoles: leftRoles,
      rightLineRoles: rightRoles
    };
  }, [steps, leftLines, rightLines, debIgnoreWs, debCharInline]);

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
                  spellCheck={false}
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
              id="diff-left-overlay"
              segmentsPerLine={leftOverlayLines}
                    leftOffsetPx={GUTTER_WIDTH_PX + CONTENT_GAP_PX}
                    topOffsetPx={leftMetrics.paddingTop}
                    scrollTop={leftScrollTop}
                    contentWidthPx={(leftRef.current ? (leftRef.current.clientWidth - parseFloat(getComputedStyle(leftRef.current).paddingLeft || '0') - parseFloat(getComputedStyle(leftRef.current).paddingRight || '0')) : undefined) as any}
                    fontFamily={leftMetrics.fontFamily}
                    fontSize={leftMetrics.fontSize}
                    fontWeight={leftMetrics.fontWeight}
                    letterSpacing={leftMetrics.letterSpacing}
                    lineHeightPx={leftMetrics.lineHeight}
                    showAdd={false}
                    showDel={true}
                    side="left"
                    lineRoles={leftLineRoles}
                  />
                )}
                <div
                  data-testid="diff-left-gutter"
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
                  spellCheck={false}
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
              id="diff-right-overlay"
              segmentsPerLine={rightOverlayLines}
                  leftOffsetPx={GUTTER_WIDTH_PX + CONTENT_GAP_PX}
                  topOffsetPx={rightMetrics.paddingTop}
                  scrollTop={rightScrollTop}
                  contentWidthPx={(rightRef.current ? (rightRef.current.clientWidth - parseFloat(getComputedStyle(rightRef.current).paddingLeft || '0') - parseFloat(getComputedStyle(rightRef.current).paddingRight || '0')) : undefined) as any}
                  fontFamily={rightMetrics.fontFamily}
                  fontSize={rightMetrics.fontSize}
                  fontWeight={rightMetrics.fontWeight}
                  letterSpacing={rightMetrics.letterSpacing}
                  lineHeightPx={rightMetrics.lineHeight}
                  showAdd={true}
                  showDel={!alteredOnly}
                  side="right"
                  lineRoles={rightLineRoles}
                />
                <div
                  data-testid="diff-right-gutter"
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
              {(() => {
                let addCount = 0, delCount = 0, modCount = 0;
                for (const st of steps) {
                  if (st.type === 'add') addCount++;
                  else if (st.type === 'del') delCount++;
                  else if (st.type === 'mod') modCount++;
                }
                return (
                  <div data-testid="diff-counters" style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8, color: 'rgba(138,155,168,0.9)' }}>
                    <span data-testid="count-add" style={{ color: 'rgba(46,160,67,0.9)' }}>+{addCount}</span>
                    <span data-testid="count-del" style={{ color: 'rgba(248,81,73,0.9)' }}>-{delCount}</span>
                    <span data-testid="count-mod" style={{ color: 'rgba(100,148,237,0.9)' }}>~{modCount}</span>
                    <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: 'rgba(191, 204, 214, 0.85)', userSelect: 'none', lineHeight: '20px' }}>Changed-only preview</span>
                      <Switch checked={changedOnlyPreview} onChange={(e) => setChangedOnlyPreview((e.currentTarget as HTMLInputElement).checked)} aria-label="Changed-only preview" label={undefined} style={{ margin: 0 }} />
                    </span>
                  </div>
                );
              })()}
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
                  const rows: React.ReactNode[] = [];
                  const muted = 'var(--diff-fg-muted, rgba(191, 204, 214, 0.85))';

                  type LocalSeg = { text: string; changed: boolean; diffType?: 'add' | 'del' };

                  function renderLine(rowKey: string, displayNum: number, marker: '+' | '-' | ' ' | '~', content: string, segments?: LocalSeg[]) {
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
                    const fg = muted;
                    const cls = isAdd ? 'diff-line add' : isDel ? 'diff-line del' : isMod ? 'diff-line mod' : 'diff-line';
                    return (
                      <div
                        key={rowKey}
                        data-preview-line
                        data-marker={marker}
                        data-display-index={displayNum}
                        className={cls}
                        style={{ padding: '0 6px 0 0', color: fg, background: bg }}
                      >
                        <span style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'baseline', gap: 6, color: 'rgba(138,155,168,0.7)', userSelect: 'none' }}>
                          <span style={{ width: 14, textAlign: 'center' }}>{marker !== ' ' ? marker : ''}</span>
                          <span>{displayNum}</span>
                        </span>
                        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', minWidth: 0 }}>
                          {segments
                            ? segments.map((s, i) => (
                                <span key={i} className={s.changed ? (s.diffType === 'add' ? 'diff-seg diff-add' : 'diff-seg diff-del') : undefined} data-diff-token data-type={s.changed ? (s.diffType === 'add' ? 'add' : 'del') : 'eq'}>
                                  {s.text || ' '}
                                </span>
                              ))
                            : content || ' '}
                        </span>
                      </div>
                    );
                  }

                  // Use the same alignment as side-by-side view to ensure emoji pairing consistency
                  // Handle empty field cases
                  const leftIsEmpty = leftNorm.trim() === '';
                  const rightIsEmpty = rightNorm.trim() === '';
                  
                  let unifiedSteps: any[];
                  let unifiedLeftNums: number[];
                  let unifiedRightNums: number[];
                  
                  if (leftIsEmpty && rightIsEmpty) {
                    // Both empty - no diff to show
                    unifiedSteps = [];
                    unifiedLeftNums = [];
                    unifiedRightNums = [];
                  } else if (leftIsEmpty && !rightIsEmpty) {
                    // Only right side has content - show as all additions
                    const rightLines = splitLinesNoTrailingEmpty(rightNorm);
                    unifiedSteps = rightLines.map((_, j) => ({ type: 'add' as const, j }));
                    unifiedLeftNums = rightLines.map(() => 0);
                    unifiedRightNums = rightLines.map((_, j) => j + 1);
                  } else if (!leftIsEmpty && rightIsEmpty) {
                    // Only left side has content - show as all deletions
                    const leftLines = splitLinesNoTrailingEmpty(leftNorm);
                    unifiedSteps = leftLines.map((_, i) => ({ type: 'del' as const, i }));
                    unifiedLeftNums = leftLines.map((_, i) => i + 1);
                    unifiedRightNums = leftLines.map(() => 0);
                  } else {
                    // Both have content - normal diff
                    const result = alignLines(leftNorm, rightNorm, { ignoreWhitespace: debIgnoreWs });
                    unifiedSteps = result.steps;
                    unifiedLeftNums = result.leftNums;
                    unifiedRightNums = result.rightNums;
                  }
                  
                  for (let idx = 0; idx < unifiedSteps.length; idx++) {
                    const st = unifiedSteps[idx] as any;
                    if (changedOnlyPreview && st.type === 'same') continue;
                    if (st.type === 'same') {
                      const t = leftLines[st.i as number] || '';
                      const num = (unifiedLeftNums && unifiedLeftNums[idx]) ? unifiedLeftNums[idx] : (st.i as number) + 1;
                      rows.push(renderLine(`same-${idx}`, num, ' ', t));
                      continue;
                    }
                    if (st.type === 'del') {
                      const t = leftLines[st.i as number] || '';
                      // - rows: use leftNums[idx] (left local numbers, no renumbering drift)
                      const num = (unifiedLeftNums && unifiedLeftNums[idx]) ? unifiedLeftNums[idx] : (st.i as number) + 1;
                      rows.push(renderLine(`del-${idx}`, num, '-', t));
                      continue;
                    }
                    if (st.type === 'add') {
                      const t = rightLines[st.j as number] || '';
                      // + rows: use rightNums[idx] (right local numbers)
                      const num = (unifiedRightNums && unifiedRightNums[idx]) ? unifiedRightNums[idx] : (st.j as number) + 1;
                      rows.push(renderLine(`add-${idx}`, num, '+', t));
                      continue;
                    }
                    if (st.type === 'mod') {
                      const aRaw = leftLines[st.i as number] || '';
                      const bRaw = rightLines[st.j as number] || '';
                      const segs = mergedSegments(aRaw, bRaw, { ignoreWhitespace: debIgnoreWs, mode: debCharInline ? 'char' : 'word' }) as unknown as LocalSeg[];
                      // ~ rows: use leftNums[idx] (left local numbers) 
                      const num = (unifiedLeftNums && unifiedLeftNums[idx]) ? unifiedLeftNums[idx] : (st.i as number) + 1;
                      // For unified preview: show the LEFT content with segments for highlighting
                      rows.push(renderLine(`mod-${idx}`, num, '~', aRaw, segs));
                    }
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


