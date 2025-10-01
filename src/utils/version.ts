/**
 * Version utilities for dynamic version tracking
 */

// Get version from environment variables (set by build process)
const getVersionFromEnv = (): string | null => {
  // Check for VITE_APP_VERSION first (set by build process)
  if (import.meta.env.VITE_APP_VERSION) {
    return import.meta.env.VITE_APP_VERSION;
  }
  
  // Fallback to package.json version (read at runtime)
  return 'N/A'; // This will be the fallback if no env var is set
};

// Get release date from environment or use current date
const getReleaseDate = (): string => {
  // Check for VITE_APP_RELEASE_DATE (set by build process)
  if (import.meta.env.VITE_APP_RELEASE_DATE) {
    return import.meta.env.VITE_APP_RELEASE_DATE;
  }
  
  // Fallback to current date for development
  return new Date().toISOString().split('T')[0];
};

export const getAppVersion = (): string => {
  return getVersionFromEnv() || '0.1.0';
};

export const getAppReleaseDate = (): string => {
  return getReleaseDate();
};

export const getVersionInfo = () => {
  return {
    version: getAppVersion(),
    releaseDate: getAppReleaseDate(),
  };
};
