import { buildApiUrl } from './apiBase';
import { authService } from './supabase';
import {
  CreateQuoteParams,
  CreateRecipientParams,
  CreateTransferParams,
  FundTransferParams,
  FundingResult,
  PayoutProvider,
  QuoteResult,
  RecipientRequirement,
  RecipientResult,
  TransferRequirement,
  TransferRequirementsParams,
  TransfersStatus,
  TransferResult,
  WebhookPayload,
} from '../types';

const ensureSessionToken = async () => {
  const session = await authService.getSession();
  const token = session?.access_token;

  if (!token) {
    throw new Error('Sessao expirada. Faca login novamente.');
  }

  return token;
};

const fetchWithAuth = async <T>(path: string, init: RequestInit = {}, timeoutMs = 20000): Promise<T> => {
  const token = await ensureSessionToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(buildApiUrl(path), {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || `Erro Wise payout (HTTP ${response.status})`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Tempo limite excedido na comunicacao com o backend de payout.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

class WisePayoutService implements PayoutProvider {
  name: 'wise' = 'wise';

  async createRecipient(data: CreateRecipientParams): Promise<RecipientResult> {
    return fetchWithAuth<RecipientResult>('/payout/wise/recipients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async validateRecipientRequirements(quote: QuoteResult): Promise<RecipientRequirement[]> {
    return fetchWithAuth<RecipientRequirement[]>(
      `/payout/wise/quotes/${encodeURIComponent(quote.id)}/account-requirements`,
      { method: 'GET' }
    );
  }

  async createQuote(data: CreateQuoteParams): Promise<QuoteResult> {
    return fetchWithAuth<QuoteResult>('/payout/wise/quotes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getQuote(quoteId: string): Promise<QuoteResult> {
    return fetchWithAuth<QuoteResult>(`/payout/wise/quotes/${encodeURIComponent(quoteId)}`, {
      method: 'GET',
    });
  }

  async getTransferRequirements(data: TransferRequirementsParams): Promise<TransferRequirement[]> {
    return fetchWithAuth<TransferRequirement[]>('/payout/wise/transfers/requirements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createTransfer(data: CreateTransferParams): Promise<TransferResult> {
    return fetchWithAuth<TransferResult>('/payout/wise/transfers', {
      method: 'POST',
      body: JSON.stringify({
        profileId: data.profileId,
        quoteId: data.quote.id,
        recipientId: data.recipient.id,
        customerTransactionId: data.customerTransactionId,
        details: data.details,
      }),
    });
  }

  async fundTransfer(data: FundTransferParams): Promise<FundingResult> {
    return fetchWithAuth<FundingResult>(`/payout/wise/transfers/${encodeURIComponent(data.transferId)}/fund`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTransferStatus(transferId: string): Promise<TransfersStatus> {
    return fetchWithAuth<TransfersStatus>(`/payout/wise/transfers/${encodeURIComponent(transferId)}/status`, {
      method: 'GET',
    });
  }

  async handleWebhook(payload: WebhookPayload, signature: string): Promise<void> {
    await fetchWithAuth<{ ok: boolean }>('/payout/wise/webhooks/handle', {
      method: 'POST',
      body: JSON.stringify({ payload, signature }),
    });
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    return payload.length > 0 && signature.length > 0;
  }
}

export const wisePayoutService = new WisePayoutService();
export default WisePayoutService;
