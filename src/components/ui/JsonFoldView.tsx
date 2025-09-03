import React, { useEffect, useMemo, useState, useLayoutEffect, useRef } from 'react';

export interface JsonFoldViewApi {
  expandAll: () => void;
  collapseAll: () => void;
}

export interface JsonFoldViewProps {
  /** Parsed JSON value to render */
  value: unknown;
  /** Optional monospace/wrapping control */
  wrap?: boolean;
  /** Optional className/style passthrough */
  className?: string;
  style?: React.CSSProperties;
  /** Exposes expand/collapse all operations */
  apiRef?: (api: JsonFoldViewApi) => void;
  /** When provided, enables inline key rename and emits updated value */
  onChange?: (nextValue: unknown) => void;
}

/** Utility: detect plain object */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Object.prototype.toString.call(v) === '[object Object]';
}

function getAllPaths(v: unknown, base: string = '$'): string[] {
  const results: string[] = [];
  if (Array.isArray(v)) {
    results.push(base);
    v.forEach((child, idx) => {
      results.push(...getAllPaths(child, `${base}[${idx}]`));
    });
  } else if (isPlainObject(v)) {
    results.push(base);
    Object.keys(v).forEach((k) => {
      results.push(...getAllPaths((v as Record<string, unknown>)[k], `${base}.${k}`));
    });
  }
  return results;
}

//const indentSize = 12;

const JsonFoldView: React.FC<JsonFoldViewProps> = ({ value, wrap = false, className, style, apiRef, onChange }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [connectorPaths, setConnectorPaths] = useState<string[]>([]);
  const [svgHeight, setSvgHeight] = useState<number>(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [editingValuePath, setEditingValuePath] = useState<string | null>(null);
  const [editingValueText, setEditingValueText] = useState<string>('');

  const allPaths = useMemo(() => getAllPaths(value), [value]);

  useEffect(() => {
    if (!apiRef) return;
    const api: JsonFoldViewApi = {
      expandAll: () => setCollapsed(new Set()),
      collapseAll: () => setCollapsed(new Set(allPaths)),
    };
    apiRef(api);
  }, [apiRef, allPaths]);

  function toggle(path: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function parsePath(path: string): (string | number)[] {
    // expects leading '$'
    const parts: (string | number)[] = [];
    let i = 0;
    while (i < path.length) {
      const ch = path[i];
      if (ch === '$') { i++; continue; }
      if (ch === '.') {
        i++;
        let key = '';
        while (i < path.length && path[i] !== '.' && path[i] !== '[') {
          key += path[i];
          i++;
        }
        if (key) parts.push(key);
        continue;
      }
      if (ch === '[') {
        i++;
        let num = '';
        while (i < path.length && path[i] !== ']') { num += path[i]; i++; }
        i++; // skip ']'
        const idx = Number(num);
        if (!Number.isNaN(idx)) parts.push(idx);
        continue;
      }
      i++;
    }
    return parts;
  }

  function cloneWithRenamedKey(root: unknown, parentPath: string, oldKey: string, newKey: string): unknown {
    const segments = parsePath(parentPath);
    function helper(curr: unknown, depth: number): unknown {
      if (depth === segments.length) {
        if (!isPlainObject(curr)) return curr;
        const obj = curr as Record<string, unknown>;
        if (!(oldKey in obj)) return curr;
        if (newKey in obj) return curr; // skip rename if collision
        const next: Record<string, unknown> = {};
        Object.keys(obj).forEach((k) => {
          if (k === oldKey) next[newKey] = obj[k];
          else next[k] = obj[k];
        });
        return next;
      }
      const seg = segments[depth];
      if (typeof seg === 'number' && Array.isArray(curr)) {
        const arr = curr.slice() as unknown[];
        arr[seg] = helper(arr[seg], depth + 1);
        return arr;
      }
      if (typeof seg === 'string' && isPlainObject(curr)) {
        const obj = { ...(curr as Record<string, unknown>) };
        obj[seg] = helper(obj[seg], depth + 1);
        return obj;
      }
      return curr;
    }
    return helper(root, 0);
  }

  // dnd helpers removed

  function cloneWithSetValue(root: unknown, pathStr: string, newValue: unknown): unknown {
    const segs = parsePath(pathStr);
    function helper(curr: unknown, depth: number): unknown {
      if (depth === segs.length) {
        return newValue;
      }
      const seg = segs[depth];
      if (typeof seg === 'number' && Array.isArray(curr)) {
        const arr = (curr as unknown[]).slice();
        arr[seg] = helper(arr[seg], depth + 1);
        return arr;
      }
      if (typeof seg === 'string' && isPlainObject(curr)) {
        const obj = { ...(curr as Record<string, unknown>) };
        obj[seg] = helper((curr as Record<string, unknown>)[seg], depth + 1);
        return obj;
      }
      return curr;
    }
    return helper(root, 0);
  }

  function valueToLabel(v: unknown): string {
    if (typeof v === 'string') return v;
    return JSON.stringify(v);
  }

  function parseEditedValue(text: string): unknown {
    const trimmed = text.trim();
    if (!trimmed) return '';
    try {
      return JSON.parse(trimmed);
    } catch {
      return text;
    }
  }

  // Visual styles
  const chipBase = {
    display: 'inline-block',
    padding: '0 8px',
    height: 22,
    lineHeight: '22px',
    borderRadius: 6,
    border: '1px solid rgba(138,155,168,0.35)',
    background: 'rgba(138,155,168,0.12)'
  } as const;

  // Branch guides (short stubs per row) + horizontal parent→toggle connector
  const guideColor = 'rgba(138,155,168,0.25)';
  // removed CSS guides; using SVG connectors instead


  const rowGapPx = 10;
  const chipGapPx = 10;

  function keyChipStyle(): React.CSSProperties {
    return {
      ...chipBase,
      border: '1px solid rgba(100,170,255,0.45)',
      background: 'rgba(100,170,255,0.16)'
    };
  }

  function valueChipStyle(v: unknown): React.CSSProperties {
    const t = typeof v;
    if (v === null) {
      return { ...chipBase, border: '1px solid rgba(138,155,168,0.45)', background: 'rgba(138,155,168,0.18)' };
    }
    if (t === 'string') {
      const text = String(v);
      const numericLike = /^-?\d+(?:\.\d+)?$/.test(text);
      if (numericLike) {
        return {
          ...chipBase,
          border: '1px solid rgba(186,129,255,0.55)',
          background: 'rgba(186,129,255,0.18)',
          color: '#C792EA'
        };
      }
      return { ...chipBase, border: '1px solid rgba(72,207,173,0.45)', background: 'rgba(72,207,173,0.16)' };
    }
    if (t === 'number') {
      return {
        ...chipBase,
        border: '1px solid rgba(186,129,255,0.55)',
        background: 'rgba(186,129,255,0.18)',
        color: '#C792EA'
      };
    }
    if (t === 'boolean') {
      return { ...chipBase, border: '1px solid rgba(255,191,0,0.45)', background: 'rgba(255,191,0,0.16)' };
    }
    return { ...chipBase };
  }

  const toggleBoxStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    border: '1px solid rgba(138,155,168,0.4)',
    background: 'rgba(138,155,168,0.15)',
    borderRadius: 3,
    fontSize: 12,
    cursor: 'pointer',
    marginRight: 8,
    position: 'relative',
    zIndex: 1
  };

  function renderNode(node: unknown, path: string, depth: number, keyLabel?: string): React.ReactNode {
    // Spacing rationale:
    // We render toggle buttons and SVG connectors in the same horizontal lane as the chips.
    // Using a pure multiplier (depth * indentSize) left a visually large gutter on some rows
    // due to overlay/connector geometry. Empirically, aligning content with `depth + 24`px
    // produces consistent spacing across arrays/objects and keeps connectors snug to toggles.
    // Mobile note: treat `24` as a base offset for the toggle lane. In a future responsive
    // pass we can reduce or increase this value based on viewport width to maintain readable
    // alignment and tap targets.
    const paddingLeft = depth+24;
    if (Array.isArray(node)) {
      const isCollapsed = collapsed.has(path);
      return (
        <div style={{ paddingLeft, position: 'relative' }}>
          <div
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: chipGapPx, cursor: 'default', userSelect: 'none', marginBottom: rowGapPx }}
          >
            <span data-toggle-path={path} onClick={() => toggle(path)} title={isCollapsed ? 'Expand' : 'Collapse'} style={toggleBoxStyle}>
              {isCollapsed ? '+' : '-'}
            </span>
            {keyLabel ? (
              editingPath === path ? (
                <input
                  autoFocus
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={() => {
                    const newKey = editingText.trim();
                    setEditingPath(null);
                    if (!newKey || !onChange || newKey === keyLabel) return;
                    const parentPath = path.slice(0, path.lastIndexOf('.')) || '$';
                    const next = cloneWithRenamedKey(value, parentPath, keyLabel, newKey);
                    if (next !== value) onChange(next);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    else if (e.key === 'Escape') setEditingPath(null);
                  }}
                  style={{ ...keyChipStyle(), padding: '0 6px', height: 18, lineHeight: '18px' }}
                />
              ) : (
                <span
                  onClick={() => { setEditingPath(path); setEditingText(keyLabel); }}
                  title="Click to rename"
                  style={keyChipStyle()}
                  data-testid="json-key-chip"
                >
                  {keyLabel}
                </span>
              )
            ) : null}
          </div>
          {!isCollapsed && (
            <div>
              {node.map((child, idx) => (
                <div key={idx}>{renderNode(child, `${path}[${idx}]`, depth + 1)}</div>
              ))}
            </div>
          )}
        </div>
      );
    }
    if (isPlainObject(node)) {
      const isCollapsed = collapsed.has(path);
      const keys = Object.keys(node);
      return (
        <div style={{ paddingLeft, position: 'relative' }}>
          <div
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: chipGapPx, cursor: 'default', userSelect: 'none', marginBottom: rowGapPx }}
          >
            <span data-toggle-path={path} onClick={() => toggle(path)} title={isCollapsed ? 'Expand' : 'Collapse'} style={toggleBoxStyle}>
              {isCollapsed ? '+' : '-'}
            </span>
            {keyLabel ? (
              editingPath === path ? (
                <input
                  autoFocus
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onBlur={() => {
                    const newKey = editingText.trim();
                    setEditingPath(null);
                    if (!newKey || !onChange || newKey === keyLabel) return;
                    const parentPath = path.slice(0, path.lastIndexOf('.')) || '$';
                    const next = cloneWithRenamedKey(value, parentPath, keyLabel, newKey);
                    if (next !== value) onChange(next);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    } else if (e.key === 'Escape') {
                      setEditingPath(null);
                    }
                  }}
                  style={{ ...keyChipStyle(), padding: '0 6px', height: 18, lineHeight: '18px' }}
                />
              ) : (
                <span onClick={() => {
                    setEditingPath(path);
                    setEditingText(keyLabel);
                  }} title="Click to rename" style={keyChipStyle()}>
                  {keyLabel}
                </span>
              )
            ) : null}
          </div>
          {!isCollapsed && (
            <div>
              {keys.map((k) => (
                <div key={k}>{renderNode((node as Record<string, unknown>)[k], `${path}.${k}`, depth + 1, k)}</div>
              ))}
            </div>
          )}
        </div>
      );
    }
    // Primitive
    const isEditing = editingValuePath === path;
    return (
      <div style={{ paddingLeft }}>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: chipGapPx, marginBottom: rowGapPx }}>
          {/* Primitive rows have no toggle connectors */}
        {keyLabel ? (
          editingPath === path ? (
            <input
              autoFocus
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              onBlur={() => {
                const newKey = editingText.trim();
                setEditingPath(null);
                if (!newKey || !onChange || newKey === keyLabel) return;
                const parentPath = path.slice(0, path.lastIndexOf('.')) || '$';
                const next = cloneWithRenamedKey(value, parentPath, keyLabel, newKey);
                if (next !== value) onChange(next);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                else if (e.key === 'Escape') setEditingPath(null);
              }}
              style={{ ...keyChipStyle(), padding: '0 6px', height: 18, lineHeight: '18px' }}
            />
          ) : (
            <span onDoubleClick={() => { setEditingPath(path); setEditingText(keyLabel); }} title="Double‑click to rename" style={keyChipStyle()}>
              {keyLabel}
            </span>
          )
        ) : null}
        {isEditing ? (
          <input
            autoFocus
            value={editingValueText}
            onChange={(e) => setEditingValueText(e.target.value)}
            onBlur={() => {
              if (!onChange) { setEditingValuePath(null); return; }
              const nextVal = parseEditedValue(editingValueText);
              const next = cloneWithSetValue(value, path, nextVal);
              setEditingValuePath(null);
              if (next !== value) onChange(next);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              else if (e.key === 'Escape') setEditingValuePath(null);
            }}
            style={{ ...valueChipStyle(node), padding: '0 6px', height: 18, lineHeight: '18px' }}
          />
        ) : (
          <span onClick={() => { setEditingValuePath(path); setEditingValueText(valueToLabel(node)); }} title="Click to edit value" style={{ ...valueChipStyle(node), cursor: 'text' }}>
            {valueToLabel(node)}
          </span>
        )}
        </div>
      </div>
    );
  }

  // Build parent→child toggle positions and draw once per render
  useLayoutEffect(() => {
    let raf = 0;
    const measure = () => {
      try {
        const container = containerRef.current;
        if (!container) return;
        const rootRect = container.getBoundingClientRect();
        const toggles = Array.from(container.querySelectorAll('[data-toggle-path]')) as HTMLElement[];
        const pos = new Map<string, { x: number; y: number }>();
        for (const el of toggles) {
          const r = el.getBoundingClientRect();
          const key = el.getAttribute('data-toggle-path');
          if (!key) continue;
          pos.set(key, {
            x: r.left - rootRect.left + r.width / 2,
            y: r.top - rootRect.top + r.height / 2,
          });
        }
        const edges: string[] = [];
        for (const el of toggles) {
          const childKey = el.getAttribute('data-toggle-path');
          if (!childKey || childKey === '$') continue;
          const lastDot = childKey.lastIndexOf('.');
          const lastBracket = childKey.lastIndexOf('[');
          const parentKey = lastDot > lastBracket ? childKey.slice(0, lastDot) : childKey.slice(0, lastBracket);
          const a = pos.get(parentKey);
          const b = pos.get(childKey);
          if (!a || !b) continue;
          const bx = b.x - 8;
          edges.push(`M ${a.x} ${a.y} L ${a.x} ${b.y} L ${bx} ${b.y}`);
        }
        setConnectorPaths(edges);
        setSvgHeight(container.scrollHeight || container.clientHeight);
      } catch {
        // ignore measurement errors during hot reload
      }
    };
    raf = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(raf);
  }, [value, collapsed]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }} className={className}>
      <svg
        width="100%"
        height={svgHeight}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        {connectorPaths.map((d, i) => (
          <path key={i} d={d} stroke={guideColor} strokeWidth={1} fill="none" />
        ))}
      </svg>
      <div
        style={{
          position: 'relative',
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          whiteSpace: wrap ? 'pre-wrap' : 'pre',
          overflowX: wrap ? 'hidden' : 'auto',
          overflowY: 'hidden',
          borderRadius: 3,
          border: '1px solid rgba(138,155,168,0.15)',
          background: 'rgba(16,22,26,0.3)',
          padding: 8,
          minHeight: 140,
          ...style,
        }}
      >
        {renderNode(value, '$', 0)}
      </div>
    </div>
  );
};

export default JsonFoldView;


