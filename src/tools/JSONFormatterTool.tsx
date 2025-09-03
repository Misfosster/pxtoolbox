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
      // Minify-on-paste/type when valid JSON
      setRawInput(minifyJson(result.value));
      setError(null);
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
    >
      <Card elevation={1}>
        <Field
          label="JSON (raw/minified)"
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

        <div style={{ marginTop: 12, position: 'relative' }}>
          <JsonFoldView
            value={parsedForTree}
            apiRef={(api) => (treeApiRef.current = api)}
            onChange={(next) => {
              const prevScroll = { x: window.scrollX, y: window.scrollY };
              setRawInput(minifyJson(next));
              requestAnimationFrame(() => window.scrollTo(prevScroll.x, prevScroll.y));
            }}
          />
          <OverlayActions gapPx={10}>
            <CopyButton
              icon="clipboard"
              successIcon="tick"
              intent={Intent.PRIMARY}
              text={formattedPretty}
              disabled={!formattedPretty || !!error}
              label="Copy formatted"
            />
            <Button
              icon="chevron-down"
              minimal
              small
              onClick={() => treeApiRef.current?.expandAll()}
              aria-label="Expand all"
            />
            <Button
              icon="chevron-right"
              minimal
              small
              onClick={() => treeApiRef.current?.collapseAll()}
              aria-label="Collapse all"
            />
          </OverlayActions>
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


