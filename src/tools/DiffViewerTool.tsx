import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import CopyButton from '../components/ui/CopyButton';
import { useDiffToolState } from './diff/diffState';
import { useDiffComputation } from './diff/diffComputation';
import { useWorkspaceWidth } from '../hooks/useWorkspaceWidth';
import { useDiffNavigation } from '../hooks/useDiffNavigation';
import DiffSidePane from '../components/diff/DiffSidePane';
import UnifiedPreview from '../components/diff/UnifiedPreview';
import type { ModResolution } from '../utils/diff/stepKey';


const DiffViewerTool: React.FC = () => {
  // Use extracted state management hook
  const state = useDiffToolState();

  // Use extracted computation hook
  const computation = useDiffComputation(
    state.leftText,
    state.rightText,
    state.ignoreWs,
    {}, // resolutions - would need to be passed from state if needed
    state.leftRef,
    state.rightRef,
  );

  // Use extracted navigation hook
  const { left: leftNav, right: rightNav } = useDiffNavigation({
    steps: computation.steps,
    leftLines: computation.leftLines,
    rightLines: computation.rightLines,
    leftRef: state.leftRef,
    rightRef: state.rightRef,
    leftOverlaySegments: computation.leftOverlayLines,
    rightOverlaySegments: computation.rightOverlayLines,
  });

  // Fixed gutter width to contain both line numbers and any inline indicators
  const GUTTER_WIDTH_PX = 40; // shared by textareas and preview
  const GUTTER_INNER_LEFT_PX = 0; // minimal space before numbers
  const CONTENT_GAP_PX = 8; // space between gutter and text content
  const MIN_ROWS = 16; // revert to shorter vertical size
  const PREVIEW_HEIGHT = 300; // moderate preview height
  // removed charInline; preview uses word-level
  const [resolutions, setResolutions] = useState<Record<string, ModResolution>>({});
  // no debounce needed for removed toggle
  const setWorkspaceWidth = useWorkspaceWidth();
  const widthModeRef = useRef<'default' | 'full'>('default');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const areas = [state.leftRef.current, state.rightRef.current].filter(
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
  }, [setWorkspaceWidth, state.leftRef, state.rightRef]);

  const handleResolutionChange = useCallback((key: string, value: ModResolution | null) => {
    setResolutions((prev) => {
      if (!value) {
        if (!(key in prev)) return prev;
        const { [key]: _omit, ...rest } = prev;
        return rest;
      }
      if (prev[key] === value) {
        return prev;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const {
    goNextChange: goNextLeft,
    goPrevChange: goPrevLeft,
    hasChanges: leftHasChanges,
    lineIndex: leftLineIndex,
  } = leftNav;
  const {
    goNextChange: goNextRight,
    goPrevChange: goPrevRight,
    hasChanges: rightHasChanges,
    lineIndex: rightLineIndex,
  } = rightNav;
  const navigationAvailable = leftHasChanges || rightHasChanges;

  useEffect(() => {
    if (leftLineIndex != null && leftLineIndex >= 0) {
      state.setLeftHighlightLine(leftLineIndex);
      if (state.leftHighlightTimeoutRef.current != null) {
        window.clearTimeout(state.leftHighlightTimeoutRef.current);
      }
      state.leftHighlightTimeoutRef.current = window.setTimeout(() => {
        state.setLeftHighlightLine(null);
        state.leftHighlightTimeoutRef.current = null;
      }, 700);
    } else {
      state.setLeftHighlightLine(null);
    }
  }, [leftLineIndex, state]);

  useEffect(() => {
    if (rightLineIndex != null && rightLineIndex >= 0) {
      state.setRightHighlightLine(rightLineIndex);
      if (state.rightHighlightTimeoutRef.current != null) {
        window.clearTimeout(state.rightHighlightTimeoutRef.current);
      }
      state.rightHighlightTimeoutRef.current = window.setTimeout(() => {
        state.setRightHighlightLine(null);
        state.rightHighlightTimeoutRef.current = null;
      }, 700);
    } else {
      state.setRightHighlightLine(null);
    }
  }, [rightLineIndex, state]);

  useEffect(() => {
    return () => {
      if (state.leftHighlightTimeoutRef.current != null) {
        window.clearTimeout(state.leftHighlightTimeoutRef.current);
      }
      if (state.rightHighlightTimeoutRef.current != null) {
        window.clearTimeout(state.rightHighlightTimeoutRef.current);
      }
    };
  }, [state]);

  const navigate = useCallback(
    (side: 'left' | 'right', direction: 'next' | 'prev', allowFallback = false) => {
      const attempt = (target: 'left' | 'right') => {
        state.setActivePane(target);
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
        state.setActivePane(side);
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
    [goNextLeft, goPrevLeft, goNextRight, goPrevRight, leftHasChanges, rightHasChanges, state],
  );

  const handleGoNext = useCallback(() => {
    navigate(state.activePane, 'next', true);
  }, [state.activePane, navigate]);

  const handleGoPrev = useCallback(() => {
    navigate(state.activePane, 'prev', true);
  }, [state.activePane, navigate]);

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'stretch' }}>
          <div style={{ flex: '1 1 600px', minWidth: 480 }}>
            <DiffSidePane
              id="diff-left"
              label="Original"
              value={state.leftText}
              onChange={state.setLeftText}
              onFocus={() => state.setActivePane('left')}
              onPasteCollapse={() => state.setLeftCollapsed(true)}
              placeholder="Paste original text."
              textareaRef={state.leftRef}
              collapsed={state.leftCollapsed}
              minRows={MIN_ROWS}
              collapsedMaxRows={6}
              height={state.leftHeight}
              setHeight={state.setLeftHeight}
              scrollTop={state.leftScrollTop}
              setScrollTop={state.setLeftScrollTop}
              gutter={computation.leftGutter}
              metrics={computation.leftMetrics}
              overlaySegments={[]}
              overlayRoles={[]}
              overlayId="diff-left-overlay"
              overlaySide="left"
              showOverlay={false}
              showAdd={false}
              showDel={false}
              gutterWidth={GUTTER_WIDTH_PX}
              gutterInnerLeft={GUTTER_INNER_LEFT_PX}
              contentGap={CONTENT_GAP_PX}
              onPrevChange={undefined}
              onNextChange={undefined}
              navDisabled={true}
              prevTooltip={undefined as any}
              nextTooltip={undefined as any}
              changeIndex={0}
              totalChanges={0}
              highlightLineIndex={state.leftHighlightLine}
              counterTestId="left-change-counter"
            />
          </div>
          <div style={{ flex: '1 1 600px', minWidth: 480 }}>
            <DiffSidePane
              id="diff-right"
              label="Altered"
              value={state.rightText}
              onChange={state.setRightText}
              onFocus={() => state.setActivePane('right')}
              onPasteCollapse={() => state.setRightCollapsed(true)}
              placeholder="Paste altered text."
              textareaRef={state.rightRef}
              collapsed={state.rightCollapsed}
              minRows={MIN_ROWS}
              collapsedMaxRows={6}
              height={state.rightHeight}
              setHeight={state.setRightHeight}
              scrollTop={state.rightScrollTop}
              setScrollTop={state.setRightScrollTop}
              gutter={computation.rightGutter}
              metrics={computation.rightMetrics}
              overlaySegments={[]}
              overlayRoles={[]}
              overlayId="diff-right-overlay"
              overlaySide="right"
              showOverlay={false}
              showAdd={false}
              showDel={false}
              gutterWidth={GUTTER_WIDTH_PX}
              gutterInnerLeft={GUTTER_INNER_LEFT_PX}
              contentGap={CONTENT_GAP_PX}
              onPrevChange={undefined}
              onNextChange={undefined}
              navDisabled={true}
              prevTooltip={undefined as any}
              nextTooltip={undefined as any}
              changeIndex={0}
              totalChanges={0}
              highlightLineIndex={state.rightHighlightLine}
              counterTestId="right-change-counter"
            />
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
          <div style={{ flex: '1 1 0', width: '100%' }}>
            <UnifiedPreview
                id="diff-output"
                height={PREVIEW_HEIGHT}
                steps={computation.steps}
                leftText={computation.leftNorm}
                rightText={computation.rightNorm}
                leftLines={computation.leftLines}
                rightLines={computation.rightLines}
                leftNums={computation.leftNums}
                rightNums={computation.rightNums}
                ignoreWhitespace={state.ignoreWs}
                charLevel={false}
                persistedOnly={state.persistedOnlyPreview}
                resolutions={resolutions}
                onResolutionChange={handleResolutionChange}
                onPersistedOnlyChange={state.setPersistedOnlyPreview}
                onIgnoreWhitespaceChange={state.setIgnoreWs}
            />
          </div>
        </div>
        <div className="card-bottom" style={{ justifyItems: 'start', display: 'flex', gap: 8 }}>
          <CopyButton text={computation.mergedText} label="Copy merged" ariaLabel="Copy merged text" disabled={!computation.mergedText} />
          <Button icon="eraser" onClick={() => { state.setLeftText(''); state.setRightText(''); state.setLeftCollapsed(false); state.setRightCollapsed(false); }} disabled={!state.leftText && !state.rightText}>Clear</Button>
        </div>
      </Card>
    </ToolShell>
  );
};

export default DiffViewerTool;
