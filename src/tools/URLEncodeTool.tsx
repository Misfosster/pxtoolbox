import React, { useState } from 'react';
import { Button, ButtonGroup, Card, Intent } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import ResizableTextArea from '../components/ui/ResizableTextArea';
import Field from '../components/ui/Field';
import CopyButton from '../components/ui/CopyButton';
import OverlayActions from '../components/ui/OverlayActions';
import { encodeToUrlComponent, decodeFromUrlComponent } from '../utils/url';

const URLEncodeTool: React.FC = () => {
  const [leftText, setLeftText] = useState<string>('');
  const [rightText, setRightText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  function handleLeftChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newLeft = e.target.value;
    setLeftText(newLeft);
    if (!newLeft) {
      setRightText('');
      setError(null);
      return;
    }
    try {
      setRightText(encodeToUrlComponent(newLeft));
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
      setLeftText(decodeFromUrlComponent(newRight));
      setError(null);
    } catch {
      setLeftText('');
      setError('Invalid URL-encoded input.');
    }
  }

  const leftCount = leftText.length;
  const rightCount = rightText.length;

  return (
    <ToolShell
      title="URL Encoder/Decoder"
      description="Convert text to and from URL encoding (encodeURIComponent/decodeURIComponent). '+' treated as space on decode. All processing happens locally."
    >
      <Card elevation={1}>
        <div className="dual-pane" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 8 }}>
          <Field
            label="Text (plain)"
            inputId="url-input"
            helperText={
              <span>
                Type or paste plain text. It will be encoded to be safe within a URL component using <code>encodeURIComponent</code>.
                <span style={{ marginLeft: 8 }}>
                  <strong>{leftCount}</strong> chars
                </span>
              </span>
            }
          >
            <div style={{ position: 'relative' }}>
              <ResizableTextArea
                id="url-input"
                placeholder="Type or paste text…"
                value={leftText}
                onChange={handleLeftChange}
                minRows={8}
                autosize
                style={{ marginBottom: 0, paddingRight: 88 }}
              />
              <OverlayActions>
                <CopyButton
                  icon="duplicate"
                  successIcon="tick"
                  intent={Intent.NONE}
                  text={leftText}
                  disabled={!leftText}
                  label="Copy text"
                />
              </OverlayActions>
            </div>
          </Field>
          <Field
            label="URL Encoded (component)"
            inputId="url-output"
            helperText={
              error ? undefined : (
                <span>
                  Paste or edit a URL‑encoded value (<code>%</code>-escapes supported). A plus sign <code>+</code> will decode to a space.
                  <span style={{ marginLeft: 8 }}>
                    <strong>{rightCount}</strong> chars
                  </span>
                </span>
              )
            }
            error={error}
          >
            <div style={{ position: 'relative' }}>
              <ResizableTextArea
                id="url-output"
                placeholder="Type or paste URL-encoded…"
                value={rightText}
                onChange={handleRightChange}
                minRows={8}
                autosize
                style={{ marginBottom: 0, paddingRight: 88 }}
              />
              <OverlayActions>
                <CopyButton
                  icon="clipboard"
                  successIcon="tick"
                  intent={Intent.PRIMARY}
                  text={rightText}
                  disabled={!rightText || !!error}
                  label="Copy encoded"
                />
              </OverlayActions>
            </div>
          </Field>
        </div>
        <div className="card-bottom" style={{ gridTemplateColumns: '1fr 1fr', justifyItems: 'start' }}>
          <ButtonGroup>
            <Button
              icon="eraser"
              onClick={() => {
                setLeftText('');
                setRightText('');
                setError(null);
              }}
              disabled={!leftText && !rightText}
            >
              Clear
            </Button>
          </ButtonGroup>
        </div>
      </Card>
    </ToolShell>
  );
};

export default URLEncodeTool;


