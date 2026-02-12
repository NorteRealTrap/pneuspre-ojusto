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
import { wisePayoutService } from './wiseService';

class UnsupportedBlackcatPayoutProvider implements PayoutProvider {
  name: 'blackcat' = 'blackcat';

  private unsupported(method: string): never {
    throw new Error(`Blackcat payout nao configurado para ${method}. Use provider wise para pay-out.`);
  }

  async createRecipient(_data: CreateRecipientParams): Promise<RecipientResult> {
    return this.unsupported('createRecipient');
  }

  async validateRecipientRequirements(_quote: QuoteResult): Promise<RecipientRequirement[]> {
    return this.unsupported('validateRecipientRequirements');
  }

  async createQuote(_data: CreateQuoteParams): Promise<QuoteResult> {
    return this.unsupported('createQuote');
  }

  async getQuote(_quoteId: string): Promise<QuoteResult> {
    return this.unsupported('getQuote');
  }

  async getTransferRequirements(_data: TransferRequirementsParams): Promise<TransferRequirement[]> {
    return this.unsupported('getTransferRequirements');
  }

  async createTransfer(_data: CreateTransferParams): Promise<TransferResult> {
    return this.unsupported('createTransfer');
  }

  async fundTransfer(_data: FundTransferParams): Promise<FundingResult> {
    return this.unsupported('fundTransfer');
  }

  async getTransferStatus(_transferId: string): Promise<TransfersStatus> {
    return this.unsupported('getTransferStatus');
  }

  async handleWebhook(_payload: WebhookPayload, _signature: string): Promise<void> {
    this.unsupported('handleWebhook');
  }

  validateWebhookSignature(_payload: string, _signature: string): boolean {
    return false;
  }
}

const blackcatPayoutProvider = new UnsupportedBlackcatPayoutProvider();

const getConfiguredPayoutProviderName = (): 'wise' | 'blackcat' => {
  const configured = String(import.meta.env.VITE_PAYOUT_PROVIDER || 'wise').trim().toLowerCase();
  return configured === 'blackcat' ? 'blackcat' : 'wise';
};

const providers: Record<'wise' | 'blackcat', PayoutProvider> = {
  wise: wisePayoutService,
  blackcat: blackcatPayoutProvider,
};

export const getPayoutProvider = (providerName?: 'wise' | 'blackcat'): PayoutProvider => {
  const selected = providerName || getConfiguredPayoutProviderName();
  return providers[selected];
};

export const payoutService = {
  getProvider: getPayoutProvider,

  createRecipient: (data: CreateRecipientParams, provider?: 'wise' | 'blackcat') =>
    getPayoutProvider(provider).createRecipient(data),

  createQuote: (data: CreateQuoteParams, provider?: 'wise' | 'blackcat') =>
    getPayoutProvider(provider).createQuote(data),

  createTransfer: (data: CreateTransferParams, provider?: 'wise' | 'blackcat') =>
    getPayoutProvider(provider).createTransfer(data),

  fundTransfer: (data: FundTransferParams, provider?: 'wise' | 'blackcat') =>
    getPayoutProvider(provider).fundTransfer(data),

  getTransferStatus: (transferId: string, provider?: 'wise' | 'blackcat') =>
    getPayoutProvider(provider).getTransferStatus(transferId),
};
