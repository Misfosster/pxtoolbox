const ZERO_WIDTH = /[\u200b\u200c\u200d\ufeff]/g;
const MULTI_SPACES = / {2,}/g;

/**
 * Normalize arbitrary plaintext for preview-only rendering.
 * - Removes zero-width characters.
 * - Preserves leading indentation (tabs and spaces).
 * - Collapses consecutive interior spaces to a single space.
 * - Trims trailing whitespace on each line.
 * - Collapses runs of blank lines to a single blank line.
 */
export function normalizePlaintext(input: string): string {
  if (!input) {
    return '';
  }

  const sanitized = input.replace(ZERO_WIDTH, '');
  const lines = sanitized.split(/\r?\n/);
  const normalizedLines: string[] = [];

  let blankStreak = 0;

  for (const rawLine of lines) {
    // Remove trailing spaces and tabs but preserve indentation at the start.
    const noTrailing = rawLine.replace(/[ \t]+$/g, '');
    const isBlank = noTrailing.trim().length === 0;

    if (isBlank) {
      if (blankStreak > 0) {
        continue;
      }
      blankStreak++;
      normalizedLines.push('');
      continue;
    }

    blankStreak = 0;
    const leadingMatch = noTrailing.match(/^[\t ]*/);
    const leading = leadingMatch ? leadingMatch[0] : '';
    const rest = noTrailing.slice(leading.length).replace(MULTI_SPACES, ' ');

    normalizedLines.push(leading + rest);
  }

  return normalizedLines.join('\n');
}

