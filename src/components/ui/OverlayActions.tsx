import React from 'react';

export interface OverlayActionsProps {
  children: React.ReactNode;
  /** Gap between action items in px */
  gapPx?: number;
  /** Optional style/className overrides */
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Positions a row of action buttons at the bottom-right of a relatively positioned container.
 */
const OverlayActions: React.FC<OverlayActionsProps> = ({ children, gapPx = 6, className, style }) => {
  return (
    <div
      className={className}
      style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: gapPx, ...(style ?? {}) }}
    >
      {children}
    </div>
  );
};

export default OverlayActions;


