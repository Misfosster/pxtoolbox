import React, { useMemo, useRef, useState } from 'react';
import { Button, ButtonGroup, Card, Intent } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import ResizableTextArea from '../components/ui/ResizableTextArea';
import Field from '../components/ui/Field';
import CopyButton from '../components/ui/CopyButton';
import OverlayActions from '../components/ui/OverlayActions';
import { prettyPrintJson, tryParseJson, minifyJson } from '../utils/json';
import JsonFoldView, { type JsonFoldViewApi } from '../components/ui/JsonFoldView';

const JSONFormatterTool: React.FC = () => {
  const [rawInput, setRawInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const treeApiRef = useRef<JsonFoldViewApi | null>(null);
  const [textCollapsed, setTextCollapsed] = useState<boolean>(false);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState<boolean>(false);
  const [treeCollapsed, setTreeCollapsed] = useState<boolean>(false);

  const leftCount = rawInput.length;

  const formattedPretty = useMemo(() => {
    if (!rawInput) return '';
    const r = tryParseJson(rawInput);
    return r.error ? '' : prettyPrintJson(r.value);
  }, [rawInput]);

  const parsedForTree = useMemo(() => {
    if (!rawInput) return null;
    const r = tryParseJson(rawInput);
    if (!r.error) return r.value;
    return null;
  }, [rawInput]);

  function handleLeftChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const prevScroll = { x: window.scrollX, y: window.scrollY };
    const next = e.target.value;
    const wasEmpty = !rawInput.trim();
    setRawInput(next);
    if (!next.trim()) {
      setError(null);
      requestAnimationFrame(() => window.scrollTo(prevScroll.x, prevScroll.y));
      return;
    }
    const result = tryParseJson(next);
    if (result.error) {
      setError(result.error);
    } else {
      // Pretty-on-paste/type when valid JSON
      setRawInput(prettyPrintJson(result.value));
      setError(null);
      // Auto-collapse text pane once after the first successful paste/type from empty
      if (!hasAutoCollapsed && wasEmpty && !textCollapsed) {
        setTextCollapsed(true);
        setHasAutoCollapsed(true);
      }
    }
    requestAnimationFrame(() => window.scrollTo(prevScroll.x, prevScroll.y));
  }

  function handleFormat() {
    const result = tryParseJson(rawInput);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRawInput(prettyPrintJson(result.value));
    setError(null);
  }

  function handleMinify() {
    const result = tryParseJson(rawInput);
    if (result.error) {
      setError(result.error);
      return;
    }
    const minified = minifyJson(result.value);
    setRawInput(minified);
    setError(null);
  }

  function handleClear() {
    setRawInput('');
    setError(null);
  }

  return (
    <ToolShell
      title="JSON Formatter"
      description="Validate, pretty‑print, and minify JSON. Edit either side; changes are validated live."
      actions={(
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            icon={textCollapsed ? 'panel-table' : 'panel-stats'}
            minimal
            small
            onClick={() => setTextCollapsed((v) => !v)}
            data-testid="toggle-text-pane"
          >
            {textCollapsed ? 'Expand text' : 'Collapse text'}
          </Button>
        </div>
      )}
    >
      <Card elevation={1}>
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap'
          }}
        >
          <div
            data-testid="json-left-pane"
            style={{
              flex: '1 1 460px',
              minWidth: 320,
              overflow: 'hidden',
              position: 'relative',
              ...(textCollapsed ? { height: 40, maxHeight: 40 } : {})
            }}
          >
            {textCollapsed ? (
              <div style={{ height: 40, border: '1px solid rgba(138,155,168,0.15)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)' }}>
                Text (collapsed)
              </div>
            ) : (
              <Field
                label="JSON (formatted)"
                inputId="json-input"
                helperText={
                  error ? undefined : (
                    <span>
                      Paste any JSON value (object, array, string, number, etc.).
                      <span style={{ marginLeft: 8 }}>
                        <strong>{leftCount}</strong> chars
                      </span>
                    </span>
                  )
                }
                error={error}
              >
                <div style={{ position: 'relative' }}>
                  <ResizableTextArea
                    id="json-input"
                    placeholder="Type or paste JSON…"
                    value={rawInput}
                    onChange={handleLeftChange}
                    minRows={10}
                    autosize
                    style={{ marginBottom: 0, paddingRight: 200 }}
                  />
                  <OverlayActions gapPx={10}>
                    <Button
                      icon="layout-auto"
                      minimal
                      small
                      onClick={handleFormat}
                      disabled={!rawInput || !!error}
                      data-testid="format-btn"
                    >
                      Format
                    </Button>
                    <Button
                      icon="compressed"
                      minimal
                      small
                      onClick={handleMinify}
                      disabled={!rawInput || !!error}
                      data-testid="minify-btn"
                    >
                      Minify
                    </Button>
                    <CopyButton
                      icon="duplicate"
                      successIcon="tick"
                      intent={Intent.NONE}
                      text={rawInput}
                      disabled={!rawInput}
                      label="Copy raw"
                    />
                  </OverlayActions>
                </div>
              </Field>
            )}
          </div>

          <div
            data-testid="json-tree-pane"
            style={{
              flex: '1 1 460px',
              minWidth: 320,
              position: 'relative'
            }}
          >
            <JsonFoldView
              value={parsedForTree}
              apiRef={(api) => (treeApiRef.current = api)}
              onChange={(next) => {
                const prevScroll = { x: window.scrollX, y: window.scrollY };
                setRawInput(prettyPrintJson(next));
                requestAnimationFrame(() => window.scrollTo(prevScroll.x, prevScroll.y));
              }}
            />
            <OverlayActions gapPx={10} style={{ top: 8, bottom: 'auto' }}>
              <Button
                minimal
                small
                onClick={() => {
                  if (treeCollapsed) {
                    treeApiRef.current?.expandAll();
                    setTreeCollapsed(false);
                  } else {
                    treeApiRef.current?.collapseAll();
                    setTreeCollapsed(true);
                  }
                }}
                icon={treeCollapsed ? 'double-chevron-down' : 'double-chevron-up'}
                aria-label={treeCollapsed ? 'Expand all' : 'Collapse all'}
                title={treeCollapsed ? 'Expand all' : 'Collapse all'}
                data-testid="toggle-collapse-all"
              >
                {treeCollapsed ? 'Expand all' : 'Collapse all'}
              </Button>
            </OverlayActions>
            <OverlayActions gapPx={10}>
              <CopyButton
                icon="clipboard"
                successIcon="tick"
                intent={Intent.PRIMARY}
                text={formattedPretty}
                disabled={!formattedPretty || !!error}
                label="Copy formatted"
              />
            </OverlayActions>
          </div>
        </div>

        <div className="card-bottom" style={{ justifyItems: 'start' }}>
          <ButtonGroup>
            <Button icon="eraser" onClick={handleClear} disabled={!rawInput}>
              Clear
            </Button>
          </ButtonGroup>
        </div>
      </Card>
    </ToolShell>
  );
};

export default JSONFormatterTool;


