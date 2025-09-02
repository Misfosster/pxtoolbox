export interface JsonParseResult {
  value: unknown | null;
  error: string | null;
}

export function tryParseJson(text: string): JsonParseResult {
  if (!text.trim()) return { value: null, error: null };
  try {
    const value = JSON.parse(text);
    return { value, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid JSON';
    return { value: null, error: `Invalid JSON: ${message}` };
  }
}

export function prettyPrintJson(value: unknown, indent: number = 2): string {
  try {
    return JSON.stringify(value, null, indent);
  } catch {
    return '';
  }
}

export function minifyJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}


