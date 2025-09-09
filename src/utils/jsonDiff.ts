export interface JsonDiffCounts {
  added: number;
  removed: number;
  changed: number;
  same: number;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Object.prototype.toString.call(v) === '[object Object]';
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  // Distinguish object/array deep equality via JSON.stringify for simplicity
  // Note: This fails for cyclical structures which typical JSON inputs won't include.
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function computeJsonDiffSummary(a: unknown, b: unknown): JsonDiffCounts {
  const counts: JsonDiffCounts = { added: 0, removed: 0, changed: 0, same: 0 };

  function walk(x: unknown, y: unknown) {
    if (isEqual(x, y)) {
      counts.same++;
      return;
    }
    const xIsArr = Array.isArray(x);
    const yIsArr = Array.isArray(y);
    if (xIsArr && yIsArr) {
      const max = Math.max((x as unknown[]).length, (y as unknown[]).length);
      for (let i = 0; i < max; i++) {
        const xv = (x as unknown[])[i];
        const yv = (y as unknown[])[i];
        if (i >= (x as unknown[]).length) counts.added++;
        else if (i >= (y as unknown[]).length) counts.removed++;
        else walk(xv, yv);
      }
      return;
    }
    if (isPlainObject(x) && isPlainObject(y)) {
      const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
      for (const k of keys) {
        const xv = (x as Record<string, unknown>)[k];
        const yv = (y as Record<string, unknown>)[k];
        if (!(k in (x as object))) counts.added++;
        else if (!(k in (y as object))) counts.removed++;
        else walk(xv, yv);
      }
      return;
    }
    // Different primitive or mismatched types
    counts.changed++;
  }

  walk(a, b);
  return counts;
}


