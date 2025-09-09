import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { Button, Card } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import ResizableTextArea from '../components/ui/ResizableTextArea';
import Field from '../components/ui/Field';

function simpleDiff(a: string, b: string): string {
  if (!a && !b) return '';
  const aLines = a.split(/\r?\n/);
  const bLines = b.split(/\r?\n/);
  const max = Math.max(aLines.length, bLines.length);
  const out: string[] = [];
  for (let i = 0; i < max; i++) {
    const left = aLines[i] ?? '';
    const right = bLines[i] ?? '';
    if (left === right) out.push('  ' + left);
    else {
      if (left) out.push('- ' + left);
      if (right) out.push('+ ' + right);
    }
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
    const charWidth = ctx.measureText('M').width || 8;
    const columns = Math.max(1, Math.floor(contentWidth / charWidth));
    const gutterLines: string[] = [];
    const logical = text.split('\n');
    for (let i = 0; i < logical.length; i++) {
      const line = logical[i];
      const wraps = Math.max(1, Math.ceil((line.length || 1) / columns));
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

  const diffText = useMemo(() => simpleDiff(leftText, rightText), [leftText, rightText]);

  return (
    <ToolShell
      title="Diff Viewer"
      description="Compare two texts side by side. Unified diff is shown centered below."
    >
      <Card elevation={1}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'nowrap', alignItems: 'stretch' }}>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <Field label="Original" inputId="diff-left">
              <div style={{ position: 'relative' }}>
                <ResizableTextArea
                  id="diff-left"
                  value={leftText}
                  onChange={(e) => setLeftText(e.target.value)}
                  placeholder="Paste original text…"
                  minRows={16}
                  autosize
                  style={{
                    paddingLeft: 48,
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
                    left: 8,
                    top: leftMetrics.paddingTop,
                    width: 38,
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
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <Field label="Altered" inputId="diff-right">
              <div style={{ position: 'relative' }}>
                <ResizableTextArea
                  id="diff-right"
                  value={rightText}
                  onChange={(e) => setRightText(e.target.value)}
                  placeholder="Paste altered text…"
                  minRows={16}
                  autosize
                  style={{
                    paddingLeft: 48,
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
                    left: 8,
                    top: rightMetrics.paddingTop,
                    width: 38,
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
                  height: 260,
                  overflow: 'auto',
                  resize: 'both',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                  whiteSpace: 'pre',
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
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: 10,
                          padding: '0 6px',
                          background: bg,
                          color: fg,
                        }}
                      >
                        <span style={{ width: 46, textAlign: 'right', color: 'rgba(138,155,168,0.7)', userSelect: 'none' }}>
                          {displayNum}
                        </span>
                        <span style={{ whiteSpace: 'pre-wrap' }}>
                          {marker !== ' ' ? marker + ' ' : '  '}
                          {segments
                            ? segments.map((s, i) => (
                                <span
                                  key={i}
                                  style={
                                    s.changed
                                      ? (s.diffType === 'add'
                                          ? { background: 'rgba(46, 160, 67, 0.55)', color: '#c0ffd0', borderRadius: 2, padding: '0 2px', fontWeight: 600 }
                                          : { background: 'rgba(248, 81, 73, 0.55)', color: '#ffd1cc', borderRadius: 2, padding: '0 2px', fontWeight: 600 }
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

                  function splitInline(a: string, b: string): [DiffSeg[], DiffSeg[]] {
                    let start = 0;
                    const maxStart = Math.min(a.length, b.length);
                    while (start < maxStart && a[start] === b[start]) start++;
                    let end = 0;
                    const aRem = a.length - start;
                    const bRem = b.length - start;
                    const maxEnd = Math.min(aRem, bRem);
                    while (end < maxEnd && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
                    if (start + end > a.length) end = Math.max(0, a.length - start);
                    if (start + end > b.length) end = Math.max(0, b.length - start);
                    const aMid = a.slice(start, a.length - end);
                    const bMid = b.slice(start, b.length - end);
                    const commonStart = a.slice(0, start);
                    const commonEnd = a.slice(a.length - end);
                    const aSegs: DiffSeg[] = [
                      { text: commonStart, changed: false },
                      { text: aMid, changed: true, diffType: 'del' },
                      { text: commonEnd, changed: false },
                    ];
                    const bSegs: DiffSeg[] = [
                      { text: commonStart, changed: false },
                      { text: bMid, changed: true, diffType: 'add' },
                      { text: commonEnd, changed: false },
                    ];
                    return [aSegs, bSegs];
                  }

                  let lineNo = 1;
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i] || '';
                    if (line.startsWith('- ') && i + 1 < lines.length && lines[i + 1].startsWith('+ ')) {
                      const aRaw = line.slice(2);
                      const bRaw = lines[i + 1].slice(2);
                      const [aSegs, bSegs] = splitInline(aRaw, bRaw);
                      const merged: DiffSeg[] = [];
                      if (aSegs[0].text) merged.push(aSegs[0]);
                      if (aSegs[1].text) merged.push(aSegs[1]);
                      if (bSegs[1].text) merged.push(bSegs[1]);
                      if (aSegs[2].text) merged.push(aSegs[2]);
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


