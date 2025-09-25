import { renderHook, act } from '@testing-library/react';
import { useFavorites } from '../useFavorites';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useFavorites', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should initialize with empty favorites when localStorage is empty', () => {
    const { result } = renderHook(() => useFavorites());
    
    expect(result.current.favorites).toEqual([]);
    expect(result.current.isFavorite('base64')).toBe(false);
  });

  it('should load favorites from localStorage on initialization', () => {
    localStorageMock.setItem('pxtoolbox-favorites', JSON.stringify(['base64', 'jwt']));
    
    const { result } = renderHook(() => useFavorites());
    
    expect(result.current.favorites).toEqual(['base64', 'jwt']);
    expect(result.current.isFavorite('base64')).toBe(true);
    expect(result.current.isFavorite('jwt')).toBe(true);
    expect(result.current.isFavorite('url')).toBe(false);
  });

  it('should toggle favorite status correctly', () => {
    const { result } = renderHook(() => useFavorites());
    
    // Initially empty
    expect(result.current.favorites).toEqual([]);
    expect(result.current.isFavorite('base64')).toBe(false);
    
    // Add favorite
    act(() => {
      result.current.toggleFavorite('base64');
    });
    
    expect(result.current.favorites).toEqual(['base64']);
    expect(result.current.isFavorite('base64')).toBe(true);
    
    // Remove favorite
    act(() => {
      result.current.toggleFavorite('base64');
    });
    
    expect(result.current.favorites).toEqual([]);
    expect(result.current.isFavorite('base64')).toBe(false);
  });

  it('should handle multiple favorites', () => {
    const { result } = renderHook(() => useFavorites());
    
    act(() => {
      result.current.toggleFavorite('base64');
      result.current.toggleFavorite('jwt');
      result.current.toggleFavorite('url');
    });
    
    expect(result.current.favorites).toEqual(['base64', 'jwt', 'url']);
    expect(result.current.isFavorite('base64')).toBe(true);
    expect(result.current.isFavorite('jwt')).toBe(true);
    expect(result.current.isFavorite('url')).toBe(true);
    expect(result.current.isFavorite('json')).toBe(false);
  });

  it('should save favorites to localStorage when they change', () => {
    const { result } = renderHook(() => useFavorites());
    
    act(() => {
      result.current.toggleFavorite('base64');
    });
    
    expect(localStorageMock.getItem('pxtoolbox-favorites')).toBe('["base64"]');
    
    act(() => {
      result.current.toggleFavorite('jwt');
    });
    
    expect(localStorageMock.getItem('pxtoolbox-favorites')).toBe('["base64","jwt"]');
  });

  it('should clear all favorites', () => {
    const { result } = renderHook(() => useFavorites());
    
    // Add some favorites
    act(() => {
      result.current.toggleFavorite('base64');
      result.current.toggleFavorite('jwt');
    });
    
    expect(result.current.favorites).toEqual(['base64', 'jwt']);
    
    // Clear all
    act(() => {
      result.current.clearFavorites();
    });
    
    expect(result.current.favorites).toEqual([]);
    expect(localStorageMock.getItem('pxtoolbox-favorites')).toBe('[]');
  });

  it('should handle corrupted localStorage data gracefully', () => {
    localStorageMock.setItem('pxtoolbox-favorites', 'invalid json');
    
    const { result } = renderHook(() => useFavorites());
    
    expect(result.current.favorites).toEqual([]);
    expect(result.current.isFavorite('base64')).toBe(false);
  });

  it('should handle non-array localStorage data gracefully', () => {
    localStorageMock.setItem('pxtoolbox-favorites', JSON.stringify('not an array'));
    
    const { result } = renderHook(() => useFavorites());
    
    expect(result.current.favorites).toEqual([]);
    expect(result.current.isFavorite('base64')).toBe(false);
  });

  it('should maintain showFavoritesOnly state', () => {
    const { result } = renderHook(() => useFavorites());
    
    expect(result.current.showFavoritesOnly).toBe(false);
    
    act(() => {
      result.current.setShowFavoritesOnly(true);
    });
    
    expect(result.current.showFavoritesOnly).toBe(true);
  });
});
