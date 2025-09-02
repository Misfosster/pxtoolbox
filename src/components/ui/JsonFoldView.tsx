import React, { useEffect, useMemo, useState } from 'react';

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

const indentSize = 16;

const JsonFoldView: React.FC<JsonFoldViewProps> = ({ value, wrap = false, className, style, apiRef, onChange }) => {
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
      return { ...chipBase, border: '1px solid rgba(72,207,173,0.45)', background: 'rgba(72,207,173,0.16)' };
    }
    if (t === 'number') {
      return { ...chipBase, border: '1px solid rgba(186,129,255,0.45)', background: 'rgba(186,129,255,0.16)' };
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
    cursor: 'pointer'
  };

  function renderNode(node: unknown, path: string, depth: number, keyLabel?: string): React.ReactNode {
    const paddingLeft = depth * indentSize;
    if (Array.isArray(node)) {
      const isCollapsed = collapsed.has(path);
      return (
        <div style={{ paddingLeft }}>
          <div
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'default', userSelect: 'none' }}
          >
            <span onClick={() => toggle(path)} title={isCollapsed ? 'Expand' : 'Collapse'} style={toggleBoxStyle}>
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
        <div style={{ paddingLeft }}>
          <div
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'default', userSelect: 'none' }}
          >
            <span onClick={() => toggle(path)} title={isCollapsed ? 'Expand' : 'Collapse'} style={toggleBoxStyle}>
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
      <div style={{ paddingLeft, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
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
    );
  }

  return (
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
      className={className}
    >
      {renderNode(value, '$', 0)}
    </div>
  );
};

export default JsonFoldView;


