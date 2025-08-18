import React, { useState } from 'react';
import { Button, ButtonGroup, Card, FormGroup, Intent, TextArea } from '@blueprintjs/core';
import ToolTemplate from '../components/ToolTemplate';

function encodeToBase64(input: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function normalizeBase64Input(raw: string): string {
  // Remove all whitespace/newlines
  let s = raw.replace(/\s+/g, '');
  // Convert base64url to standard base64
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if missing
  const remainder = s.length % 4;
  if (remainder === 1) {
    throw new Error('Invalid Base64 length');
  } else if (remainder === 2) {
    s += '==';
  } else if (remainder === 3) {
    s += '=';
  }
  return s;
}

function decodeFromBase64(b64: string): string {
  const normalized = normalizeBase64Input(b64);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder('utf-8', { fatal: false });
  return decoder.decode(bytes);
}

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

  function handleLeftChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newLeft = e.target.value;
    setLeftText(newLeft);
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
    <ToolTemplate title="Base64 Encoder/Decoder" description="Convert text to and from Base64 (supports Base64URL, missing padding, and whitespace). All processing happens locally in your browser.">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <Card elevation={1}>
          <FormGroup label="Text" labelFor="b64-input">
            <TextArea
              id="b64-input"
              placeholder="Type or paste text…"
              large
              fill
              value={leftText}
              onChange={handleLeftChange}
              style={{ height: 160, resize: 'none' }}
            />
          </FormGroup>
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
        </Card>

        <Card elevation={1}>
          <FormGroup
            label="Base64"
            labelFor="b64-output"
            helperText={error ?? undefined}
            intent={error ? Intent.DANGER : Intent.NONE}
          >
            <TextArea
              id="b64-output"
              placeholder="Type or paste Base64…"
              large
              fill
              value={rightText}
              onChange={handleRightChange}
              style={{ height: 160, resize: 'none' }}
            />
          </FormGroup>
          <ButtonGroup>
            <Button
              icon={copyOutputStatus === 'success' ? 'tick' : 'clipboard'}
              intent={copyOutputStatus === 'success' ? Intent.SUCCESS : Intent.PRIMARY}
              onClick={() => copyToClipboard(rightText, 'output')}
              disabled={!rightText || !!error}
            >
              {copyOutputStatus === 'success' ? 'Copied' : 'Copy Base64'}
            </Button>
          </ButtonGroup>
        </Card>
      </div>
    </ToolTemplate>
  );
};

export default Base64Tool;


