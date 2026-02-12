// Tipos para o projeto Pneus Preçojusto

export interface Product {
  id: string;
  brand: string;
  model: string;
  width: string;
  profile: string;
  diameter: string;
  load_index: string;
  speed_rating: string;
  price: number;
  old_price?: number;
  stock: number;
  image: string;
  features: string[];
  category: string;
  season: string;
  runflat: boolean;
  featured: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: 'credit_card' | 'pix' | 'boleto';
  payment_id?: string;
  shipping_address: ShippingAddress;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  created_at: string;
  products?: Product;
}

export interface ShippingAddress {
  street: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  zipcode: string;
}

export interface UserProfile {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  role: 'client' | 'admin';
  address?: ShippingAddress;
  created_at: string;
  updated_at: string;
}

export interface PaymentData {
  method: 'credit_card' | 'pix' | 'boleto';
  amount: number;
  orderId: string;
  description: string;
}

export interface CreditCardData {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
  installments: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}
/**
 * =====================================================
 * PAYOUT PROVIDER INTERFACE (Abstração de provedores)
 * =====================================================
 */

export interface PayoutProvider {
  name: 'blackcat' | 'wise';
  
  // Ciclo de vida de recipient
  createRecipient(data: CreateRecipientParams): Promise<RecipientResult>;
  validateRecipientRequirements(quote: QuoteResult): Promise<RecipientRequirement[]>;
  
  // Cotação (quote)
  createQuote(data: CreateQuoteParams): Promise<QuoteResult>;
  getQuote(quoteId: string): Promise<QuoteResult>;
  
  // Requisitos da transferência (compliance/KYC)
  getTransferRequirements(data: TransferRequirementsParams): Promise<TransferRequirement[]>;
  
  // Transferência
  createTransfer(data: CreateTransferParams): Promise<TransferResult>;
  fundTransfer(data: FundTransferParams): Promise<FundingResult>;
  getTransferStatus(transferId: string): Promise<TransfersStatus>;
  
  // Webhook
  handleWebhook(payload: WebhookPayload, signature: string): Promise<void>;
  validateWebhookSignature(payload: string, signature: string): boolean;
}

/**
 * =====================================================
 * WISE PAYOUT TYPES
 * =====================================================
 */

export interface WiseConfig {
  env: 'sandbox' | 'production';
  baseUrl: string;
  mtlsUrl?: string;
  clientId: string;
  clientSecret: string;
  mtlsCertPath?: string;
  mtlsKeyPath?: string;
  webhookSecret?: string;
  tokenCacheStrategy: 'memory' | 'redis';
}

export interface WiseTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface WiseProfile {
  id: number;
  type: 'personal' | 'business';
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  dateOfBirth?: string;
  businessCategory?: string;
}

export interface CreateRecipientParams {
  profileId?: number;
  currency: string;
  type: 'iban' | 'bban' | 'sort_code' | 'clabe' | 'stp' | 'cpf' | 'cnpj' | 'email' | 'mobile';
  legalType?: 'PRIVATE' | 'BUSINESS';
  details: Record<string, unknown>;
  accountHolderName: string;
}

export interface RecipientResult {
  id: string; // wise_recipient_id
  localId?: string; // id_local (nosso ID)
  type: string;
  currency: string;
  accountHolderName: string;
  details: Record<string, unknown>;
  hash?: string;
  createdAt: string;
  active: boolean;
}

export interface RecipientRequirement {
  key: string;
  type: 'text' | 'select' | 'date' | 'checkbox';
  label: string;
  required: boolean;
  validationRegexp?: string;
  refreshRequirementsOnChange?: boolean;
  minLength?: number;
  maxLength?: number;
  defaultValue?: unknown;
  valuesAllowed?: Array<{
    key: string;
    label: string;
  }>;
}

export interface CreateQuoteParams {
  profileId: number;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount?: number;
  targetAmount?: number;
  payOut?: 'BALANCE' | 'SWIFT' | 'BANK' | 'SEPA' | 'ACH';
  preferredPayIn?: 'BALANCE' | 'CARD' | 'BANK_TRANSFER';
}

export interface QuoteResult {
  id: string; // wise_quote_id
  localId?: string; // id_local
  profileId: number;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount?: number;
  targetAmount?: number;
  rate: number;
  fee: {
    total: number;
    percentage?: number;
    percentageOfAmount?: number;
    fixedFee?: number;
  };
  payOut?: string;
  createdAt: string;
  expiresAt: string;
  rateType: 'FIXED' | 'INDICATIVE';
}

export interface TransferRequirementsParams {
  profileId: number;
  quoteId: string;
  recipientId: string;
  transferPurpose?: string;
  sourceOfFunds?: string;
  sourceOfFundsOther?: string;
}

export interface TransferRequirement {
  key: string;
  type: 'text' | 'select' | 'date' | 'checkbox';
  label: string;
  required: boolean;
  validationRegexp?: string;
  refreshRequirementsOnChange?: boolean;
  minLength?: number;
  maxLength?: number;
  valuesAllowed?: Array<{
    key: string;
    label: string;
  }>;
}

export interface CreateTransferParams {
  profileId: number;
  quote: QuoteResult;
  recipient: RecipientResult;
  customerTransactionId: string; // para idempotência
  details?: Record<string, unknown>;
  transferPurpose?: string;
  sourceOfFunds?: string;
}

export interface TransferResult {
  id: string; // wise_transfer_id
  localId?: string;
  quoteId: string;
  recipientId: string;
  customerTransactionId: string;
  status: 'draft' | 'pending_approval' | 'active' | 'processing' | 'outgoing_payment_sent' | 'funds_returned' | 'cancelled';
  sourceAmount?: number;
  targetAmount?: number;
  sourceCurrency: string;
  targetCurrency: string;
  exchangeRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface FundTransferParams {
  profileId: number;
  transferId: string;
  method: 'BALANCE' | 'CARD' | 'BANK_TRANSFER';
}

export interface FundingResult {
  success: boolean;
  status: string;
  transferId: string;
  transactionId?: string;
  message: string;
}

export interface TransfersStatus {
  id: string;
  status: string;
  sourceAmount?: number;
  targetAmount?: number;
  exchangeRate?: number;
  createdAt: string;
  updatedAt: string;
  details?: Record<string, unknown>;
}

export interface WebhookPayload {
  deliveryId: string;
  eventType: string;
  createdAt: string;
  data: Record<string, unknown>;
}

export interface WebhookEvent {
  id: string;
  deliveryId: string;
  eventType: string;
  payload: Record<string, unknown>;
  signatureValid?: boolean;
  processedAt?: string;
  createdAt: string;
}