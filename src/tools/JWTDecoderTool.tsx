import React, { useMemo, useState } from 'react';
import { Card, H3, Intent, Button, ButtonGroup, Classes } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import ResizableTextArea from '../components/ui/ResizableTextArea';
import { decodeSegment, tryParseJson, formatRelative, formatUtc } from '../utils/jwt';
import CopyButton from '../components/ui/CopyButton';
import OverlayActions from '../components/ui/OverlayActions';
import { useLocalStorageBoolean } from '../components/ui/useLocalStorageBoolean';
import Field from '../components/ui/Field';
import MonospaceBlock from '../components/ui/MonospaceBlock';

const JWTDecoderTool: React.FC = () => {
  const [token, setToken] = useState<string>('');
  
  const HINTS_STORAGE_KEY = 'jwt.showPayloadHints';
  const [showPayloadHints, setShowPayloadHints] = useLocalStorageBoolean(HINTS_STORAGE_KEY, true);

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
    } catch {
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

  

  // removed vertical slider per request

  

  return (
    <ToolShell
      title="JWT Decoder"
      description="Decode JSON Web Tokens locally. Parses header and payload, handles Base64URL and pretty-prints JSON."
    >
      <Card elevation={1} style={{ marginBottom: 16, paddingBottom: 8 }}>
        <H3 style={{ marginTop: 0 }}>Token</H3>
        <Field label="JWT" inputId="jwt-input">
          <ResizableTextArea
            id="jwt-input"
            placeholder="Paste JWT here (header.payload[.signature])"
            value={token}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setToken(e.target.value.trim())}
            minRows={6}
          />
        </Field>
        <ButtonGroup>
          <Button icon="eraser" onClick={() => setToken('')} disabled={!token}>
            Clear
          </Button>
        </ButtonGroup>
        
      </Card>

      <Card elevation={1}>
        <H3 style={{ marginTop: 0 }}>Decoded</H3>
        <Field label="Header" inputId="jwt-header" helperText={error ?? undefined} error={error ?? null}>
          <div style={{ position: 'relative' }}>
            <ResizableTextArea id="jwt-header" value={headerPretty} readOnly minRows={6} style={{ paddingRight: 88, marginBottom: 0 }} />
            <OverlayActions>
              <CopyButton
                icon="clipboard"
                successIcon="tick"
                intent={Intent.PRIMARY}
                minimal
                small
                ariaLabel="Copy header"
                testId="copy-header-btn"
                text={headerPretty}
                disabled={!headerPretty}
              />
            </OverlayActions>
          </div>
        </Field>
        <Field label="Payload" inputId="jwt-payload">
          <div style={{ position: 'relative' }}>
            {/* Visible viewer with per-line grey comments */}
            <MonospaceBlock
              text={payloadPretty}
              actions={(
                <OverlayActions>
                  <Button
                    icon={showPayloadHints ? 'eye-open' : 'eye-off'}
                    minimal
                    small
                    aria-label={showPayloadHints ? 'Hide hints' : 'Show hints'}
                    onClick={() => setShowPayloadHints((v) => !v)}
                  />
                  <CopyButton
                    icon="clipboard"
                    successIcon="tick"
                    intent={Intent.PRIMARY}
                    minimal
                    small
                    ariaLabel="Copy payload"
                    testId="copy-payload-btn"
                    text={payloadCopyText}
                    disabled={!payloadPretty}
                  />
                </OverlayActions>
              )}
            />
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
            {/* Hidden textarea kept for selection APIs and tests */}
            <textarea id="jwt-payload" value={payloadPretty} readOnly style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0, resize: 'none' }} />
          </div>
        </Field>
        <Field label="Signature (raw)" inputId="jwt-signature">
          <div style={{ position: 'relative' }}>
            <ResizableTextArea id="jwt-signature" value={signatureText} readOnly minRows={3} style={{ paddingRight: 88, marginBottom: 0 }} />
            <OverlayActions>
              <CopyButton
                icon="clipboard"
                successIcon="tick"
                intent={Intent.PRIMARY}
                minimal
                small
                ariaLabel="Copy signature"
                testId="copy-signature-btn"
                text={signatureText}
                disabled={!signatureText}
              />
            </OverlayActions>
          </div>
        </Field>
      </Card>
    </ToolShell>
  );
};

export default JWTDecoderTool;


