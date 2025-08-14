import React, { useMemo, useState } from 'react';
import { Card, FormGroup, H3, Intent, TextArea, Button, ButtonGroup } from '@blueprintjs/core';
import ToolTemplate from '../components/ToolTemplate';

function normalizeBase64Url(input: string): string {
  let s = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad === 2) s += '==';
  else if (pad === 3) s += '=';
  else if (pad === 1) throw new Error('Invalid Base64 length');
  return s;
}

function decodeSegment(segment: string): string {
  if (!segment) return '';
  const normalized = normalizeBase64Url(segment);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const decoder = new TextDecoder('utf-8', { fatal: false });
  return decoder.decode(bytes);
}

function tryParseJson(text: string): { pretty: string | null; error: string | null } {
  if (!text) return { pretty: null, error: null };
  try {
    const obj = JSON.parse(text);
    return { pretty: JSON.stringify(obj, null, 2), error: null };
  } catch {
    return { pretty: null, error: 'Invalid JSON in segment' };
  }
}

const JWTDecoderTool: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [copyHeaderStatus, setCopyHeaderStatus] = useState<'idle' | 'success'>('idle');
  const [copyPayloadStatus, setCopyPayloadStatus] = useState<'idle' | 'success'>('idle');
  const [copySignatureStatus, setCopySignatureStatus] = useState<'idle' | 'success'>('idle');
  

  const { headerPretty, payloadPretty, signatureText, error } = useMemo(() => {
    if (!token) return { headerPretty: '', payloadPretty: '', signatureText: '', error: null as string | null };
    const parts = token.split('.');
    if (parts.length !== 2 && parts.length !== 3) {
      return { headerPretty: '', payloadPretty: '', signatureText: '', error: 'JWT must have 2 or 3 segments' };
    }
    try {
      const headerText = decodeSegment(parts[0]);
      const payloadText = decodeSegment(parts[1]);
      const signature = parts.length === 3 ? parts[2] : '';
      const header = tryParseJson(headerText);
      const payload = tryParseJson(payloadText);
      const firstError = header.error ?? payload.error ?? null;
      return {
        headerPretty: header.pretty ?? headerText,
        payloadPretty: payload.pretty ?? payloadText,
        signatureText: signature,
        error: firstError,
      };
    } catch (e) {
      return { headerPretty: '', payloadPretty: '', signatureText: '', error: 'Invalid Base64URL in token' };
    }
  }, [token]);

  async function copyToClipboard(text: string, target: 'header' | 'payload' | 'signature') {
    const setStatus =
      target === 'header'
        ? setCopyHeaderStatus
        : target === 'payload'
        ? setCopyPayloadStatus
        : setCopySignatureStatus;
    try {
      await navigator.clipboard.writeText(text);
      setStatus('success');
    } catch {
      // ignore
    } finally {
      setTimeout(() => setStatus('idle'), 1500);
    }
  }

  

  return (
    <ToolTemplate
      title="JWT Decoder"
      description="Decode JSON Web Tokens locally. Parses header and payload, handles Base64URL and pretty-prints JSON."
    >
      <Card elevation={1} style={{ marginBottom: 16 }}>
        <H3 style={{ marginTop: 0 }}>Token</H3>
        <FormGroup label="JWT" labelFor="jwt-input">
          <TextArea
            id="jwt-input"
            placeholder="Paste JWT here (header.payload[.signature])"
            large
            fill
            value={token}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setToken(e.target.value.trim())}
            style={{ height: 120, resize: 'none' }}
          />
        </FormGroup>
        <ButtonGroup>
          <Button icon="eraser" onClick={() => setToken('')} disabled={!token}>
            Clear
          </Button>
        </ButtonGroup>
      </Card>

      <Card elevation={1}>
        <H3 style={{ marginTop: 0 }}>Decoded</H3>
        <FormGroup
          label="Header"
          labelFor="jwt-header"
          helperText={error ?? undefined}
          intent={error ? Intent.DANGER : Intent.NONE}
        >
          <div style={{ position: 'relative' }}>
            <TextArea id="jwt-header" value={headerPretty} readOnly fill large style={{ height: 120, paddingRight: 40, resize: 'none', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
              <Button
                icon={copyHeaderStatus === 'success' ? 'tick' : 'clipboard'}
                intent={copyHeaderStatus === 'success' ? Intent.SUCCESS : Intent.PRIMARY}
                minimal
                small
                aria-label="Copy header"
                data-testid="copy-header-btn"
                onClick={() => copyToClipboard(headerPretty, 'header')}
                disabled={!headerPretty}
              />
            </div>
          </div>
        </FormGroup>
        <FormGroup label="Payload" labelFor="jwt-payload">
          <div style={{ position: 'relative' }}>
            <TextArea id="jwt-payload" value={payloadPretty} readOnly fill large style={{ height: 160, paddingRight: 40, resize: 'none', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
              <Button
                icon={copyPayloadStatus === 'success' ? 'tick' : 'clipboard'}
                intent={copyPayloadStatus === 'success' ? Intent.SUCCESS : Intent.PRIMARY}
                minimal
                small
                aria-label="Copy payload"
                data-testid="copy-payload-btn"
                onClick={() => copyToClipboard(payloadPretty, 'payload')}
                disabled={!payloadPretty}
              />
            </div>
          </div>
        </FormGroup>
        <FormGroup label="Signature (raw)" labelFor="jwt-signature">
          <div style={{ position: 'relative' }}>
            <TextArea id="jwt-signature" value={signatureText} readOnly fill large style={{ height: 60, paddingRight: 40, resize: 'none', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: 8, bottom: 8 }}>
              <Button
                icon={copySignatureStatus === 'success' ? 'tick' : 'clipboard'}
                intent={copySignatureStatus === 'success' ? Intent.SUCCESS : Intent.PRIMARY}
                minimal
                small
                aria-label="Copy signature"
                data-testid="copy-signature-btn"
                onClick={() => copyToClipboard(signatureText, 'signature')}
                disabled={!signatureText}
              />
            </div>
          </div>
        </FormGroup>
      </Card>
    </ToolTemplate>
  );
};

export default JWTDecoderTool;


