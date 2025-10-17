import { useMemo } from 'react';
import { normalizeEOL } from '../../utils/diff/normalize';
import { alignLines, splitLinesNoTrailingEmpty } from '../../utils/diff/line';
import { useOverlaySegments } from '../../hooks/useOverlaySegments';
import { useGutter } from '../../hooks/useGutter';
import { stepKeyForMod, type ModResolution } from '../../utils/diff/stepKey';

export interface DiffComputationResult {
  // Normalized texts
  leftNorm: string;
  rightNorm: string;

  // Line data
  leftLines: string[];
  rightLines: string[];

  // Alignment data
  steps: any[];
  leftNums: number[];
  rightNums: number[];

  // Overlay data
  leftOverlayLines: any[];
  rightOverlayLines: any[];
  leftLineRoles: any[];
  rightLineRoles: any[];

  // Gutter data
  leftGutter: string;
  rightGutter: string;
  leftMetrics: any;
  rightMetrics: any;

  // Merged text
  mergedText: string;
}

export function useDiffComputation(
  leftText: string,
  rightText: string,
  ignoreWs: boolean,
  resolutions: Record<string, ModResolution>,
  leftRef: React.MutableRefObject<HTMLTextAreaElement | null>,
  rightRef: React.MutableRefObject<HTMLTextAreaElement | null>,
) {
  // Debounced inputs would go here if we had them
  const debLeft = leftText;
  const debRight = rightText;
  const debIgnoreWs = ignoreWs;

  // Normalize EOLs
  const leftNorm = useMemo(() => normalizeEOL(debLeft), [debLeft]);
  const rightNorm = useMemo(() => normalizeEOL(debRight), [debRight]);

  // Build alignment (steps + local numbering) used for side-by-side view and preview
  const leftLines = useMemo(() => splitLinesNoTrailingEmpty(leftNorm), [leftNorm]);
  const rightLines = useMemo(() => splitLinesNoTrailingEmpty(rightNorm), [rightNorm]);

  const alignment = useMemo(
    () => alignLines(leftNorm, rightNorm, { ignoreWhitespace: debIgnoreWs }),
    [leftNorm, rightNorm, debIgnoreWs],
  );
  const { steps: rawSteps, leftNums: rawLeftNums, rightNums: rawRightNums } = alignment;

  const filteredAlignment = useMemo(() => {
    if (!debIgnoreWs) {
      return { steps: rawSteps, leftNums: rawLeftNums, rightNums: rawRightNums };
    }
    const fSteps: typeof rawSteps = [];
    const fLeftNums: number[] = [];
    const fRightNums: number[] = [];

    rawSteps.forEach((step, idx) => {
      if (step.type === 'add') {
        const line = step.j != null ? rightLines[step.j] ?? '' : '';
        if (/^[\s\u200b\u200c\u200d\ufeff]*$/.test(line)) {
          return;
        }
      }
      if (step.type === 'del') {
        const line = step.i != null ? leftLines[step.i] ?? '' : '';
        if (/^[\s\u200b\u200c\u200d\ufeff]*$/.test(line)) {
          return;
        }
      }
      fSteps.push(step);
      fLeftNums.push(rawLeftNums[idx]);
      fRightNums.push(rawRightNums[idx]);
    });

    return { steps: fSteps, leftNums: fLeftNums, rightNums: fRightNums };
  }, [debIgnoreWs, rawSteps, rawLeftNums, rawRightNums, rightLines, leftLines]);

  const { steps, leftNums, rightNums } = filteredAlignment;

  const mergedText = useMemo(() => {
    if (!steps.length) {
      return leftNorm;
    }
    const lines: string[] = [];
    steps.forEach((step) => {
      if (step.type === 'same') {
        if (typeof step.i === 'number') {
          lines.push(leftLines[step.i] ?? '');
        }
        return;
      }
      if (step.type === 'add') {
        if (typeof step.j === 'number') {
          lines.push(rightLines[step.j] ?? '');
        }
        return;
      }
      if (step.type === 'del') {
        return;
      }
      if (step.type === 'mod') {
        const i = typeof step.i === 'number' ? step.i : null;
        const j = typeof step.j === 'number' ? step.j : null;
        const key = stepKeyForMod(i, j);
        const resolution = key ? resolutions[key] : undefined;
        if (resolution === 'keep-altered') {
          if (j != null) {
            lines.push(rightLines[j] ?? '');
          }
        } else if (i != null) {
          lines.push(leftLines[i] ?? '');
        }
      }
    });
    return lines.join('\n');
  }, [steps, leftLines, rightLines, leftNorm, rightNorm, resolutions]);

  // Build inline overlay segments and line roles per side mapped to ACTUAL lines per side (no placeholder rows)
  const { leftOverlayLines, rightOverlayLines } = useOverlaySegments({
    steps,
    leftLines,
    rightLines,
    ignoreWhitespace: debIgnoreWs,
    charLevel: false,
  });

  // Gutter computation
  const { gutter: leftGutter, metrics: leftMetrics } = useGutter(leftText, leftRef.current);
  const { gutter: rightGutter, metrics: rightMetrics } = useGutter(rightText, rightRef.current);

  return {
    leftNorm,
    rightNorm,
    leftLines,
    rightLines,
    steps,
    leftNums,
    rightNums,
    leftOverlayLines,
    rightOverlayLines,
    leftLineRoles: [],
    rightLineRoles: [],
    leftGutter,
    rightGutter,
    leftMetrics,
    rightMetrics,
    mergedText,
  };
}
