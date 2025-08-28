import React, { useState } from 'react';
import { Button, ButtonGroup, Card, FormGroup, Intent } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import ResizableTextArea from '../components/ui/ResizableTextArea';
import { encodeToBase64, decodeFromBase64 } from '../utils/base64';

// encoding/decoding helpers moved to utils/base64

const Base64Tool: React.FC = () => {
  const [leftText, setLeftText] = useState<string>('');
  const [rightText, setRightText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copyInputStatus, setCopyInputStatus] = useState<'idle' | 'success'>('idle');
  const [copyOutputStatus, setCopyOutputStatus] = useState<'idle' | 'success'>('idle');

  async function copyToClipboard(text: string, target: 'input' | 'output') {
    const setStatus = target === 'input' ? setCopyInputStatus : setCopyOutputStatus;
    try {
      await navigator.clipboard.writeText(text);
      setStatus('success');
    } catch {
      // ignore errors; keep idle state
    } finally {
      // reset after brief feedback window
      setTimeout(() => setStatus('idle'), 1500);
    }
  }

  

  // Slider removed per request – autosize with optional See less toggle

  function handleLeftChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newLeft = e.target.value;
    setLeftText(newLeft);
    // no slider mode anymore
    if (!newLeft) {
      setRightText('');
      setError(null);
      return;
    }
    try {
      const encoded = encodeToBase64(newLeft);
      setRightText(encoded);
      setError(null);
    } catch {
      setRightText('');
      setError('Failed to encode input.');
    }
  }

  function handleRightChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newRight = e.target.value;
    setRightText(newRight);
    // no slider mode anymore
    if (!newRight) {
      setLeftText('');
      setError(null);
      return;
    }
    try {
      const decoded = decodeFromBase64(newRight);
      setLeftText(decoded);
      setError(null);
    } catch {
      setLeftText('');
      setError('Invalid Base64 input.');
    }
  }

  return (
    <ToolShell title="Base64 Encoder/Decoder" description="Convert text to and from Base64 (supports Base64URL, missing padding, and whitespace). All processing happens locally in your browser.">
      <Card elevation={1}>
        <div className="dual-pane" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 8 }}>
          <FormGroup className="resizable-group" label="Text" labelFor="b64-input">
            <ResizableTextArea
              id="b64-input"
              placeholder="Type or paste text…"
              value={leftText}
              onChange={handleLeftChange}
              minRows={8}
              autosize
              style={{ marginBottom: 0 }}
            />
          </FormGroup>
          <FormGroup
            className="resizable-group"
            label="Base64"
            labelFor="b64-output"
            helperText={error ?? undefined}
            intent={error ? Intent.DANGER : Intent.NONE}
          >
            <ResizableTextArea
              id="b64-output"
              placeholder="Type or paste Base64…"
              value={rightText}
              onChange={handleRightChange}
              minRows={8}
              autosize
              style={{ marginBottom: 0 }}
            />
          </FormGroup>
        </div>
        <div className="card-bottom" style={{ gridTemplateColumns: '1fr 1fr', justifyItems: 'start' }}>
          <ButtonGroup>
            <Button
              icon={copyInputStatus === 'success' ? 'tick' : 'duplicate'}
              intent={copyInputStatus === 'success' ? Intent.SUCCESS : Intent.NONE}
              onClick={() => copyToClipboard(leftText, 'input')}
              disabled={!leftText}
            >
              {copyInputStatus === 'success' ? 'Copied' : 'Copy text'}
            </Button>
            <Button icon="eraser" onClick={() => { setLeftText(''); setRightText(''); setError(null); }} disabled={!leftText && !rightText}>
              Clear
            </Button>
          </ButtonGroup>
          <ButtonGroup style={{ justifySelf: 'end' }}>
            <Button
              icon={copyOutputStatus === 'success' ? 'tick' : 'clipboard'}
              intent={copyOutputStatus === 'success' ? Intent.SUCCESS : Intent.PRIMARY}
              onClick={() => copyToClipboard(rightText, 'output')}
              disabled={!rightText || !!error}
            >
              {copyOutputStatus === 'success' ? 'Copied' : 'Copy Base64'}
            </Button>
          </ButtonGroup>
        </div>
      </Card>
    </ToolShell>
  );
};

export default Base64Tool;


