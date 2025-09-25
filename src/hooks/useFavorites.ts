import { useState, useEffect } from 'react';

const FAVORITES_KEY = 'pxtoolbox-favorites';

// Helper function to get initial favorites from localStorage
function getInitialFavorites(): string[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to load favorites from localStorage:', error);
  }
  return [];
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(getInitialFavorites);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.warn('Failed to save favorites to localStorage:', error);
    }
  }, [favorites]);

  const toggleFavorite = (toolId: string) => {
    setFavorites(prev => {
      if (prev.includes(toolId)) {
        return prev.filter(id => id !== toolId);
      } else {
        return [...prev, toolId];
      }
    });
  };

  const isFavorite = (toolId: string) => favorites.includes(toolId);

  const clearFavorites = () => {
    setFavorites([]);
  };

  return {
    favorites,
    showFavoritesOnly,
    setShowFavoritesOnly,
    toggleFavorite,
    isFavorite,
    clearFavorites,
  };
}
