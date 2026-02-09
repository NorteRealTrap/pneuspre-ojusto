import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from './products';
import { useNotificationsStore } from './notifications';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidCartItem(item: any): item is CartItem {
  if (!item || typeof item !== 'object') return false;
  if (!item.product || typeof item.product !== 'object') return false;
  if (typeof item.product.id !== 'string' || !uuidRegex.test(item.product.id)) return false;
  if (typeof item.quantity !== 'number' || item.quantity <= 0) return false;
  return true;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1) => {
        const items = get().items;
        const existingItem = items.find((i) => i.product.id === product.id);

        if (existingItem) {
          set({
            items: items.map((i) =>
              i.product.id === product.id 
                ? { ...i, quantity: i.quantity + quantity } 
                : i
            ),
          });
        } else {
          set({
            items: [...items, { product, quantity }],
          });
        }

        useNotificationsStore
          .getState()
          .notifyCartAdded(`${product.brand} ${product.model}`.trim());
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((i) => i.product.id !== productId),
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set({
          items: get().items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.product.price * item.quantity,
          0
        );
      },
    }),
    {
      name: 'cart-storage',
      version: 2,
      migrate: (persistedState: any) => {
        if (!persistedState || !Array.isArray(persistedState.items)) {
          return { items: [] };
        }

        return {
          ...persistedState,
          items: persistedState.items.filter((item: any) => isValidCartItem(item)),
        };
      },
    }
  )
);
