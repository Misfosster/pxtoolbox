import React, { useCallback, useState } from 'react';
import { Button, Intent } from '@blueprintjs/core';

export interface CopyButtonProps {
  /** Text to copy to the clipboard */
  text: string;
  /** Visible label on the button (omit for icon-only) */
  label?: string;
  /** Label shown after a successful copy; defaults to "Copied" */
  copiedLabel?: string;
  /** Aria label for accessibility (useful when label is omitted) */
  ariaLabel?: string;
  /** Icon when idle (defaults to clipboard) */
  icon?: string;
  /** Icon when success (defaults to tick) */
  successIcon?: string;
  /** Intent when idle */
  intent?: Intent;
  /** Intent when success (defaults to SUCCESS) */
  successIntent?: Intent;
  /** Blueprint visual props */
  minimal?: boolean;
  small?: boolean;
  /** Disable the button */
  disabled?: boolean;
  /** Optional callback after successful copy */
  onCopied?: () => void;
  /** data-testid for tests */
  testId?: string;
  /** Style/class passthroughs */
  className?: string;
  style?: React.CSSProperties;
  /** Milliseconds to keep success state before reverting */
  successDurationMs?: number;
}

const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label,
  copiedLabel = 'Copied',
  ariaLabel,
  icon = 'clipboard',
  successIcon = 'tick',
  intent,
  successIntent = Intent.SUCCESS,
  minimal,
  small,
  disabled,
  onCopied,
  testId,
  className,
  style,
  successDurationMs = 1500,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleClick = useCallback(async () => {
    if (!text || disabled) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied?.();
    } catch {
      // no-op on clipboard failure; stay in idle state
      return;
    } finally {
      // Reset visual state after a small delay
      window.setTimeout(() => setCopied(false), successDurationMs);
    }
  }, [text, disabled, onCopied, successDurationMs]);

  const currentIcon = copied ? successIcon : icon;
  const currentIntent = copied ? successIntent : intent;
  const currentLabel = label ? (copied ? copiedLabel : label) : undefined;

  return (
    <Button
      icon={currentIcon}
      intent={currentIntent}
      minimal={minimal}
      small={small}
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      data-testid={testId}
      className={className}
      style={style}
    >
      {currentLabel}
    </Button>
  );
};

export default CopyButton;


