import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  favorites: string[];
  ownerUserId: string | null;
  favoritesByUser: Record<string, string[]>;
  setOwnerUserId: (userId: string | null) => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearWishlist: () => void;
}

const guestScopeKey = '__guest__';

function normalizeOwnerUserId(userId?: string | null): string | null {
  const normalized = String(userId || '').trim();
  return normalized || null;
}

function resolveScopeKey(userId?: string | null): string {
  return normalizeOwnerUserId(userId) || guestScopeKey;
}

function sanitizeFavorites(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map((id) => String(id || '').trim()).filter(Boolean);
}

function sanitizeFavoritesByUser(input: unknown): Record<string, string[]> {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const scoped = input as Record<string, unknown>;
  const result: Record<string, string[]> = {};

  for (const [key, favorites] of Object.entries(scoped)) {
    result[key] = sanitizeFavorites(favorites);
  }

  return result;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      favorites: [],
      ownerUserId: null,
      favoritesByUser: {},

      setOwnerUserId: (userId) => {
        set((state) => {
          const nextOwnerUserId = normalizeOwnerUserId(userId);
          const currentScopeKey = resolveScopeKey(state.ownerUserId);
          const nextScopeKey = resolveScopeKey(nextOwnerUserId);

          if (currentScopeKey === nextScopeKey && state.ownerUserId === nextOwnerUserId) {
            return state;
          }

          const nextFavoritesByUser = {
            ...state.favoritesByUser,
            [currentScopeKey]: state.favorites,
          };

          return {
            ownerUserId: nextOwnerUserId,
            favoritesByUser: nextFavoritesByUser,
            favorites: nextFavoritesByUser[nextScopeKey] || [],
          };
        });
      },

      toggleFavorite: (productId: string) => {
        const scopeKey = resolveScopeKey(get().ownerUserId);
        set((state) => {
          const alreadyFavorite = state.favorites.includes(productId);
          const nextFavorites = alreadyFavorite
            ? state.favorites.filter((id) => id !== productId)
            : [...state.favorites, productId];

          if (alreadyFavorite) {
            return {
              favorites: nextFavorites,
              favoritesByUser: {
                ...state.favoritesByUser,
                [scopeKey]: nextFavorites,
              },
            };
          }

          return {
            favorites: nextFavorites,
            favoritesByUser: {
              ...state.favoritesByUser,
              [scopeKey]: nextFavorites,
            },
          };
        });
      },

      isFavorite: (productId: string) => {
        return get().favorites.includes(productId);
      },

      clearWishlist: () => {
        const scopeKey = resolveScopeKey(get().ownerUserId);
        set((state) => ({
          favorites: [],
          favoritesByUser: {
            ...state.favoritesByUser,
            [scopeKey]: [],
          },
        }));
      },
    }),
    {
      name: 'wishlist-storage',
      version: 2,
      migrate: (persistedState: any) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return {
            favorites: [],
            ownerUserId: null,
            favoritesByUser: {},
          };
        }

        const ownerUserId = normalizeOwnerUserId(persistedState.ownerUserId);
        const favoritesByUser = sanitizeFavoritesByUser(persistedState.favoritesByUser);
        const legacyFavorites = sanitizeFavorites(persistedState.favorites);

        if (legacyFavorites.length > 0 && Object.keys(favoritesByUser).length === 0) {
          favoritesByUser[guestScopeKey] = legacyFavorites;
        }

        const currentScopeKey = resolveScopeKey(ownerUserId);

        return {
          ...persistedState,
          ownerUserId,
          favoritesByUser,
          favorites: favoritesByUser[currentScopeKey] || [],
        };
      },
    }
  )
);
