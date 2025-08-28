import React, { useEffect, useMemo, useState } from 'react';
import { Card, FormGroup, H3, Intent, Button, ButtonGroup, Classes } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import ResizableTextArea from '../components/ui/ResizableTextArea';
import { decodeSegment, tryParseJson, formatRelative, formatUtc } from '../utils/jwt';

const JWTDecoderTool: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [copyHeaderStatus, setCopyHeaderStatus] = useState<'idle' | 'success'>('idle');
  const [copyPayloadStatus, setCopyPayloadStatus] = useState<'idle' | 'success'>('idle');
  const [copySignatureStatus, setCopySignatureStatus] = useState<'idle' | 'success'>('idle');
  const HINTS_STORAGE_KEY = 'jwt.showPayloadHints';
  const [showPayloadHints, setShowPayloadHints] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(HINTS_STORAGE_KEY);
      return raw == null ? true : raw === '1' || raw === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(HINTS_STORAGE_KEY, showPayloadHints ? '1' : '0');
    } catch {
      // ignore storage errors
    }
  }, [showPayloadHints]);

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

  const payloadCopyText = useMemo(() => {
    if (!payloadPretty) return '';
    if (!showPayloadHints) return payloadPretty;
    const now = Date.now();
    const withHints = payloadPretty.split('\n').map((line) => {
      const match = line.match(/"(nbf|iat|exp)"\s*:\s*(\d+)/);
      if (!match) return line;
      const key = match[1] as 'nbf' | 'iat' | 'exp';
      const seconds = Number(match[2]);
      const ms = seconds * 1000;
      const hint = `${key}: ${formatUtc(seconds)} (${formatRelative(ms, now)})`;
      return `${line} // ${hint}`;
    });
    return withHints.join('\n');
  }, [payloadPretty, showPayloadHints]);

  // payload line hints are rendered inline per line below

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

  // removed vertical slider per request

  

  return (
    <ToolShell
      title="JWT Decoder"
      description="Decode JSON Web Tokens locally. Parses header and payload, handles Base64URL and pretty-prints JSON."
    >
      <Card elevation={1} style={{ marginBottom: 16, paddingBottom: 8 }}>
        <H3 style={{ marginTop: 0 }}>Token</H3>
        <FormGroup label="JWT" labelFor="jwt-input">
          <ResizableTextArea
            id="jwt-input"
            placeholder="Paste JWT here (header.payload[.signature])"
            value={token}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setToken(e.target.value.trim())}
            minRows={6}
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
          className="resizable-group"
          label="Header"
          labelFor="jwt-header"
          helperText={error ?? undefined}
          intent={error ? Intent.DANGER : Intent.NONE}
        >
          <div style={{ position: 'relative' }}>
            <ResizableTextArea id="jwt-header" value={headerPretty} readOnly minRows={6} style={{ paddingRight: 88, marginBottom: 0 }} />
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
        >
          <div style={{ position: 'relative' }}>
            {/* Visible viewer with per-line grey comments */}
            <div style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              whiteSpace: 'pre',
              overflowX: 'auto',
              overflowY: 'hidden',
              paddingRight: 88,
              borderRadius: 3,
              border: '1px solid rgba(138,155,168,0.15)',
              background: 'rgba(16,22,26,0.3)',
              padding: 8,
              minHeight: 140,
            }}>
              {payloadPretty.split('\n').map((line, idx) => {
                const match = line.match(/"(nbf|iat|exp)"\s*:\s*(\d+)/);
                let hint: string | null = null;
                if (match) {
                  const key = match[1] as 'nbf' | 'iat' | 'exp';
                  const seconds = Number(match[2]);
                  const now = Date.now();
                  const ms = seconds * 1000;
                  const label = key;
                  hint = `${label}: ${formatUtc(seconds)} (${formatRelative(ms, now)})`;
                }
                return (
                  <div key={idx} className="jwt-payload-viewer-row" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ flex: '1 1 auto' }}>{line}</span>
                    {showPayloadHints && hint && (
                      <span className={Classes.TEXT_MUTED} style={{ flex: '0 0 auto', whiteSpace: 'pre' }}> // {hint}</span>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Hidden textarea kept for selection APIs and tests */}
            <textarea id="jwt-payload" value={payloadPretty} readOnly style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0, resize: 'none' }} />
            <div className="overlay-actions" style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 6 }}>
              <Button
                icon={showPayloadHints ? 'eye-open' : 'eye-off'}
                minimal
                small
                aria-label={showPayloadHints ? 'Hide hints' : 'Show hints'}
                onClick={() => setShowPayloadHints((v) => !v)}
              />
              <Button
                icon={copyPayloadStatus === 'success' ? 'tick' : 'clipboard'}
                intent={copyPayloadStatus === 'success' ? Intent.SUCCESS : Intent.PRIMARY}
                minimal
                small
                aria-label="Copy payload"
                data-testid="copy-payload-btn"
                onClick={() => copyToClipboard(payloadCopyText, 'payload')}
                disabled={!payloadPretty}
              />
            </div>
          </div>
          
        </FormGroup>
        <FormGroup className="resizable-group" label="Signature (raw)" labelFor="jwt-signature">
          <div style={{ position: 'relative' }}>
            <ResizableTextArea id="jwt-signature" value={signatureText} readOnly minRows={3} style={{ paddingRight: 88, marginBottom: 0 }} />
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
    </ToolShell>
  );
};

export default JWTDecoderTool;


