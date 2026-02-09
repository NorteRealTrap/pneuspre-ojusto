import axios, { AxiosInstance } from 'axios';

/**
 * Serviço Genérico de Pagamentos para Gateways Brasileiros
 * Suporta: PagBank, Stone, Mercado Pago, Cielo, etc.
 */

export type PaymentProvider = 'pagbank' | 'stone' | 'mercadopago' | 'cielo' | 'blackcat';

export interface PaymentConfig {
  provider: PaymentProvider;
  apiKey: string;
  clientId?: string;
  clientSecret?: string;
  environment: 'sandbox' | 'production';
  webhookUrl?: string;
}

export interface PaymentCustomer {
  name: string;
  email: string;
  document: string; // CPF/CNPJ
  phone: string;
}

export interface PaymentAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface CreditCardData {
  number: string;
  holderName: string;
  expirationMonth: string;
  expirationYear: string;
  cvv: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  description: string;
  customer: PaymentCustomer;
  billing: PaymentAddress;
  shipping?: PaymentAddress;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface CreditCardPayment extends PaymentRequest {
  card: CreditCardData;
  installments: number;
}

export interface PixPayment extends PaymentRequest {}

export interface BoletoPayment extends PaymentRequest {
  dueDate: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId: string;
  status: 'pending' | 'approved' | 'declined' | 'processing' | 'cancelled';
  message: string;
  data?: {
    qrCode?: string;
    qrCodeBase64?: string;
    pixCode?: string;
    boletoUrl?: string;
    digitableLine?: string;
    barcode?: string;
    expiresAt?: string;
    dueDate?: string;
  };
}

class PaymentGatewayService {
  private client: AxiosInstance;
  private config: PaymentConfig;
  private baseURL: string;

  constructor(config: PaymentConfig) {
    this.config = config;
    this.baseURL = this.getBaseURL();

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: this.getHeaders(),
    });

    this.setupInterceptors();
  }

  private getBaseURL(): string {
    const urls = {
      pagbank: {
        sandbox: 'https://sandbox.api.pagseguro.com',
        production: 'https://api.pagseguro.com',
      },
      stone: {
        sandbox: 'https://sandbox-api.stone.com.br',
        production: 'https://api.stone.com.br',
      },
      mercadopago: {
        sandbox: 'https://api.mercadopago.com',
        production: 'https://api.mercadopago.com',
      },
      cielo: {
        sandbox: 'https://apisandbox.cieloecommerce.cielo.com.br',
        production: 'https://api.cieloecommerce.cielo.com.br',
      },
      blackcat: {
        sandbox: 'https://sandbox-api.blackcatpagamentos.online/v1',
        production: 'https://api.blackcatpagamentos.online/v1',
      },
    };

    return urls[this.config.provider][this.config.environment];
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    switch (this.config.provider) {
      case 'pagbank':
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
      case 'stone':
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
      case 'mercadopago':
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
      case 'cielo':
        headers['MerchantId'] = this.config.clientId || '';
        headers['MerchantKey'] = this.config.apiKey;
        break;
      case 'blackcat':
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        break;
    }

    return headers;
  }

  private setupInterceptors(): void {
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error(`${this.config.provider} API Error:`, error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Processar pagamento com Cartão de Crédito
   */
  async processCreditCard(data: CreditCardPayment): Promise<PaymentResponse> {
    try {
      const payload = this.formatCreditCardPayload(data);
      const endpoint = this.getCreditCardEndpoint();
      
      const response = await this.client.post(endpoint, payload);
      
      return this.formatResponse(response.data, 'credit_card');
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Gerar pagamento PIX
   */
  async generatePix(data: PixPayment): Promise<PaymentResponse> {
    try {
      const payload = this.formatPixPayload(data);
      const endpoint = this.getPixEndpoint();
      
      const response = await this.client.post(endpoint, payload);
      
      return this.formatResponse(response.data, 'pix');
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Gerar Boleto Bancário
   */
  async generateBoleto(data: BoletoPayment): Promise<PaymentResponse> {
    try {
      const payload = this.formatBoletoPayload(data);
      const endpoint = this.getBoletoEndpoint();
      
      const response = await this.client.post(endpoint, payload);
      
      return this.formatResponse(response.data, 'boleto');
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Consultar status de pagamento
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    try {
      const endpoint = this.getStatusEndpoint(transactionId);
      const response = await this.client.get(endpoint);
      
      return this.formatResponse(response.data, 'status');
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Cancelar pagamento
   */
  async cancelPayment(transactionId: string): Promise<PaymentResponse> {
    try {
      const endpoint = this.getCancelEndpoint(transactionId);
      const response = await this.client.post(endpoint);
      
      return {
        success: true,
        transactionId,
        status: 'cancelled',
        message: 'Pagamento cancelado com sucesso',
        data: response.data,
      };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  // Métodos privados para formatar payloads específicos de cada provedor

  private formatCreditCardPayload(data: CreditCardPayment): any {
    switch (this.config.provider) {
      case 'pagbank':
        return this.formatPagBankCreditCard(data);
      case 'stone':
        return this.formatStoneCreditCard(data);
      case 'mercadopago':
        return this.formatMercadoPagoCreditCard(data);
      case 'cielo':
        return this.formatCieloCreditCard(data);
      case 'blackcat':
        return this.formatBlackCatCreditCard(data);
      default:
        return data;
    }
  }

  private formatPixPayload(data: PixPayment): any {
    switch (this.config.provider) {
      case 'pagbank':
        return this.formatPagBankPix(data);
      case 'stone':
        return this.formatStonePix(data);
      case 'mercadopago':
        return this.formatMercadoPagoPix(data);
      default:
        return data;
    }
  }

  private formatBoletoPayload(data: BoletoPayment): any {
    switch (this.config.provider) {
      case 'pagbank':
        return this.formatPagBankBoleto(data);
      case 'mercadopago':
        return this.formatMercadoPagoBoleto(data);
      default:
        return data;
    }
  }

  // Endpoints específicos por provedor

  private getCreditCardEndpoint(): string {
    const endpoints = {
      pagbank: '/charges',
      stone: '/transactions',
      mercadopago: '/v1/payments',
      cielo: '/1/sales',
      blackcat: '/payments/credit-card',
    };
    return endpoints[this.config.provider];
  }

  private getPixEndpoint(): string {
    const endpoints = {
      pagbank: '/charges',
      stone: '/pix/charges',
      mercadopago: '/v1/payments',
      blackcat: '/payments/pix',
    };
    return endpoints[this.config.provider] || '/pix';
  }

  private getBoletoEndpoint(): string {
    const endpoints = {
      pagbank: '/charges',
      mercadopago: '/v1/payments',
      blackcat: '/payments/boleto',
    };
    return endpoints[this.config.provider] || '/boleto';
  }

  private getStatusEndpoint(transactionId: string): string {
    return `/payments/${transactionId}`;
  }

  private getCancelEndpoint(transactionId: string): string {
    return `/payments/${transactionId}/cancel`;
  }

  // Formatadores específicos (exemplos simplificados)

  private formatPagBankCreditCard(data: CreditCardPayment): any {
    return {
      reference_id: Date.now().toString(),
      customer: {
        name: data.customer.name,
        email: data.customer.email,
        tax_id: data.customer.document,
        phones: [{ country: '55', area: data.customer.phone.substring(0, 2), number: data.customer.phone.substring(2) }],
      },
      items: data.items || [{ reference_id: '1', name: data.description, quantity: 1, unit_amount: Math.round(data.amount * 100) }],
      charges: [{
        reference_id: Date.now().toString(),
        description: data.description,
        amount: { value: Math.round(data.amount * 100), currency: 'BRL' },
        payment_method: {
          type: 'CREDIT_CARD',
          installments: data.installments,
          capture: true,
          card: {
            number: data.card.number,
            exp_month: data.card.expirationMonth,
            exp_year: data.card.expirationYear,
            security_code: data.card.cvv,
            holder: { name: data.card.holderName },
          },
        },
      }],
    };
  }

  private formatStoneCreditCard(data: CreditCardPayment): any {
    return {
      amount: Math.round(data.amount * 100),
      payment_method: 'credit',
      installments: data.installments,
      card: {
        number: data.card.number,
        holder_name: data.card.holderName,
        exp_month: parseInt(data.card.expirationMonth),
        exp_year: parseInt(data.card.expirationYear),
        cvv: data.card.cvv,
      },
      customer: {
        name: data.customer.name,
        document: data.customer.document,
        email: data.customer.email,
      },
    };
  }

  private formatMercadoPagoCreditCard(data: CreditCardPayment): any {
    return {
      transaction_amount: data.amount,
      installments: data.installments,
      payment_method_id: 'visa',
      payer: {
        email: data.customer.email,
        identification: { type: 'CPF', number: data.customer.document },
      },
    };
  }

  private formatCieloCreditCard(data: CreditCardPayment): any {
    return {
      MerchantOrderId: Date.now().toString(),
      Customer: {
        Name: data.customer.name,
        Email: data.customer.email,
        Identity: data.customer.document,
      },
      Payment: {
        Type: 'CreditCard',
        Amount: Math.round(data.amount * 100),
        Installments: data.installments,
        CreditCard: {
          CardNumber: data.card.number,
          Holder: data.card.holderName,
          ExpirationDate: `${data.card.expirationMonth}/${data.card.expirationYear}`,
          SecurityCode: data.card.cvv,
        },
      },
    };
  }

  private formatBlackCatCreditCard(data: CreditCardPayment): any {
    return {
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      customer: data.customer,
      billing: data.billing,
      card: data.card,
      installments: data.installments,
    };
  }

  private formatPagBankPix(data: PixPayment): any {
    return {
      reference_id: Date.now().toString(),
      customer: {
        name: data.customer.name,
        email: data.customer.email,
        tax_id: data.customer.document,
      },
      items: data.items || [{ reference_id: '1', name: data.description, quantity: 1, unit_amount: Math.round(data.amount * 100) }],
      qr_codes: [{
        amount: { value: Math.round(data.amount * 100) },
        expiration_date: new Date(Date.now() + 30 * 60000).toISOString(),
      }],
    };
  }

  private formatStonePix(data: PixPayment): any {
    return {
      amount: Math.round(data.amount * 100),
      customer: {
        name: data.customer.name,
        document: data.customer.document,
      },
    };
  }

  private formatMercadoPagoPix(data: PixPayment): any {
    return {
      transaction_amount: data.amount,
      payment_method_id: 'pix',
      payer: {
        email: data.customer.email,
        identification: { type: 'CPF', number: data.customer.document },
      },
    };
  }

  private formatPagBankBoleto(data: BoletoPayment): any {
    return {
      reference_id: Date.now().toString(),
      customer: {
        name: data.customer.name,
        email: data.customer.email,
        tax_id: data.customer.document,
      },
      items: data.items || [{ reference_id: '1', name: data.description, quantity: 1, unit_amount: Math.round(data.amount * 100) }],
      charges: [{
        reference_id: Date.now().toString(),
        description: data.description,
        amount: { value: Math.round(data.amount * 100), currency: 'BRL' },
        payment_method: {
          type: 'BOLETO',
          boleto: {
            due_date: data.dueDate,
            instruction_lines: {
              line_1: 'Pagamento processado para DESC Fatura',
              line_2: 'Via PagBank',
            },
          },
        },
      }],
    };
  }

  private formatMercadoPagoBoleto(data: BoletoPayment): any {
    return {
      transaction_amount: data.amount,
      payment_method_id: 'bolbradesco',
      payer: {
        email: data.customer.email,
        identification: { type: 'CPF', number: data.customer.document },
      },
    };
  }

  private formatResponse(data: any, type: string): PaymentResponse {
    // Formato genérico - adaptar conforme resposta de cada provedor
    return {
      success: true,
      transactionId: data.id || data.transaction_id || data.Payment?.PaymentId || '',
      status: this.normalizeStatus(data.status || data.Payment?.Status),
      message: 'Pagamento processado com sucesso',
      data: {
        qrCode: data.qr_code || data.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: data.qr_code_base64,
        pixCode: data.pix_code || data.point_of_interaction?.transaction_data?.qr_code_base64,
        boletoUrl: data.boleto_url || data.transaction_details?.external_resource_url,
        digitableLine: data.digitable_line || data.barcode?.content,
        barcode: data.barcode,
        expiresAt: data.expires_at,
        dueDate: data.due_date,
      },
    };
  }

  private normalizeStatus(status: any): 'pending' | 'approved' | 'declined' | 'processing' | 'cancelled' {
    const statusMap: Record<string, 'pending' | 'approved' | 'declined' | 'processing' | 'cancelled'> = {
      'PAID': 'approved',
      'AUTHORIZED': 'approved',
      'approved': 'approved',
      'WAITING': 'pending',
      'pending': 'pending',
      'IN_ANALYSIS': 'processing',
      'processing': 'processing',
      'DECLINED': 'declined',
      'rejected': 'declined',
      'CANCELED': 'cancelled',
      'cancelled': 'cancelled',
    };

    return statusMap[status] || 'pending';
  }

  private handleError(error: any): PaymentResponse {
    return {
      success: false,
      transactionId: '',
      status: 'declined',
      message: error.response?.data?.message || error.message || 'Erro ao processar pagamento',
    };
  }
}

// Instância singleton
let gatewayInstance: PaymentGatewayService | null = null;

export const initializePaymentGateway = (config: PaymentConfig) => {
  gatewayInstance = new PaymentGatewayService(config);
  return gatewayInstance;
};

export const getPaymentGateway = (): PaymentGatewayService => {
  if (!gatewayInstance) {
    const provider = (import.meta.env.VITE_PAYMENT_PROVIDER || 'blackcat') as PaymentProvider;
    const apiKey = import.meta.env.VITE_PAYMENT_API_KEY;
    
    if (!apiKey) {
      throw new Error('Payment Gateway não foi inicializado. Configure VITE_PAYMENT_API_KEY no arquivo .env');
    }
    
    const environment = (import.meta.env.VITE_PAYMENT_ENV as 'sandbox' | 'production') || 'sandbox';
    
    gatewayInstance = new PaymentGatewayService({
      provider,
      apiKey,
      environment,
      clientId: import.meta.env.VITE_PAYMENT_CLIENT_ID,
      clientSecret: import.meta.env.VITE_PAYMENT_CLIENT_SECRET,
      webhookUrl: import.meta.env.VITE_PAYMENT_WEBHOOK_URL,
    });
  }
  
  return gatewayInstance;
};

export type {
  PaymentConfig,
  PaymentRequest,
  CreditCardPayment,
  PixPayment,
  BoletoPayment,
  PaymentResponse,
};
