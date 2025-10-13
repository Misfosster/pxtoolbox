import React, { useState, useRef, useEffect } from 'react';
import { Button, ButtonGroup, Card, Intent, HTMLSelect } from '@blueprintjs/core';
import ToolShell from '../components/ui/ToolShell';
import ResizableTextArea from '../components/ui/ResizableTextArea';
import { encodeToBase64, decodeFromBase64, normalizeBase64Input } from '../utils/base64';
import CopyButton from '../components/ui/CopyButton';
import Field from '../components/ui/Field';
import OverlayActions from '../components/ui/OverlayActions';

// encoding/decoding helpers moved to utils/base64

const Base64Tool: React.FC = () => {
  const [leftText, setLeftText] = useState<string>('');
  const [rightText, setRightText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  // File Operations local state (decoupled from top fields)
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileText, setFileText] = useState<string>('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  // Initialize to a valid option present in the File Operations selector
  const [fromFormat, setFromFormat] = useState<string>('file-decoded');
  const [toFormat, setToFormat] = useState<string>('base64');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-determine output target based on source selection
  useEffect(() => {
    if (fromFormat === 'base64') {
      setToFormat('file');
    } else {
      setToFormat('base64');
    }
  }, [fromFormat]);

  

  

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
      const decoded = decodeFromBase64(newRight); // util normalizes internally
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

    setUploadedFileName(file.name);

    if (fromFormat === 'file-encoded') {
      // File (Encoded) - text file containing Base64 → decode to Text output
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = String(e.target?.result ?? '');
          const normalized = normalizeBase64Input(raw);
          const binary = atob(normalized);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const decodedText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          setFileText(decodedText);
          setFileBase64('');
          setFileError(null);
          // Reflect uploaded Base64 content into the top Base64 pane as-is
          setRightText(normalized);
        } catch {
          setFileText('');
          setFileBase64('');
          setFileError('Invalid Base64 content in file.');
        }
      };
      reader.readAsText(file);
      return;
    }

    // File (Decoded) - read as binary and convert to Base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        const base64 = result.split(',')[1]; // Remove data:type;base64, prefix
        setFileBase64(base64);
        setFileText('');
        setFileError(null);
        // Reflect generated Base64 into the top Base64 pane
        setRightText(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBase64ToFile = () => {
    if (!fileBase64) return;

    try {
      // Normalize Base64 before decoding
      const normalized = normalizeBase64Input(fileBase64);
      const binaryString = atob(normalized);
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
      setFileError('Invalid Base64 for file download.');
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
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, justifyContent: 'space-between' }}>
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
          {/* Output indicator (auto-determined) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#5C7080' }}>Converts to:</span>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                color: '#394B59',
                background: '#E1E8ED',
                border: '1px solid #CED9E0'
              }}
            >
{fromFormat === 'base64' ? 'File' : fromFormat === 'file-encoded' ? 'Text' : 'Base64'}
            </span>
          </div>
        </div>

        {/* File Upload Area */}
        {(fromFormat === 'file-decoded' || fromFormat === 'file-encoded') && (
          <div 
            style={{ 
              border: '2px dashed #8AB8D8',
              borderRadius: 12, 
              padding: 32, 
              textAlign: 'center',
              marginBottom: 16,
              cursor: 'pointer',
              backgroundColor: '#E6F2FA',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.style.borderColor = '#2B95D6';
              e.currentTarget.style.backgroundColor = '#D8ECFA';
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.style.borderColor = '#8AB8D8';
              e.currentTarget.style.backgroundColor = '#E6F2FA';
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.style.borderColor = '#8AB8D8';
              e.currentTarget.style.backgroundColor = '#E6F2FA';
              const files = e.dataTransfer.files;
              if (files.length > 0) {
                const file = files[0];
                const reader = new FileReader();
                if (fromFormat === 'file-encoded') {
                  reader.onload = (event) => {
                    try {
                      const raw = String(event.target?.result ?? '');
                      const normalized = normalizeBase64Input(raw);
                      const binary = atob(normalized);
                      const bytes = new Uint8Array(binary.length);
                      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                      const decodedText = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
                      setFileText(decodedText);
                      setFileBase64('');
                      setFileError(null);
                    } catch {
                      setFileText('');
                      setFileBase64('');
                      setFileError('Invalid Base64 content in file.');
                    }
                  };
                  reader.readAsText(file);
                } else {
                  reader.onload = (event) => {
                    const result = event.target?.result as string;
                    if (result) {
                      const base64 = result.split(',')[1];
                      setFileBase64(base64);
                      setFileText('');
                      setFileError(null);
                    }
                  };
                  reader.readAsDataURL(file);
                }
                setUploadedFileName(file.name);
              }
            }}
          >
            {uploadedFileName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>📄</span>
                <span style={{ color: '#215E81', fontSize: 14, flex: 1, textAlign: 'left' }}>{uploadedFileName}</span>
                <Button minimal icon="cross" onClick={(e) => { e.stopPropagation(); setUploadedFileName(''); setFileBase64(''); setFileText(''); setFileError(null); }} />
              </div>
            ) : (
              <>
                <div style={{ 
                  fontSize: 48, 
                  marginBottom: 16,
                  opacity: 0.6
                }}>
                  📁
                </div>
                <div style={{ 
                  fontSize: 18, 
                  fontWeight: 600,
                  marginBottom: 8,
                  color: '#215E81'
                }}>
                  Drop files here or click to browse
                </div>
                <div style={{ 
                  color: '#215E81', 
                  fontSize: 14,
                  marginBottom: 16
                }}>
                  {fromFormat === 'file-decoded' 
                    ? "Upload any file to convert to Base64" 
                    : "Upload a text file containing Base64 content"
                  }
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  backgroundColor: '#E6F2FA',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#215E81',
                  border: '1px solid #8AB8D8'
                }}>
                  Choose File
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              accept="*/*"
            />
          </div>
        )}

        {/* Output arrow + result for upload flows */}
        {(fromFormat === 'file-decoded' || fromFormat === 'file-encoded') && (fileBase64 || fileText || fileError) && (
          <div style={{ textAlign: 'center', margin: '32px 0 32px 0', color: '#5C7080' }}>
            <div style={{ fontSize: 76, lineHeight: '48px' }}>↓</div>
          </div>
        )}

        {(fromFormat === 'file-decoded' && fileBase64) && (
          <Field label="Base64 Output" inputId="file-output-base64">
            <div style={{ position: 'relative' }}>
              <ResizableTextArea
                id="file-output-base64"
                value={fileBase64}
                onChange={() => {}}
                minRows={6}
                autosize
                style={{ marginBottom: 0, paddingRight: 88 }}
                readOnly
              />
              <OverlayActions>
                <CopyButton
                  icon="clipboard"
                  successIcon="tick"
                  intent={Intent.PRIMARY}
                  text={fileBase64}
                  disabled={!fileBase64}
                  label="Copy Base64"
                />
              </OverlayActions>
            </div>
          </Field>
        )}

        {(fromFormat === 'file-encoded' && (fileText || fileError)) && (
          <Field label="Text Output" inputId="file-output-text" helperText={fileError ?? undefined} error={fileError}>
            <div style={{ position: 'relative' }}>
              <ResizableTextArea
                id="file-output-text"
                value={fileText}
                onChange={() => {}}
                minRows={6}
                autosize
                style={{ marginBottom: 0, paddingRight: 88 }}
                readOnly
              />
              <OverlayActions>
                <CopyButton
                  icon="duplicate"
                  successIcon="tick"
                  intent={Intent.NONE}
                  text={fileText}
                  disabled={!fileText}
                  label="Copy text"
                />
              </OverlayActions>
            </div>
          </Field>
        )}

        {/* Base64 Input Field */}
        {fromFormat === 'base64' && (
          <Field 
            label="Base64 Input" 
            inputId="file-base64-input"
            helperText={fileError ?? undefined} 
            error={fileError}
          >
            <div style={{ position: 'relative' }}>
              <ResizableTextArea
                id="file-base64-input"
                placeholder="Paste Base64 content here..."
                value={fileBase64}
                onChange={(e) => setFileBase64(e.target.value)}
                minRows={6}
                autosize
                style={{ marginBottom: 0, paddingRight: 88 }}
              />
              <OverlayActions>
                <CopyButton
                  icon="clipboard"
                  successIcon="tick"
                  intent={Intent.PRIMARY}
                  text={fileBase64}
                  disabled={!fileBase64}
                  label="Copy Base64"
                />
                {fromFormat === 'base64' && toFormat === 'file' && (
                  <Button
                    icon="download"
                    onClick={handleBase64ToFile}
                    disabled={!fileBase64 || !!fileError}
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
                setFileBase64('');
                setFileText('');
                setFileError(null);
                setUploadedFileName('');
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


