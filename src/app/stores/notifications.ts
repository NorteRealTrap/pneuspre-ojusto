import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';

interface NotificationFlags {
  cartAddedAt: string | null;
  purchaseCompletedAt: string | null;
  paymentApprovedAt: string | null;
  orderOnTheWayAt: string | null;
}

interface NotificationsState {
  ownerUserId: string | null;
  flags: NotificationFlags;
  notifiedShippedOrderIds: string[];
  setOwnerUserId: (userId: string | null) => void;
  notifyCartAdded: (productLabel?: string) => void;
  notifyPurchaseCompleted: (orderId?: string) => void;
  notifyPaymentApproved: (orderId?: string, paymentMethodLabel?: string) => void;
  notifyOrderOnTheWay: (orderId: string) => void;
  clearFlags: () => void;
}

const initialFlags: NotificationFlags = {
  cartAddedAt: null,
  purchaseCompletedAt: null,
  paymentApprovedAt: null,
  orderOnTheWayAt: null,
};

const nowIso = () => new Date().toISOString();

function normalizeOwnerUserId(userId?: string | null): string | null {
  const normalized = String(userId || '').trim();
  return normalized || null;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      ownerUserId: null,
      flags: initialFlags,
      notifiedShippedOrderIds: [],

      setOwnerUserId: (userId) => {
        const nextOwnerUserId = normalizeOwnerUserId(userId);
        set((state) => {
          if (state.ownerUserId === nextOwnerUserId) {
            return state;
          }

          return {
            ownerUserId: nextOwnerUserId,
            flags: initialFlags,
            notifiedShippedOrderIds: [],
          };
        });
      },

      notifyCartAdded: (productLabel) => {
        set((state) => ({
          flags: {
            ...state.flags,
            cartAddedAt: nowIso(),
          },
        }));

        toast.success(
          productLabel ? `${productLabel} adicionado ao carrinho.` : 'Produto adicionado ao carrinho.',
          { id: 'cart-added' }
        );
      },

      notifyPurchaseCompleted: (orderId) => {
        set((state) => ({
          flags: {
            ...state.flags,
            purchaseCompletedAt: nowIso(),
          },
        }));

        const orderLabel = orderId ? ` Pedido #${orderId.slice(0, 8)}.` : '';
        toast.success(`Pedido finalizado com sucesso!${orderLabel}`, { id: 'purchase-completed' });
      },

      notifyPaymentApproved: (orderId, paymentMethodLabel) => {
        set((state) => ({
          flags: {
            ...state.flags,
            paymentApprovedAt: nowIso(),
          },
        }));

        const orderLabel = orderId ? ` Pedido #${orderId.slice(0, 8)}.` : '';
        const methodLabel = paymentMethodLabel ? ` via ${paymentMethodLabel}` : '';
        toast.success(`Pagamento aprovado${methodLabel}!${orderLabel}`, {
          id: orderId ? `payment-approved-${orderId}` : 'payment-approved',
        });
      },

      notifyOrderOnTheWay: (orderId) => {
        const normalizedOrderId = orderId.trim();
        if (!normalizedOrderId) {
          return;
        }

        if (get().notifiedShippedOrderIds.includes(normalizedOrderId)) {
          return;
        }

        set((state) => ({
          flags: {
            ...state.flags,
            orderOnTheWayAt: nowIso(),
          },
          notifiedShippedOrderIds: [...state.notifiedShippedOrderIds, normalizedOrderId],
        }));

        toast.info(`Pedido #${normalizedOrderId.slice(0, 8)} esta a caminho.`, {
          id: `order-on-the-way-${normalizedOrderId}`,
        });
      },

      clearFlags: () => {
        set({ flags: initialFlags });
      },
    }),
    {
      name: 'notifications-storage',
      version: 2,
      migrate: (persistedState: any) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return {
            ownerUserId: null,
            flags: initialFlags,
            notifiedShippedOrderIds: [],
          };
        }

        return {
          ...persistedState,
          ownerUserId: normalizeOwnerUserId(persistedState.ownerUserId),
          flags: persistedState.flags || initialFlags,
          notifiedShippedOrderIds: Array.isArray(persistedState.notifiedShippedOrderIds)
            ? persistedState.notifiedShippedOrderIds
            : [],
        };
      },
      partialize: (state) => ({
        ownerUserId: state.ownerUserId,
        flags: state.flags,
        notifiedShippedOrderIds: state.notifiedShippedOrderIds,
      }),
    }
  )
);
