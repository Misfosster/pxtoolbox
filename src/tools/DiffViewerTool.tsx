import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Switch } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import { useLocalStorageBoolean } from '../components/ui/useLocalStorageBoolean';
import { normalizeEOL } from '../utils/diff/normalize';
import { alignLines, splitLinesNoTrailingEmpty } from '../utils/diff/line';
import { useGutter } from '../hooks/useGutter';
import { useWorkspaceWidth } from '../hooks/useWorkspaceWidth';
import UnifiedPreview from '../components/diff/UnifiedPreview';
import { useOverlaySegments } from '../hooks/useOverlaySegments';
import { useDiffNavigation } from '../hooks/useDiffNavigation';
import DiffSidePane from '../components/diff/DiffSidePane';

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
  const [showUnifiedPreview, setShowUnifiedPreview] = useLocalStorageBoolean(
    'pxtoolbox.diff.showUnifiedPreview',
    true,
  );
  const [activePane, setActivePane] = useState<'left' | 'right'>('left');
  const [leftScrollTop, setLeftScrollTop] = useState<number>(0);
  const [rightScrollTop, setRightScrollTop] = useState<number>(0);
  const [leftHeight, setLeftHeight] = useState<number>(140);
  const [rightHeight, setRightHeight] = useState<number>(140);
  const [leftHighlightLine, setLeftHighlightLine] = useState<number | null>(null);
  const [rightHighlightLine, setRightHighlightLine] = useState<number | null>(null);
  const leftHighlightTimeoutRef = useRef<number | null>(null);
  const rightHighlightTimeoutRef = useRef<number | null>(null);
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
  const setWorkspaceWidth = useWorkspaceWidth();
  const widthModeRef = useRef<'default' | 'full'>('default');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const areas = [leftRef.current, rightRef.current].filter(
      (el): el is HTMLTextAreaElement => Boolean(el),
    );

    if (!areas.length) {
      return;
    }

    const update = () => {
      const container = document.querySelector('.content-container') as HTMLElement | null;
      const containerWidth = container?.clientWidth ?? window.innerWidth;
      if (!containerWidth) {
        return;
      }

      const defaultWidth = containerWidth * 0.75;
      // Promote to wider layout only when panes exceed comfort width by a clear margin
      const promoteThreshold = defaultWidth + 64;

      // Consider only the editable panes for width escalation; unified preview
      // should not force full-width on its own.
      const needsFull = containerWidth >= 900 && areas.some((el) => {
        const rectW = el.getBoundingClientRect().width;
        const clientW = el.clientWidth;
        const scrollW = el.scrollWidth;
        const styleW = parseFloat((el as HTMLElement).style.width || '0') || 0;
        // Trigger full width if any of:
        // - element appears wider than promote threshold (rect width)
        // - element has horizontal overflow (scrollWidth > clientWidth)
        // - an explicit style width exceeds promote threshold (e.g., test-driven)
        return rectW > promoteThreshold || scrollW > clientW + 2 || styleW > promoteThreshold;
      });
      const nextMode: 'default' | 'full' = needsFull ? 'full' : 'default';
      if (nextMode !== widthModeRef.current) {
        widthModeRef.current = nextMode;
        setWorkspaceWidth(nextMode);
      }
    };

    const ro = new ResizeObserver(update);
    areas.forEach((el) => ro.observe(el));
    const previewEl = document.getElementById('diff-output');
    if (previewEl) ro.observe(previewEl);

    // Also observe style attribute changes to catch explicit width tweaks (e.g., tests)
    const mo = new MutationObserver(update);
    areas.forEach((el) => mo.observe(el, { attributes: true, attributeFilter: ['style'] }));
    if (previewEl) mo.observe(previewEl, { attributes: true, attributeFilter: ['style'] });

    window.addEventListener('resize', update);
    update();

    return () => {
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', update);
      widthModeRef.current = 'default';
      setWorkspaceWidth('default');
    };
  }, [setWorkspaceWidth]);

  // Normalize EOLs (debounced for heavy diff)
  const leftNorm = useMemo(() => normalizeEOL(debLeft), [debLeft]);
  const rightNorm = useMemo(() => normalizeEOL(debRight), [debRight]);
  // Normalize EOLs (immediate) previously used for overlay; retained approach removed to keep one source of truth

  // Build alignment (steps + local numbering) used for side-by-side view and preview (debounced)
  const alignment = useMemo(
    () => alignLines(leftNorm, rightNorm, { ignoreWhitespace: debIgnoreWs }),
    [leftNorm, rightNorm, debIgnoreWs],
  );
  const { steps, leftNums, rightNums } = alignment;

  // Split lines for content lookup
  const leftLines = useMemo(() => splitLinesNoTrailingEmpty(leftNorm), [leftNorm]);
  const rightLines = useMemo(() => splitLinesNoTrailingEmpty(rightNorm), [rightNorm]);

  // Build inline overlay segments and line roles per side mapped to ACTUAL lines per side (no placeholder rows)
  const { leftOverlayLines, rightOverlayLines, leftLineRoles, rightLineRoles } = useOverlaySegments({
    steps,
    leftLines,
    rightLines,
    charLevel: debCharInline,
  });

  const { left: leftNav, right: rightNav } = useDiffNavigation({
    steps,
    leftLines,
    rightLines,
    leftRef,
    rightRef,
    leftOverlaySegments: leftOverlayLines,
    rightOverlaySegments: rightOverlayLines,
  });
  const {
    goNextChange: goNextLeft,
    goPrevChange: goPrevLeft,
    hasChanges: leftHasChanges,
    changeIndex: leftChangeIndex,
    totalChanges: leftTotalChanges,
    lineIndex: leftLineIndex,
  } = leftNav;
  const {
    goNextChange: goNextRight,
    goPrevChange: goPrevRight,
    hasChanges: rightHasChanges,
    changeIndex: rightChangeIndex,
    totalChanges: rightTotalChanges,
    lineIndex: rightLineIndex,
  } = rightNav;
  const navigationAvailable = leftHasChanges || rightHasChanges;

  useEffect(() => {
    if (leftLineIndex != null && leftLineIndex >= 0) {
      setLeftHighlightLine(leftLineIndex);
      if (leftHighlightTimeoutRef.current != null) {
        window.clearTimeout(leftHighlightTimeoutRef.current);
      }
      leftHighlightTimeoutRef.current = window.setTimeout(() => {
        setLeftHighlightLine(null);
        leftHighlightTimeoutRef.current = null;
      }, 700);
    } else {
      setLeftHighlightLine(null);
    }
  }, [leftLineIndex]);

  useEffect(() => {
    if (rightLineIndex != null && rightLineIndex >= 0) {
      setRightHighlightLine(rightLineIndex);
      if (rightHighlightTimeoutRef.current != null) {
        window.clearTimeout(rightHighlightTimeoutRef.current);
      }
      rightHighlightTimeoutRef.current = window.setTimeout(() => {
        setRightHighlightLine(null);
        rightHighlightTimeoutRef.current = null;
      }, 700);
    } else {
      setRightHighlightLine(null);
    }
  }, [rightLineIndex]);

  useEffect(() => {
    return () => {
      if (leftHighlightTimeoutRef.current != null) {
        window.clearTimeout(leftHighlightTimeoutRef.current);
      }
      if (rightHighlightTimeoutRef.current != null) {
        window.clearTimeout(rightHighlightTimeoutRef.current);
      }
    };
  }, []);

  const navigate = useCallback(
    (side: 'left' | 'right', direction: 'next' | 'prev', allowFallback = false) => {
      const attempt = (target: 'left' | 'right') => {
        setActivePane(target);
        if (target === 'left') {
          return direction === 'next' ? goNextLeft() : goPrevLeft();
        }
        return direction === 'next' ? goNextRight() : goPrevRight();
      };

      const primaryHasChanges = side === 'left' ? leftHasChanges : rightHasChanges;
      let moved = false;

      if (primaryHasChanges) {
        moved = attempt(side);
      } else {
        setActivePane(side);
      }

      if (!moved && allowFallback) {
        const fallbackSide = side === 'left' ? 'right' : 'left';
        const fallbackHasChanges = fallbackSide === 'left' ? leftHasChanges : rightHasChanges;
        if (fallbackHasChanges) {
          moved = attempt(fallbackSide);
        }
      }

      return moved;
    },
    [goNextLeft, goPrevLeft, goNextRight, goPrevRight, leftHasChanges, rightHasChanges],
  );

  const handleGoNext = useCallback(() => {
    navigate(activePane, 'next', true);
  }, [activePane, navigate]);

  const handleGoPrev = useCallback(() => {
    navigate(activePane, 'prev', true);
  }, [activePane, navigate]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.altKey || event.shiftKey || event.ctrlKey || event.metaKey) {
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (navigationAvailable) {
          handleGoNext();
        }
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (navigationAvailable) {
          handleGoPrev();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleGoNext, handleGoPrev, navigationAvailable]);

  return (
    <ToolShell
      title="Diff Viewer"
      description="Compare two texts side by side. Inline diffs use smart word-level by default (small edits within a word are considered similar); enable the toggle to diff per character. Unified diff is shown centered below."
      toolId="diff"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(191, 204, 214, 0.85)', userSelect: 'none', lineHeight: '20px' }}>Show unified preview</span>
            <Switch
              checked={showUnifiedPreview}
              onChange={(event) => setShowUnifiedPreview((event.currentTarget as HTMLInputElement).checked)}
              aria-label="Show unified preview"
              label={undefined}
              style={{ margin: 0 }}
              data-testid="toggle-show-preview"
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
          <div style={{ flex: '1 1 600px', minWidth: 480 }}>
            <DiffSidePane
              id="diff-left"
              label="Original"
              value={leftText}
              onChange={setLeftText}
              onFocus={() => setActivePane('left')}
              onPasteCollapse={() => setLeftCollapsed(true)}
              placeholder="Paste original text."
              textareaRef={leftRef}
              collapsed={leftCollapsed}
              minRows={MIN_ROWS}
              collapsedMaxRows={6}
              height={leftHeight}
              setHeight={setLeftHeight}
              scrollTop={leftScrollTop}
              setScrollTop={setLeftScrollTop}
              gutter={leftGutter}
              metrics={leftMetrics}
              overlaySegments={leftOverlayLines}
              overlayRoles={leftLineRoles}
              overlayId="diff-left-overlay"
              overlaySide="left"
              showOverlay={!alteredOnly}
              showAdd={false}
              showDel
              gutterWidth={GUTTER_WIDTH_PX}
              gutterInnerLeft={GUTTER_INNER_LEFT_PX}
              contentGap={CONTENT_GAP_PX}
              onPrevChange={() => navigate('left', 'prev')}
              onNextChange={() => navigate('left', 'next')}
              navDisabled={!leftHasChanges}
              prevTooltip="Previous change (Alt+Up)"
              nextTooltip="Next change (Alt+Down)"
              changeIndex={leftChangeIndex}
              totalChanges={leftTotalChanges}
              highlightLineIndex={leftHighlightLine}
              counterTestId="left-change-counter"
            />
          </div>
          <div style={{ flex: '1 1 600px', minWidth: 480 }}>
            <DiffSidePane
              id="diff-right"
              label="Altered"
              value={rightText}
              onChange={setRightText}
              onFocus={() => setActivePane('right')}
              onPasteCollapse={() => setRightCollapsed(true)}
              placeholder="Paste altered text."
              textareaRef={rightRef}
              collapsed={rightCollapsed}
              minRows={MIN_ROWS}
              collapsedMaxRows={6}
              height={rightHeight}
              setHeight={setRightHeight}
              scrollTop={rightScrollTop}
              setScrollTop={setRightScrollTop}
              gutter={rightGutter}
              metrics={rightMetrics}
              overlaySegments={rightOverlayLines}
              overlayRoles={rightLineRoles}
              overlayId="diff-right-overlay"
              overlaySide="right"
              showOverlay
              showAdd
              showDel={!alteredOnly}
              gutterWidth={GUTTER_WIDTH_PX}
              gutterInnerLeft={GUTTER_INNER_LEFT_PX}
              contentGap={CONTENT_GAP_PX}
              onPrevChange={() => navigate('right', 'prev')}
              onNextChange={() => navigate('right', 'next')}
              navDisabled={!rightHasChanges}
              prevTooltip="Previous change (Alt+Up)"
              nextTooltip="Next change (Alt+Down)"
              changeIndex={rightChangeIndex}
              totalChanges={rightTotalChanges}
              highlightLineIndex={rightHighlightLine}
              counterTestId="right-change-counter"
            />
          </div>
        </div>
        {showUnifiedPreview && (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
            <div style={{ flex: '1 1 0', width: '100%' }}>
              <UnifiedPreview
                id="diff-output"
                height={PREVIEW_HEIGHT}
                steps={steps}
                leftText={leftNorm}
                rightText={rightNorm}
                leftLines={leftLines}
                rightLines={rightLines}
                leftNums={leftNums}
                rightNums={rightNums}
                ignoreWhitespace={debIgnoreWs}
                charLevel={debCharInline}
                changedOnly={changedOnlyPreview}
                onChangedOnlyChange={setChangedOnlyPreview}
              />
            </div>
          </div>
        )}
        <div className="card-bottom" style={{ justifyItems: 'start' }}>
          <Button icon="eraser" onClick={() => { setLeftText(''); setRightText(''); setLeftCollapsed(false); setRightCollapsed(false); }} disabled={!leftText && !rightText}>Clear</Button>
        </div>
      </Card>
    </ToolShell>
  );
};

export default DiffViewerTool;
