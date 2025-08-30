import React from 'react';

export interface MonospaceBlockProps {
  /** Preformatted text content to render (lines separated by \n) */
  text: string;
  /** Optional right-side overlay actions */
  actions?: React.ReactNode;
  /** When true, shows soft line wrapping; otherwise horizontal scroll */
  wrap?: boolean;
  /** Optional style/className passthrough */
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Read-only preformatted viewer with monospace font and optional overlay actions.
 */
const MonospaceBlock: React.FC<MonospaceBlockProps> = ({ text, actions, wrap = false, className, style }) => {
  return (
    <div style={{ position: 'relative' }} className={className}>
      <div
        style={{
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          whiteSpace: wrap ? 'pre-wrap' : 'pre',
          overflowX: wrap ? 'hidden' : 'auto',
          overflowY: 'hidden',
          paddingRight: actions ? 88 : 8,
          borderRadius: 3,
          border: '1px solid rgba(138,155,168,0.15)',
          background: 'rgba(16,22,26,0.3)',
          padding: 8,
          minHeight: 140,
          ...style,
        }}
      >
        {text.split('\n').map((line, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ flex: '1 1 auto' }}>{line}</span>
          </div>
        ))}
      </div>
      {actions}
    </div>
  );
};

export default MonospaceBlock;


