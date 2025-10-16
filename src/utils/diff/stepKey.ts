export type ModResolution = 'keep-original' | 'keep-altered';

export function stepKeyForMod(i?: number | null, j?: number | null): string | null {
  if (typeof i !== 'number' || typeof j !== 'number') {
    return null;
  }
  return `mod:${i}:${j}`;
}

