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

function extractPayloadClaims(text: string): { exp?: number; nbf?: number } | null {
  try {
    const obj = JSON.parse(text);
    const exp = typeof obj.exp === 'number' ? obj.exp : undefined;
    const nbf = typeof obj.nbf === 'number' ? obj.nbf : undefined;
    return { exp, nbf };
  } catch {
    return null;
  }
}

function formatRelative(targetMs: number, nowMs: number): string {
  const delta = targetMs - nowMs;
  const abs = Math.abs(delta);
  const minutes = Math.round(abs / 60000);
  if (minutes < 1) return delta >= 0 ? 'in <1m' : '<1m ago';
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  const base = hours > 0 ? `${hours}h${remMin ? ` ${remMin}m` : ''}` : `${remMin}m`;
  return delta >= 0 ? `in ${base}` : `${base} ago`;
}

function formatUtc(tsSeconds: number): string {
  const d = new Date(tsSeconds * 1000);
  // YYYY-MM-DD HH:mm:ss UTC
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss} UTC`;
}

const JWTDecoderTool: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [copyHeaderStatus, setCopyHeaderStatus] = useState<'idle' | 'success'>('idle');
  const [copyPayloadStatus, setCopyPayloadStatus] = useState<'idle' | 'success'>('idle');
  const [copySignatureStatus, setCopySignatureStatus] = useState<'idle' | 'success'>('idle');
  

  const { headerPretty, payloadPretty, signatureText, error, payloadClaims } = useMemo(() => {
    if (!token) return { headerPretty: '', payloadPretty: '', signatureText: '', error: null as string | null, payloadClaims: null as null | { exp?: number; nbf?: number } };
    const parts = token.split('.');
    if (parts.length !== 2 && parts.length !== 3) {
      return { headerPretty: '', payloadPretty: '', signatureText: '', error: 'JWT must have 2 or 3 segments', payloadClaims: null };
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
        payloadClaims: extractPayloadClaims(payloadText),
      };
    } catch (e) {
      return { headerPretty: '', payloadPretty: '', signatureText: '', error: 'Invalid Base64URL in token', payloadClaims: null };
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

  function startSectionResize(e: React.MouseEvent<HTMLDivElement>, textareaId: string) {
    const area = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    if (!area) return;
    const startY = e.clientY;
    const startHeight = area.getBoundingClientRect().height;
    const minHeight = 60;
    const onMove = (ev: MouseEvent) => {
      const delta = ev.clientY - startY;
      const next = Math.max(minHeight, startHeight + delta);
      area.style.height = `${next}px`;
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }

  function startTokenResize(e: React.MouseEvent<HTMLDivElement>) {
    startSectionResize(e, 'jwt-input');
  }

  

  return (
    <ToolTemplate
      title="JWT Decoder"
      description="Decode JSON Web Tokens locally. Parses header and payload, handles Base64URL and pretty-prints JSON."
    >
      <Card elevation={1} style={{ marginBottom: 16, paddingBottom: 8 }}>
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
        <div className="v-resize-handle" onMouseDown={startTokenResize}>
          <div className="line" />
        </div>
      </Card>

      <Card elevation={1} className="resizable-card resizable-card--with-header" style={{ resize: 'vertical', overflow: 'auto', minHeight: 260 }}>
        <H3 style={{ marginTop: 0 }}>Decoded</H3>
        <FormGroup
          className="resizable-group"
          label="Header"
          labelFor="jwt-header"
          helperText={error ?? undefined}
          intent={error ? Intent.DANGER : Intent.NONE}
        >
          <div className="resizable-area-wrap" style={{ position: 'relative' }}>
            <TextArea id="jwt-header" value={headerPretty} readOnly fill large style={{ height: 120, paddingRight: 88, resize: 'none' }} />
            <div className="overlay-actions" style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 6 }}>
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
        <FormGroup
          className="resizable-group"
          label="Payload"
          labelFor="jwt-payload"
          helperText={(() => {
            if (!payloadClaims) return undefined;
            const now = Date.now();
            const parts: string[] = [];
            if (payloadClaims.nbf !== undefined) {
              const ms = payloadClaims.nbf * 1000;
              parts.push(`nbf: ${formatUtc(payloadClaims.nbf)} (${formatRelative(ms, now)})`);
            }
            if (payloadClaims.exp !== undefined) {
              const ms = payloadClaims.exp * 1000;
              parts.push(`exp: ${formatUtc(payloadClaims.exp)} (${formatRelative(ms, now)})`);
            }
            return parts.length ? parts.join('  •  ') : undefined;
          })()}
        >
          <div className="resizable-area-wrap" style={{ position: 'relative' }}>
            <TextArea id="jwt-payload" value={payloadPretty} readOnly fill large style={{ height: 160, paddingRight: 88, resize: 'none' }} />
            <div className="overlay-actions" style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 6 }}>
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
        <FormGroup className="resizable-group" label="Signature (raw)" labelFor="jwt-signature">
          <div className="resizable-area-wrap" style={{ position: 'relative' }}>
            <TextArea id="jwt-signature" value={signatureText} readOnly fill large style={{ height: 60, paddingRight: 88, resize: 'none' }} />
            <div className="overlay-actions" style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 6 }}>
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


