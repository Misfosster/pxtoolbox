import { useState, useRef } from 'react';
import { useLocalStorageBoolean } from '../../components/ui/useLocalStorageBoolean';

export interface DiffToolState {
  // Text content
  leftText: string;
  rightText: string;
  setLeftText: (text: string) => void;
  setRightText: (text: string) => void;

  // UI state
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  setLeftCollapsed: (collapsed: boolean) => void;
  setRightCollapsed: (collapsed: boolean) => void;

  // Settings
  ignoreWs: boolean;
  setIgnoreWs: (ignore: boolean) => void;
  persistedOnlyPreview: boolean;
  setPersistedOnlyPreview: (persisted: boolean) => void;

  // Active pane
  activePane: 'left' | 'right';
  setActivePane: (pane: 'left' | 'right') => void;

  // Scroll positions
  leftScrollTop: number;
  rightScrollTop: number;
  setLeftScrollTop: (top: number) => void;
  setRightScrollTop: (top: number) => void;

  // Heights
  leftHeight: number;
  rightHeight: number;
  setLeftHeight: (height: number) => void;
  setRightHeight: (height: number) => void;

  // Highlighting
  leftHighlightLine: number | null;
  rightHighlightLine: number | null;
  setLeftHighlightLine: (line: number | null) => void;
  setRightHighlightLine: (line: number | null) => void;

  // Refs
  leftRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  rightRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  leftHighlightTimeoutRef: React.MutableRefObject<number | null>;
  rightHighlightTimeoutRef: React.MutableRefObject<number | null>;

  // Debounced values
  debLeft: string;
  debRight: string;
  debIgnoreWs: boolean;
  setDebLeft: (text: string) => void;
  setDebRight: (text: string) => void;
  setDebIgnoreWs: (ignore: boolean) => void;
}

export function useDiffToolState(): DiffToolState {
  const [leftText, setLeftText] = useState<string>('');
  const [rightText, setRightText] = useState<string>('');

  const leftRef = useRef<HTMLTextAreaElement | null>(null);
  const rightRef = useRef<HTMLTextAreaElement | null>(null);

  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(true);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(true);

  const [ignoreWs, setIgnoreWs] = useLocalStorageBoolean('pxtoolbox.diff.ignoreWhitespace', false);
  const [persistedOnlyPreview, setPersistedOnlyPreview] = useLocalStorageBoolean('pxtoolbox.diff.persistedOnlyPreview', false);

  const [activePane, setActivePane] = useState<'left' | 'right'>('left');

  const [leftScrollTop, setLeftScrollTop] = useState<number>(0);
  const [rightScrollTop, setRightScrollTop] = useState<number>(0);
  const [leftHeight, setLeftHeight] = useState<number>(140);
  const [rightHeight, setRightHeight] = useState<number>(140);

  const [leftHighlightLine, setLeftHighlightLine] = useState<number | null>(null);
  const [rightHighlightLine, setRightHighlightLine] = useState<number | null>(null);

  const leftHighlightTimeoutRef = useRef<number | null>(null);
  const rightHighlightTimeoutRef = useRef<number | null>(null);

  // Debounced inputs to avoid thrashing
  const [debLeft, setDebLeft] = useState<string>('');
  const [debRight, setDebRight] = useState<string>('');
  const [debIgnoreWs, setDebIgnoreWs] = useState<boolean>(ignoreWs);

  return {
    leftText,
    rightText,
    setLeftText,
    setRightText,
    leftCollapsed,
    rightCollapsed,
    setLeftCollapsed,
    setRightCollapsed,
    ignoreWs,
    setIgnoreWs,
    persistedOnlyPreview,
    setPersistedOnlyPreview,
    activePane,
    setActivePane,
    leftScrollTop,
    rightScrollTop,
    setLeftScrollTop,
    setRightScrollTop,
    leftHeight,
    rightHeight,
    setLeftHeight,
    setRightHeight,
    leftHighlightLine,
    rightHighlightLine,
    setLeftHighlightLine,
    setRightHighlightLine,
    leftRef,
    rightRef,
    leftHighlightTimeoutRef,
    rightHighlightTimeoutRef,
    debLeft,
    debRight,
    debIgnoreWs,
    setDebLeft,
    setDebRight,
    setDebIgnoreWs,
  };
}
