import { buildApiUrl } from './apiBase';
import { authService } from './supabase';

export interface ClientePagamento {
  nome: string;
  email: string;
  telefone: string;
  cpf?: string;
}

export interface EnderecoEntrega {
  rua: string;
  numero: string;
  complemento?: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface DadosCartao {
  numero: string;
  nomeCartao: string;
  mes: string;
  ano: string;
  cvv: string;
}

export interface DadosPagamento {
  valor: number;
  descricao: string;
  cliente: ClientePagamento;
  endereco: EnderecoEntrega;
  cartao: DadosCartao;
  parcelas?: number;
}

export interface RespostaPagamento {
  sucesso: boolean;
  transactionId: string;
  mensagem: string;
  codigo?: string;
  status: 'aprovado' | 'pendente' | 'rejeitado' | 'erro';
  tempo_processamento?: number;
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

const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit, timeoutMs = 20000) => {
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

class BlackcatGateway {
  async validarEndereco(endereco: EnderecoEntrega): Promise<boolean> {
    const token = await ensureSessionToken();

    const response = await fetchWithTimeout(buildApiUrl('/blackcat/address/validate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(endereco),
    });

    if (!response.ok) {
      const message = await parseApiError(response, `Erro ao validar endereco (HTTP ${response.status})`);
      throw new Error(message);
    }

    const payload = (await response.json()) as { valido?: boolean };
    return payload.valido === true;
  }

  async processarPagamento(dados: DadosPagamento): Promise<RespostaPagamento> {
    try {
      const enderecoValido = await this.validarEndereco(dados.endereco);
      if (!enderecoValido) {
        return {
          sucesso: false,
          transactionId: '',
          mensagem: 'Endereco invalido. Verifique os dados informados.',
          status: 'rejeitado',
        };
      }

      const token = await ensureSessionToken();
      const response = await fetchWithTimeout(buildApiUrl('/blackcat/payment/process'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dados),
      });

      if (!response.ok) {
        const message = await parseApiError(
          response,
          `Erro ao processar pagamento (HTTP ${response.status})`
        );
        throw new Error(message);
      }

      return response.json();
    } catch (erro) {
      return {
        sucesso: false,
        transactionId: '',
        mensagem: erro instanceof Error ? erro.message : 'Erro ao processar pagamento',
        status: 'erro',
      };
    }
  }

  async reembolsar(transactionId: string, valor?: number): Promise<RespostaPagamento> {
    try {
      const token = await ensureSessionToken();
      const response = await fetchWithTimeout(buildApiUrl('/blackcat/payment/refund'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ transactionId, valor }),
      });

      if (!response.ok) {
        const message = await parseApiError(
          response,
          `Erro ao reembolsar pagamento (HTTP ${response.status})`
        );
        throw new Error(message);
      }

      return response.json();
    } catch (erro) {
      return {
        sucesso: false,
        transactionId,
        mensagem: erro instanceof Error ? erro.message : 'Erro ao reembolsar',
        status: 'erro',
      };
    }
  }

  async consultarTransacao(transactionId: string): Promise<any> {
    const token = await ensureSessionToken();
    const response = await fetchWithTimeout(buildApiUrl('/blackcat/payment/status'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ transactionId }),
    });

    if (!response.ok) {
      const message = await parseApiError(
        response,
        `Erro ao consultar transacao (HTTP ${response.status})`
      );
      throw new Error(message);
    }

    return response.json();
  }
}

export const blackcatGateway = new BlackcatGateway();

export async function processarPagamento(dados: DadosPagamento): Promise<RespostaPagamento> {
  return blackcatGateway.processarPagamento(dados);
}

export async function validarEndereco(endereco: EnderecoEntrega): Promise<boolean> {
  return blackcatGateway.validarEndereco(endereco);
}

export async function reembolsarPagamento(transactionId: string, valor?: number): Promise<RespostaPagamento> {
  return blackcatGateway.reembolsar(transactionId, valor);
}

export async function consultarTransacao(transactionId: string): Promise<any> {
  return blackcatGateway.consultarTransacao(transactionId);
}

export function formatarValor(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

export function validarCartao(numero: string): boolean {
  const limpo = numero.replace(/\D/g, '');
  if (limpo.length < 13 || limpo.length > 19) return false;

  let soma = 0;
  let multiplicador = 2;

  for (let i = limpo.length - 2; i >= 0; i -= 1) {
    let resultado = parseInt(limpo.charAt(i), 10) * multiplicador;
    if (resultado > 9) {
      resultado -= 9;
    }
    soma += resultado;
    multiplicador = multiplicador === 2 ? 1 : 2;
  }

  const resultado = (Math.ceil(soma / 10) * 10) - soma;
  return resultado === parseInt(limpo.charAt(limpo.length - 1), 10);
}

export function validarValidadeCartao(mes: string, ano: string): boolean {
  const mesNum = parseInt(mes, 10);
  const anoNum = parseInt(`20${ano}`, 10);

  if (mesNum < 1 || mesNum > 12) return false;

  const dataAtual = new Date();
  const anoAtual = dataAtual.getFullYear();
  const mesAtual = dataAtual.getMonth() + 1;

  if (anoNum < anoAtual) return false;
  if (anoNum === anoAtual && mesNum < mesAtual) return false;

  return true;
}

export function mascararCartao(numero: string): string {
  const limpo = numero.replace(/\D/g, '');
  const ultimos = limpo.slice(-4);
  return `****-****-****-${ultimos}`;
}
