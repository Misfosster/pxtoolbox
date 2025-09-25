import React from 'react';
import { FormGroup, Intent } from '@blueprintjs/core';

export interface FieldProps {
  /** Visible label above the control */
  label: string | React.ReactNode;
  /** Id of the primary input (used for labelFor) */
  inputId: string;
  /** Optional helper or error text */
  helperText?: React.ReactNode;
  /** When provided, switches helper text to danger intent */
  error?: string | null;
  /** Child control to render within the field */
  children: React.ReactNode;
  /** Optional className passthrough */
  className?: string;
  /** Optional style passthrough */
  style?: React.CSSProperties;
}

/**
 * Standardized field wrapper built on Blueprint FormGroup.
 * Applies consistent spacing and passes error/intent wiring.
 */
const Field: React.FC<FieldProps> = ({ label, inputId, helperText, error, children, className, style }) => {
  const hasError = Boolean(error);
  return (
    <FormGroup
      className={['resizable-group', className].filter(Boolean).join(' ')}
      label={label}
      labelFor={inputId}
      helperText={hasError ? error ?? undefined : helperText}
      intent={hasError ? Intent.DANGER : Intent.NONE}
      style={style}
    >
      {children}
    </FormGroup>
  );
};

export default Field;


