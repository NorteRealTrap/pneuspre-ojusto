import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';

interface NotificationFlags {
  cartAddedAt: string | null;
  purchaseCompletedAt: string | null;
  orderOnTheWayAt: string | null;
}

interface NotificationsState {
  flags: NotificationFlags;
  notifiedShippedOrderIds: string[];
  notifyCartAdded: (productLabel?: string) => void;
  notifyPurchaseCompleted: (orderId?: string) => void;
  notifyOrderOnTheWay: (orderId: string) => void;
  clearFlags: () => void;
}

const initialFlags: NotificationFlags = {
  cartAddedAt: null,
  purchaseCompletedAt: null,
  orderOnTheWayAt: null,
};

const nowIso = () => new Date().toISOString();

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      flags: initialFlags,
      notifiedShippedOrderIds: [],

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
        toast.success(`Compra realizada com sucesso!${orderLabel}`, { id: 'purchase-completed' });
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
      partialize: (state) => ({
        flags: state.flags,
        notifiedShippedOrderIds: state.notifiedShippedOrderIds,
      }),
    }
  )
);

