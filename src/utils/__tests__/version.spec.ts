import { describe, it, expect } from 'vitest';
import { getAppVersion, getAppReleaseDate, getVersionInfo } from '../version';

describe('version utilities', () => {
  describe('getAppVersion', () => {
    it('should return a valid version string', () => {
      const version = getAppVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });

    it('should return N/A when no environment variables are set', () => {
      const version = getAppVersion();
      expect(version).toBe('N/A');
    });
  });

  describe('getAppReleaseDate', () => {
    it('should return a valid date string', () => {
      const date = getAppReleaseDate();
      expect(typeof date).toBe('string');
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
    });

    it('should return a valid date that can be parsed', () => {
      const date = getAppReleaseDate();
      const parsedDate = new Date(date);
      expect(parsedDate).toBeInstanceOf(Date);
      expect(parsedDate.toString()).not.toBe('Invalid Date');
    });
  });

  describe('getVersionInfo', () => {
    it('should return an object with version and releaseDate properties', () => {
      const info = getVersionInfo();
      
      expect(info).toHaveProperty('version');
      expect(info).toHaveProperty('releaseDate');
      expect(typeof info.version).toBe('string');
      expect(typeof info.releaseDate).toBe('string');
    });

    it('should return consistent version and date', () => {
      const info1 = getVersionInfo();
      const info2 = getVersionInfo();
      
      expect(info1.version).toBe(info2.version);
      expect(info1.releaseDate).toBe(info2.releaseDate);
    });

    it('should have N/A as version when no environment variables are set', () => {
      const info = getVersionInfo();
      expect(info.version).toBe('N/A');
    });

    it('should have valid date format', () => {
      const info = getVersionInfo();
      expect(info.releaseDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('integration', () => {
    it('should work with Home component integration', () => {
      // Test that the functions return values that can be used in React components
      const version = getAppVersion();
      const date = getAppReleaseDate();
      const info = getVersionInfo();
      
      // Should not throw errors
      expect(() => JSON.stringify({ version, date, info })).not.toThrow();
      
      // Should have expected structure
      expect(info).toEqual({
        version: version,
        releaseDate: date
      });
    });
  });
});
