export function encodeToUrlComponent(value: string): string {
  // encodeURIComponent leaves -_.!~*'() unescaped per spec
  return encodeURIComponent(value);
}

export function decodeFromUrlComponent(value: string): string {
  // Treat + as space, a common www-form-urlencoded variant
  const normalized = value.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(normalized);
  } catch (error) {
    // Surface a consistent error for UI
    throw new Error('Invalid URL-encoded input.');
  }
}


