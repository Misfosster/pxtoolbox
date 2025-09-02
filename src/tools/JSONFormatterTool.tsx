import React, { useState } from 'react';
import { Button, ButtonGroup, Card, Intent } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import ResizableTextArea from '../components/ui/ResizableTextArea';
import Field from '../components/ui/Field';
import CopyButton from '../components/ui/CopyButton';
import OverlayActions from '../components/ui/OverlayActions';
import { prettyPrintJson, tryParseJson, minifyJson } from '../utils/json';

const JSONFormatterTool: React.FC = () => {
  const [rawInput, setRawInput] = useState<string>('');
  const [formatted, setFormatted] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const leftCount = rawInput.length;
  const rightCount = formatted.length;

  function handleLeftChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setRawInput(next);
    if (!next.trim()) {
      setFormatted('');
      setError(null);
      return;
    }
    const result = tryParseJson(next);
    if (result.error) {
      setFormatted('');
      setError(result.error);
    } else {
      setFormatted(prettyPrintJson(result.value));
      setError(null);
    }
  }

  function handleRightChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    // Allow editing the formatted JSON; validate and keep rawInput in sync (minified)
    const next = e.target.value;
    setFormatted(next);
    if (!next.trim()) {
      setRawInput('');
      setError(null);
      return;
    }
    const result = tryParseJson(next);
    if (result.error) {
      setRawInput('');
      setError(result.error);
    } else {
      setRawInput(minifyJson(result.value));
      setError(null);
    }
  }

  function handleFormat() {
    const result = tryParseJson(rawInput);
    if (result.error) {
      setError(result.error);
      setFormatted('');
      return;
    }
    setFormatted(prettyPrintJson(result.value));
    setError(null);
  }

  function handleMinify() {
    const result = tryParseJson(formatted || rawInput);
    if (result.error) {
      setError(result.error);
      return;
    }
    const minified = minifyJson(result.value);
    setRawInput(minified);
    setFormatted(prettyPrintJson(result.value));
    setError(null);
  }

  function handleClear() {
    setRawInput('');
    setFormatted('');
    setError(null);
  }

  return (
    <ToolShell
      title="JSON Formatter"
      description="Validate, pretty‑print, and minify JSON. Edit either side; changes are validated live."
    >
      <Card elevation={1}>
        <div className="dual-pane" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 8 }}>
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
                style={{ marginBottom: 0, paddingRight: 88 }}
              />
              <OverlayActions>
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
          <Field
            label="JSON (formatted)"
            inputId="json-output"
            helperText={
              error ? undefined : (
                <span>
                  Editable formatted view. Invalid edits will show an error on the left.
                  <span style={{ marginLeft: 8 }}>
                    <strong>{rightCount}</strong> chars
                  </span>
                </span>
              )
            }
            error={null}
          >
            <div style={{ position: 'relative' }}>
              <ResizableTextArea
                id="json-output"
                placeholder="Formatted JSON will appear… (you can edit here)"
                value={formatted}
                onChange={handleRightChange}
                minRows={10}
                autosize
                style={{ marginBottom: 0, paddingRight: 88 }}
              />
              <OverlayActions>
                <CopyButton
                  icon="clipboard"
                  successIcon="tick"
                  intent={Intent.PRIMARY}
                  text={formatted}
                  disabled={!formatted || !!error}
                  label="Copy formatted"
                />
              </OverlayActions>
            </div>
          </Field>
        </div>
        <div className="card-bottom" style={{ gridTemplateColumns: '1fr 1fr', justifyItems: 'start' }}>
          <ButtonGroup>
            <Button icon="layout-auto" onClick={handleFormat} disabled={!rawInput}>
              Format
            </Button>
            <Button icon="compressed" onClick={handleMinify} disabled={!rawInput && !formatted}>
              Minify
            </Button>
            <Button icon="eraser" onClick={handleClear} disabled={!rawInput && !formatted}>
              Clear
            </Button>
          </ButtonGroup>
        </div>
      </Card>
    </ToolShell>
  );
};

export default JSONFormatterTool;


