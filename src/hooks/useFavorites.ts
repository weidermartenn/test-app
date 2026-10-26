import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_STORAGE_KEY = '@app_favorite_matches';

// Избранные матчи (по id). Сохраняются в AsyncStorage между запусками приложения.
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Загружаем избранное при первом монтировании
  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setFavorites(parsed);
            }
          } catch (e) {
            console.error('Failed to parse favorites from storage', e);
          }
        }
      })
      .catch((e) => {
        console.error('Failed to load favorites from storage', e);
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  const isFavorite = (id: string) => favorites.includes(id);

  const toggle = (id: string) => {
    setFavorites((prev) => {
      const index = prev.indexOf(id);
      let updated: string[];
      if (index === -1) {
        updated = [...prev, id];
      } else {
        updated = prev.filter((item) => item !== id);
      }

      // Сохраняем обновленный список в AsyncStorage в фоне
      AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated)).catch((e) => {
        console.error('Failed to save favorites to storage', e);
      });

      return updated;
    });
  };

  return { favorites, isFavorite, toggle, isLoaded };
}