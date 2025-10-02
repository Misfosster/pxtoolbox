/**
 * Release utilities for fetching recent release information
 */

export interface ReleaseInfo {
  version: string;
  date: string;
  description?: string;
}

// Get recent releases from environment variables (set by build process)
export const getRecentReleases = (limit: number = 3): ReleaseInfo[] => {
  try {
    // Get releases from environment variable set by build process
    const releasesJson = import.meta.env.VITE_APP_RECENT_RELEASES;
    
    if (!releasesJson || releasesJson === 'undefined') {
      return [];
    }
    
    // Handle case where it might already be parsed
    if (typeof releasesJson === 'string') {
      const releases: ReleaseInfo[] = JSON.parse(releasesJson);
      return releases.slice(0, limit);
    } else if (Array.isArray(releasesJson)) {
      return releasesJson.slice(0, limit);
    }
    
    return [];
  } catch (error) {
    console.warn('Could not parse recent releases from environment:', error instanceof Error ? error.message : String(error));
    return [];
  }
};

// Get the latest release info
export const getLatestRelease = (): ReleaseInfo | null => {
  const releases = getRecentReleases(1);
  return releases.length > 0 ? releases[0] : null;
};

// Format release date for display
export const formatReleaseDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (error) {
    return dateString;
  }
};

// Get release status (current, previous, etc.)
export const getReleaseStatus = (_version: string, isLatest: boolean): 'current' | 'previous' => {
  return isLatest ? 'current' : 'previous';
};
