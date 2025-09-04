import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';

// Provide atob/btoa polyfills for Node test environment
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = globalThis as any;
if (typeof g.atob !== 'function') {
  g.atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary');
}
if (typeof g.btoa !== 'function') {
  g.btoa = (bin: string) => Buffer.from(bin, 'binary').toString('base64');
}

// Lazy import after polyfills
import { encodeToBase64, decodeFromBase64, normalizeBase64Input } from '../src/utils/base64';
import * as jwtUtils from '../src/utils/jwt';
import * as jsonUtils from '../src/utils/json';
import * as urlUtils from '../src/utils/url';

test.describe('Utils coverage', () => {
  test('base64 normalize handles url variant, whitespace, and padding', () => {
    expect(normalizeBase64Input('SGV s bG8tV29ybGRfIQ')).toBe('SGVsbG8tV29ybGRfIQ==');
    expect(normalizeBase64Input('SGVsbG8tV29ybGRfIQ')).toBe('SGVsbG8tV29ybGRfIQ==');
    expect(normalizeBase64Input('SGVsbG8=')).toBe('SGVsbG8=');
    expect(() => normalizeBase64Input('abcde')).toThrow(/Invalid Base64 length/);
  });

  test('base64 encode/decode roundtrip', () => {
    const input = 'Hello, Px! ✓ æøå';
    const b64 = encodeToBase64(input);
    const decoded = decodeFromBase64(b64);
    expect(decoded).toBe(input);
  });

  test('jwt formatRelative produces readable units and direction', () => {
    const now = Date.now();
    expect(jwtUtils.formatRelative(now + 65_000, now)).toMatch(/^in /);
    expect(jwtUtils.formatRelative(now - 65_000, now)).toMatch(/ago$/);
  });

  test('jwt formatUtc returns YYYY-MM-DD HH:MM:SS UTC', () => {
    expect(jwtUtils.formatUtc(0)).toBe('1970-01-01 00:00:00 UTC');
  });

  test('json tryParseJson returns value or error correctly', () => {
    const ok = jsonUtils.tryParseJson('{"a":1}');
    expect(ok.error).toBeNull();
    expect(ok.value && (ok.value as any)['a']).toBe(1);
    const bad = jsonUtils.tryParseJson('{ bad');
    expect(bad.error).toMatch(/Invalid JSON/);
  });

  test('json pretty and minify handle cyclic objects gracefully', () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    expect(jsonUtils.prettyPrintJson(obj)).toBe('');
    expect(jsonUtils.minifyJson(obj)).toBe('');
  });

  test('url encode/decode and error surface', () => {
    const enc = urlUtils.encodeToUrlComponent("Hello, world! äø&?");
    expect(enc).toBe('Hello%2C%20world!%20%C3%A4%C3%B8%26%3F');
    expect(urlUtils.decodeFromUrlComponent('Hello%2C+world%21')).toBe('Hello, world!');
    expect(() => urlUtils.decodeFromUrlComponent('%E4%A')).toThrow(/Invalid URL-encoded input\./);
  });
});


