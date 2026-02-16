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
  ownerUserId: string | null;
  scopedItemsByUser: Record<string, CartItem[]>;
  setOwnerUserId: (userId: string | null) => void;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const guestScopeKey = '__guest__';

function normalizeOwnerUserId(userId?: string | null): string | null {
  const normalized = String(userId || '').trim();
  return normalized || null;
}

function resolveScopeKey(userId?: string | null): string {
  return normalizeOwnerUserId(userId) || guestScopeKey;
}

function isValidCartItem(item: any): item is CartItem {
  if (!item || typeof item !== 'object') return false;
  if (!item.product || typeof item.product !== 'object') return false;
  if (typeof item.product.id !== 'string' || !uuidRegex.test(item.product.id)) return false;
  if (typeof item.quantity !== 'number' || item.quantity <= 0) return false;
  return true;
}

function sanitizeScopedItems(input: unknown): Record<string, CartItem[]> {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const scoped = input as Record<string, unknown>;
  const result: Record<string, CartItem[]> = {};

  for (const [key, rawItems] of Object.entries(scoped)) {
    if (!Array.isArray(rawItems)) continue;
    result[key] = rawItems.filter((item): item is CartItem => isValidCartItem(item));
  }

  return result;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      ownerUserId: null,
      scopedItemsByUser: {},

      setOwnerUserId: (userId) => {
        set((state) => {
          const nextOwnerUserId = normalizeOwnerUserId(userId);
          const currentScopeKey = resolveScopeKey(state.ownerUserId);
          const nextScopeKey = resolveScopeKey(nextOwnerUserId);

          if (currentScopeKey === nextScopeKey && state.ownerUserId === nextOwnerUserId) {
            return state;
          }

          const nextScopedItems = {
            ...state.scopedItemsByUser,
            [currentScopeKey]: state.items.filter((item) => isValidCartItem(item)),
          };

          const nextItems = (nextScopedItems[nextScopeKey] || []).filter((item) => isValidCartItem(item));

          return {
            ownerUserId: nextOwnerUserId,
            scopedItemsByUser: nextScopedItems,
            items: nextItems,
          };
        });
      },

      addItem: (product, quantity = 1) => {
        const items = get().items;
        const existingItem = items.find((i) => i.product.id === product.id);
        const scopeKey = resolveScopeKey(get().ownerUserId);
        let nextItems: CartItem[];

        if (existingItem) {
          nextItems = items.map((i) =>
            i.product.id === product.id 
              ? { ...i, quantity: i.quantity + quantity } 
              : i
          );
        } else {
          nextItems = [...items, { product, quantity }];
        }

        set((state) => ({
          items: nextItems,
          scopedItemsByUser: {
            ...state.scopedItemsByUser,
            [scopeKey]: nextItems,
          },
        }));

        useNotificationsStore
          .getState()
          .notifyCartAdded(`${product.brand} ${product.model}`.trim());
      },

      removeItem: (productId) => {
        const scopeKey = resolveScopeKey(get().ownerUserId);
        const nextItems = get().items.filter((i) => i.product.id !== productId);
        set((state) => ({
          items: nextItems,
          scopedItemsByUser: {
            ...state.scopedItemsByUser,
            [scopeKey]: nextItems,
          },
        }));
      },

      updateQuantity: (productId, quantity) => {
        const scopeKey = resolveScopeKey(get().ownerUserId);
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        const nextItems = get().items.map((i) =>
            i.product.id === productId ? { ...i, quantity } : i
          );
        set((state) => ({
          items: nextItems,
          scopedItemsByUser: {
            ...state.scopedItemsByUser,
            [scopeKey]: nextItems,
          },
        }));
      },

      clearCart: () => {
        const scopeKey = resolveScopeKey(get().ownerUserId);
        set((state) => ({
          items: [],
          scopedItemsByUser: {
            ...state.scopedItemsByUser,
            [scopeKey]: [],
          },
        }));
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
      version: 3,
      migrate: (persistedState: any) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return {
            items: [],
            ownerUserId: null,
            scopedItemsByUser: {},
          };
        }

        const ownerUserId = normalizeOwnerUserId(persistedState.ownerUserId);
        const scopedItemsByUser = sanitizeScopedItems(persistedState.scopedItemsByUser);
        const legacyItems = Array.isArray(persistedState.items)
          ? persistedState.items.filter((item: any) => isValidCartItem(item))
          : [];

        if (legacyItems.length > 0 && Object.keys(scopedItemsByUser).length === 0) {
          scopedItemsByUser[guestScopeKey] = legacyItems;
        }

        const currentScopeKey = resolveScopeKey(ownerUserId);
        const currentItems = (scopedItemsByUser[currentScopeKey] || []).filter((item) => isValidCartItem(item));

        return {
          ...persistedState,
          ownerUserId,
          scopedItemsByUser,
          items: currentItems,
        };
      },
    }
  )
);
