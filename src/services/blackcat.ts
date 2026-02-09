import axios, { AxiosInstance } from 'axios';

/**
 * Serviço de Integração com Black Cat Payments
 * Documentação: https://docs.blackcatpagamentos.online/
 */

interface BlackCatConfig {
  apiKey: string;
  environment: 'production' | 'sandbox';
}

interface PaymentData {
  amount: number;
  currency: string;
  description: string;
  customer: {
    name: string;
    email: string;
    document: string;
    phone: string;
  };
  billing: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

interface CreditCardData extends PaymentData {
  card: {
    number: string;
    holderName: string;
    expirationMonth: string;
    expirationYear: string;
    cvv: string;
  };
  installments: number;
}

interface PixData extends PaymentData {}

interface BoletoData extends PaymentData {
  dueDate: string;
}

interface PaymentResponse {
  success: boolean;
  transactionId: string;
  status: 'pending' | 'approved' | 'declined' | 'processing';
  message: string;
  data?: any;
}

class BlackCatPaymentsService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL: string;

  constructor(config: BlackCatConfig) {
    this.apiKey = config.apiKey;
    this.baseURL =
      config.environment === 'production'
        ? 'https://api.blackcatpagamentos.online/v1'
        : 'https://sandbox-api.blackcatpagamentos.online/v1';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Interceptor para adicionar autenticação em todas as requisições
    this.client.interceptors.request.use(
      (config) => {
        // Hash da API Key para não expor diretamente
        config.headers.Authorization = `Bearer ${this.apiKey}`;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Interceptor para tratamento de erros
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Black Cat API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Valida número de cartão de crédito usando algoritmo de Luhn
   */
  private validateCardNumber(cardNumber: string): boolean {
    const digits = cardNumber.replace(/\s/g, '');
    let sum = 0;
    let isEven = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * Valida CPF
   */
  private validateCPF(cpf: string): boolean {
    cpf = cpf.replace(/\D/g, '');

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf[i]) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (parseInt(cpf[9]) !== digit) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf[i]) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (parseInt(cpf[10]) !== digit) return false;

    return true;
  }

  /**
   * Processar pagamento com Cartão de Crédito
   */
  async processCreditCard(data: CreditCardData): Promise<PaymentResponse> {
    try {
      // Validações de segurança
      if (!this.validateCardNumber(data.card.number)) {
        return {
          success: false,
          transactionId: '',
          status: 'declined',
          message: 'Número de cartão inválido',
        };
      }

      if (!this.validateCPF(data.customer.document)) {
        return {
          success: false,
          transactionId: '',
          status: 'declined',
          message: 'CPF inválido',
        };
      }

      // Sanitizar dados do cartão antes de enviar
      const sanitizedData = {
        ...data,
        card: {
          ...data.card,
          number: data.card.number.replace(/\s/g, ''),
          cvv: data.card.cvv,
        },
      };

      const response = await this.client.post('/payments/credit-card', sanitizedData);

      return {
        success: true,
        transactionId: response.data.transactionId,
        status: response.data.status,
        message: 'Pagamento processado com sucesso',
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        transactionId: '',
        status: 'declined',
        message: error.response?.data?.message || 'Erro ao processar pagamento',
      };
    }
  }

  /**
   * Gerar pagamento PIX
   */
  async generatePix(data: PixData): Promise<PaymentResponse> {
    try {
      if (!this.validateCPF(data.customer.document)) {
        return {
          success: false,
          transactionId: '',
          status: 'declined',
          message: 'CPF inválido',
        };
      }

      const response = await this.client.post('/payments/pix', data);

      return {
        success: true,
        transactionId: response.data.transactionId,
        status: 'pending',
        message: 'PIX gerado com sucesso',
        data: {
          qrCode: response.data.qrCode,
          qrCodeBase64: response.data.qrCodeBase64,
          pixCode: response.data.pixCode,
          expiresAt: response.data.expiresAt,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        transactionId: '',
        status: 'declined',
        message: error.response?.data?.message || 'Erro ao gerar PIX',
      };
    }
  }

  /**
   * Gerar Boleto Bancário
   */
  async generateBoleto(data: BoletoData): Promise<PaymentResponse> {
    try {
      if (!this.validateCPF(data.customer.document)) {
        return {
          success: false,
          transactionId: '',
          status: 'declined',
          message: 'CPF inválido',
        };
      }

      const response = await this.client.post('/payments/boleto', data);

      return {
        success: true,
        transactionId: response.data.transactionId,
        status: 'pending',
        message: 'Boleto gerado com sucesso',
        data: {
          boletoUrl: response.data.boletoUrl,
          barcode: response.data.barcode,
          digitableLine: response.data.digitableLine,
          dueDate: response.data.dueDate,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        transactionId: '',
        status: 'declined',
        message: error.response?.data?.message || 'Erro ao gerar boleto',
      };
    }
  }

  /**
   * Consultar status de um pagamento
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    try {
      const response = await this.client.get(`/payments/${transactionId}`);

      return {
        success: true,
        transactionId: response.data.transactionId,
        status: response.data.status,
        message: 'Status obtido com sucesso',
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        transactionId: '',
        status: 'declined',
        message: error.response?.data?.message || 'Erro ao consultar status',
      };
    }
  }

  /**
   * Cancelar um pagamento
   */
  async cancelPayment(transactionId: string): Promise<PaymentResponse> {
    try {
      const response = await this.client.post(`/payments/${transactionId}/cancel`);

      return {
        success: true,
        transactionId: response.data.transactionId,
        status: 'cancelled',
        message: 'Pagamento cancelado com sucesso',
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        transactionId: '',
        status: 'declined',
        message: error.response?.data?.message || 'Erro ao cancelar pagamento',
      };
    }
  }
}

// Instância singleton do serviço
let blackCatInstance: BlackCatPaymentsService | null = null;

/**
 * Inicializa o serviço Black Cat Payments
 */
export const initializeBlackCat = (apiKey: string, environment: 'production' | 'sandbox' = 'production') => {
  blackCatInstance = new BlackCatPaymentsService({ apiKey, environment });
  return blackCatInstance;
};

/**
 * Obtém a instância do serviço Black Cat Payments
 */
export const getBlackCat = (): BlackCatPaymentsService => {
  if (!blackCatInstance) {
    // Tenta usar a chave de ambiente
    const apiKey = import.meta.env.VITE_BLACKCAT_API_KEY;
    if (!apiKey) {
      throw new Error('Black Cat Payments não foi inicializado. Configure VITE_BLACKCAT_API_KEY no arquivo .env');
    }
    const environment = (import.meta.env.VITE_BLACKCAT_ENV as 'production' | 'sandbox') || 'production';
    blackCatInstance = new BlackCatPaymentsService({ apiKey, environment });
  }
  return blackCatInstance;
};

export type {
  PaymentData,
  CreditCardData,
  PixData,
  BoletoData,
  PaymentResponse,
};
