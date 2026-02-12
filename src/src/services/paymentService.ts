import { authService } from './supabase';
import { buildApiUrl } from './apiBase';

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

const toRequestTarget = (input: RequestInfo | URL) => {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const mapFetchError = (error: unknown, input: RequestInfo | URL) => {
  const target = toRequestTarget(input);

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new Error(`Tempo limite excedido na requisicao: ${target}`);
  }

  if (error instanceof TypeError) {
    return new Error(
      `Falha de rede ao acessar ${target}. Verifique CORS, URL da API (VITE_API_URL) e disponibilidade do backend.`
    );
  }

  if (error instanceof Error) {
    return new Error(`Erro de comunicacao com API em ${target}: ${error.message}`);
  }

  return new Error(`Erro desconhecido ao acessar ${target}`);
};

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    throw mapFetchError(error, input);
  } finally {
    clearTimeout(timeout);
  }
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

    const response = await fetchWithTimeout(buildApiUrl('/payment/checkout/initiate'), {
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
      const message = await parseApiError(
        response,
        `Erro ao iniciar pagamento (HTTP ${response.status})`
      );
      throw new Error(message);
    }

    return response.json();
  },

  confirmPayment: async (paymentId: string): Promise<CheckoutPaymentConfirmResponse> => {
    const token = await ensureSessionToken();

    const response = await fetchWithTimeout(buildApiUrl('/payment/checkout/confirm'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paymentId }),
    });

    if (!response.ok) {
      const message = await parseApiError(
        response,
        `Erro ao confirmar pagamento (HTTP ${response.status})`
      );
      throw new Error(message);
    }

    return response.json();
  },

  getPaymentStatus: async (paymentId: string): Promise<CheckoutPaymentStatusResponse> => {
    const token = await ensureSessionToken();

    const response = await fetchWithTimeout(buildApiUrl(`/payment/checkout/${encodeURIComponent(paymentId)}/status`), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const message = await parseApiError(
        response,
        `Erro ao consultar status do pagamento (HTTP ${response.status})`
      );
      throw new Error(message);
    }

    return response.json();
  },

  refund: async (paymentId: string, amount: number) => {
    const token = await ensureSessionToken();

    const response = await fetchWithTimeout(buildApiUrl('/payment/checkout/refund'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paymentId, amount }),
    });

    if (!response.ok) {
      const message = await parseApiError(
        response,
        `Erro ao processar reembolso (HTTP ${response.status})`
      );
      throw new Error(message);
    }

    return response.json();
  },
};
