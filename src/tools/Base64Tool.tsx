import React, { useState } from 'react';
import { Button, ButtonGroup, Card, FormGroup, Intent } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import ResizableTextArea from '../components/ui/ResizableTextArea';
import { encodeToBase64, decodeFromBase64 } from '../utils/base64';
import CopyButton from '../components/ui/CopyButton';

// encoding/decoding helpers moved to utils/base64

const Base64Tool: React.FC = () => {
  const [leftText, setLeftText] = useState<string>('');
  const [rightText, setRightText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  

  

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
            <CopyButton
              icon="duplicate"
              successIcon="tick"
              intent={Intent.NONE}
              text={leftText}
              disabled={!leftText}
              label="Copy text"
            />
            <Button icon="eraser" onClick={() => { setLeftText(''); setRightText(''); setError(null); }} disabled={!leftText && !rightText}>
              Clear
            </Button>
          </ButtonGroup>
          <ButtonGroup style={{ justifySelf: 'end' }}>
            <CopyButton
              icon="clipboard"
              successIcon="tick"
              intent={Intent.PRIMARY}
              text={rightText}
              disabled={!rightText || !!error}
              label="Copy Base64"
            />
          </ButtonGroup>
        </div>
      </Card>
    </ToolShell>
  );
};

export default Base64Tool;


