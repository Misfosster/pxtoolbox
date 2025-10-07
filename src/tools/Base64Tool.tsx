import React, { useState, useRef } from 'react';
import { Button, ButtonGroup, Card, Intent, HTMLSelect } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import ResizableTextArea from '../components/ui/ResizableTextArea';
import { encodeToBase64, decodeFromBase64 } from '../utils/base64';
import CopyButton from '../components/ui/CopyButton';
import Field from '../components/ui/Field';
import OverlayActions from '../components/ui/OverlayActions';

// encoding/decoding helpers moved to utils/base64

const Base64Tool: React.FC = () => {
  const [leftText, setLeftText] = useState<string>('');
  const [rightText, setRightText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [fromFormat, setFromFormat] = useState<string>('text');
  const [toFormat, setToFormat] = useState<string>('base64');
  const fileInputRef = useRef<HTMLInputElement>(null);
  

  

  // Original text ↔ Base64 functions
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

  // File handling functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        if (fromFormat === 'file-decoded' && toFormat === 'base64') {
          // File (Decoded) to Base64
          const base64 = result.split(',')[1]; // Remove data:type;base64, prefix
          setRightText(base64);
          setError(null);
        } else if (fromFormat === 'file-encoded' && toFormat === 'base64') {
          // File (Encoded) to Base64 - file is already Base64
          const base64 = result.split(',')[1];
          setRightText(base64);
          setError(null);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBase64ToFile = () => {
    if (!rightText) return;

    try {
      // Base64 to File Download
      const binaryString = atob(rightText);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Try to determine file type
      let filename = 'decoded-file.bin';
      let mimeType = 'application/octet-stream';
      
      if (bytes.length >= 4) {
        // PNG
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
          filename = 'decoded-image.png';
          mimeType = 'image/png';
        }
        // JPEG
        else if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
          filename = 'decoded-image.jpg';
          mimeType = 'image/jpeg';
        }
        // PDF
        else if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
          filename = 'decoded-document.pdf';
          mimeType = 'application/pdf';
        }
        // Text file
        else if (bytes.every(b => b >= 32 && b <= 126 || b === 9 || b === 10 || b === 13)) {
          filename = 'decoded-text.txt';
          mimeType = 'text/plain';
        }
      }
      
      // Download file
      const blob = new Blob([bytes], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Invalid Base64 for file download.');
    }
  };


  return (
    <ToolShell 
      title="Base64 Encoder/Decoder" 
      description="Convert text to and from Base64, or work with files. All processing happens locally in your browser."
      toolId="base64"
    >
      {/* Original Text ↔ Base64 Section */}
      <Card elevation={1} style={{ marginBottom: 16 }}>
        <div className="dual-pane" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 8 }}>
          <Field label="Text" inputId="b64-input">
            <div style={{ position: 'relative' }}>
              <ResizableTextArea
                id="b64-input"
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
          <Field label="Base64" inputId="b64-output" helperText={error ?? undefined} error={error}>
            <div style={{ position: 'relative' }}>
              <ResizableTextArea
                id="b64-output"
                placeholder="Type or paste Base64…"
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
                  label="Copy Base64"
                />
              </OverlayActions>
            </div>
          </Field>
        </div>
        <div className="card-bottom" style={{ gridTemplateColumns: '1fr 1fr', justifyItems: 'start' }}>
          <ButtonGroup>
            <Button icon="eraser" onClick={() => { setLeftText(''); setRightText(''); setError(null); }} disabled={!leftText && !rightText}>
              Clear
            </Button>
          </ButtonGroup>
        </div>
      </Card>

      {/* File Operations Section */}
      <Card elevation={1}>
        <h4 style={{ marginTop: 0, marginBottom: 16 }}>File Operations</h4>
        
        {/* File Conversion Controls */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label>From:</label>
            <HTMLSelect
              value={fromFormat}
              onChange={(e) => setFromFormat(e.target.value)}
              style={{ minWidth: 140 }}
            >
              <option value="file-decoded">File (Decoded)</option>
              <option value="file-encoded">File (Encoded)</option>
              <option value="base64">Base64</option>
            </HTMLSelect>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label>To:</label>
            <HTMLSelect
              value={toFormat}
              onChange={(e) => setToFormat(e.target.value)}
              style={{ minWidth: 140 }}
            >
              <option value="base64">Base64</option>
              <option value="file">File</option>
            </HTMLSelect>
          </div>
        </div>

        {/* File Upload Area */}
        {(fromFormat === 'file-decoded' || fromFormat === 'file-encoded') && (
          <div 
            style={{ 
              border: '2px dashed #ccc', 
              borderRadius: 8, 
              padding: 24, 
              textAlign: 'center',
              marginBottom: 16,
              cursor: 'pointer',
              backgroundColor: '#f8f9fa'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: 16, marginBottom: 8 }}>
              📁 Click or drag and drop a file
            </div>
            <div style={{ color: '#666', fontSize: 14 }}>
              {fromFormat === 'file-decoded' 
                ? "Upload any file to convert to Base64" 
                : "Upload a Base64 file to get its content"
              }
            </div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept="*/*"
            />
          </div>
        )}

        {/* Base64 Input Field */}
        {fromFormat === 'base64' && (
          <Field 
            label="Base64 Input" 
            inputId="file-base64-input"
            helperText={error ?? undefined} 
            error={error}
          >
            <div style={{ position: 'relative' }}>
              <ResizableTextArea
                id="file-base64-input"
                placeholder="Paste Base64 content here..."
                value={rightText}
                onChange={handleRightChange}
                minRows={6}
                autosize
                style={{ marginBottom: 0, paddingRight: 88 }}
              />
              <OverlayActions>
                <CopyButton
                  icon="clipboard"
                  successIcon="tick"
                  intent={Intent.PRIMARY}
                  text={rightText}
                  disabled={!rightText}
                  label="Copy Base64"
                />
                {toFormat === 'file' && (
                  <Button
                    icon="download"
                    onClick={handleBase64ToFile}
                    disabled={!rightText || !!error}
                    intent={Intent.SUCCESS}
                    style={{ marginLeft: 8 }}
                    title="Download as file"
                  >
                    Download
                  </Button>
                )}
              </OverlayActions>
            </div>
          </Field>
        )}

        {/* File Action Buttons */}
        <div className="card-bottom" style={{ display: 'flex', justifyContent: 'space-between' }}>
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
              Clear All
            </Button>
          </ButtonGroup>
        </div>
      </Card>
    </ToolShell>
  );
};

export default Base64Tool;


