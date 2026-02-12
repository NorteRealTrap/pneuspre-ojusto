import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistState {
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      favorites: [],

      toggleFavorite: (productId: string) => {
        set((state) => {
          const alreadyFavorite = state.favorites.includes(productId);
          if (alreadyFavorite) {
            return { favorites: state.favorites.filter((id) => id !== productId) };
          }
          return { favorites: [...state.favorites, productId] };
        });
      },

      isFavorite: (productId: string) => {
        return get().favorites.includes(productId);
      },

      clearWishlist: () => {
        set({ favorites: [] });
      },
    }),
    {
      name: 'wishlist-storage',
    }
  )
);
