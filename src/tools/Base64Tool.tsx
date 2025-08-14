import React, { useMemo, useState } from 'react';
import { Button, ButtonGroup, Card, FormGroup, H3, Intent, TextArea } from '@blueprintjs/core';
import ToolTemplate from '../components/ToolTemplate';

type Mode = 'encode' | 'decode';

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
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copyInputStatus, setCopyInputStatus] = useState<'idle' | 'success'>('idle');
  const [copyOutputStatus, setCopyOutputStatus] = useState<'idle' | 'success'>('idle');

  const output = useMemo(() => {
    if (!input) {
      setError(null);
      return '';
    }
    try {
      const result = mode === 'encode' ? encodeToBase64(input) : decodeFromBase64(input);
      setError(null);
      return result;
    } catch (e) {
      const message = mode === 'encode' ? 'Failed to encode input.' : 'Invalid Base64 input.';
      setError(message);
      return '';
    }
  }, [input, mode]);

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

  return (
    <ToolTemplate title="Base64 Encoder/Decoder" description="Convert text to and from Base64 (supports Base64URL, missing padding, and whitespace). All processing happens locally in your browser.">
      <Card elevation={1} style={{ marginBottom: 16 }}>
        <H3 style={{ marginTop: 0 }}>Mode</H3>
        <ButtonGroup minimal>
          <Button
            active={mode === 'encode'}
            intent={mode === 'encode' ? Intent.PRIMARY : Intent.NONE}
            icon="arrow-up"
            onClick={() => setMode('encode')}
          >
            Encode (text → Base64)
          </Button>
          <Button
            active={mode === 'decode'}
            intent={mode === 'decode' ? Intent.PRIMARY : Intent.NONE}
            icon="arrow-down"
            onClick={() => setMode('decode')}
          >
            Decode (Base64 → text)
          </Button>
        </ButtonGroup>
      </Card>

      <Card elevation={1} style={{ marginBottom: 16 }}>
        <FormGroup label={mode === 'encode' ? 'Input text' : 'Input Base64'} labelFor="b64-input">
          <TextArea
            id="b64-input"
            placeholder={mode === 'encode' ? 'Type or paste text to encode…' : 'Type or paste Base64 to decode…'}
            large
            fill
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            style={{ height: 140, resize: 'none' }}
          />
        </FormGroup>
        <ButtonGroup>
          <Button
            icon={copyInputStatus === 'success' ? 'tick' : 'duplicate'}
            intent={copyInputStatus === 'success' ? Intent.SUCCESS : Intent.NONE}
            onClick={() => copyToClipboard(input, 'input')}
            disabled={!input}
          >
            {copyInputStatus === 'success' ? 'Copied' : 'Copy input'}
          </Button>
          <Button icon="eraser" onClick={() => setInput('')} disabled={!input}>
            Clear
          </Button>
        </ButtonGroup>
      </Card>

      <Card elevation={1}>
        <FormGroup
          label={mode === 'encode' ? 'Output Base64' : 'Output text'}
          labelFor="b64-output"
          helperText={error ?? undefined}
          intent={error ? Intent.DANGER : Intent.NONE}
        >
          <TextArea id="b64-output" value={output} readOnly fill large style={{ height: 140, resize: 'none' }} />
        </FormGroup>
        <ButtonGroup>
          <Button
            icon={copyOutputStatus === 'success' ? 'tick' : 'clipboard'}
            intent={copyOutputStatus === 'success' ? Intent.SUCCESS : Intent.PRIMARY}
            onClick={() => copyToClipboard(output, 'output')}
            disabled={!output || !!error}
          >
            {copyOutputStatus === 'success' ? 'Copied' : 'Copy output'}
          </Button>
        </ButtonGroup>
      </Card>
    </ToolTemplate>
  );
};

export default Base64Tool;


