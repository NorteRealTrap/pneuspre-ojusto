import { authService } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface CheckoutPaymentInitResponse {
  success: boolean;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: 'BRL';
  paymentMethod: 'credit_card' | 'pix' | 'boleto';
  status: string;
  orderStatus?: string;
  expiresAt?: string;
  idempotent?: boolean;
}

export interface CheckoutPaymentConfirmResponse {
  success: boolean;
  paymentId: string;
  orderId: string;
  paymentMethod: 'credit_card' | 'pix' | 'boleto';
  status: string;
  orderStatus?: string;
  confirmations?: number;
  idempotent?: boolean;
}

export interface CheckoutPaymentStatusResponse {
  success: boolean;
  paymentId: string;
  orderId: string | null;
  paymentMethod: 'credit_card' | 'pix' | 'boleto';
  status: string;
  orderStatus: string;
  amount: number;
  currency: 'BRL';
  expiresAt: string | null;
}

const ensureSessionToken = async () => {
  const session = await authService.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Sessao expirada. Faca login novamente.');
  }

  return token;
};

const parseApiError = async (response: Response, fallbackMessage: string) => {
  try {
    const payload = await response.json();
    if (payload?.error && typeof payload.error === 'string') {
      return payload.error;
    }
  } catch (_error) {
    // noop
  }

  return fallbackMessage;
};

export const paymentService = {
  createCharge: async (
    amount: number,
    orderId: string,
    paymentMethod: 'credit_card' | 'pix' | 'boleto',
    idempotencyKey?: string
  ): Promise<CheckoutPaymentInitResponse> => {
    const token = await ensureSessionToken();
    const normalizedIdempotencyKey = idempotencyKey || `checkout-${orderId}`;

    const response = await fetch(`${API_URL}/payment/checkout/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Idempotency-Key': normalizedIdempotencyKey,
      },
      body: JSON.stringify({
        amount,
        orderId,
        paymentMethod,
        currency: 'BRL',
        idempotencyKey: normalizedIdempotencyKey,
      }),
    });

    if (!response.ok) {
      const message = await parseApiError(response, 'Erro ao iniciar pagamento');
      throw new Error(message);
    }

    return response.json();
  },

  confirmPayment: async (paymentId: string): Promise<CheckoutPaymentConfirmResponse> => {
    const token = await ensureSessionToken();

    const response = await fetch(`${API_URL}/payment/checkout/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paymentId }),
    });

    if (!response.ok) {
      const message = await parseApiError(response, 'Erro ao confirmar pagamento');
      throw new Error(message);
    }

    return response.json();
  },

  getPaymentStatus: async (paymentId: string): Promise<CheckoutPaymentStatusResponse> => {
    const token = await ensureSessionToken();

    const response = await fetch(`${API_URL}/payment/checkout/${encodeURIComponent(paymentId)}/status`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const message = await parseApiError(response, 'Erro ao consultar status do pagamento');
      throw new Error(message);
    }

    return response.json();
  },

  refund: async (paymentId: string, amount: number) => {
    const token = await ensureSessionToken();

    const response = await fetch(`${API_URL}/payment/checkout/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paymentId, amount }),
    });

    if (!response.ok) {
      const message = await parseApiError(response, 'Erro ao processar reembolso');
      throw new Error(message);
    }

    return response.json();
  },
};