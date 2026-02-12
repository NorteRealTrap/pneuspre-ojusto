/**
 * =====================================================
 * WISE PAYOUT UTILITIES
 * =====================================================
 * Helpers de utilitarios para integracao Wise
 */

import { RecipientRequirement, TransferRequirement } from '../types/index';

/**
 * Utility: Formatar valor com cambio
 */
export function formatWiseAmount(
  amount: number,
  currency: string,
  rate?: number,
  targetCurrency?: string
): string {
  const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  });

  let formatted = formatter.format(amount);

  if (rate && targetCurrency) {
    const targetAmount = amount * rate;
    const targetFormatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: targetCurrency,
      minimumFractionDigits: 2,
    });
    formatted += ` = ${targetFormatter.format(targetAmount)}`;
  }

  return formatted;
}

/**
 * Utility: Gerar customerTransactionId unico (idempotencia)
 */
export function generateCustomerTransactionId(prefix = 'tx'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Utility: Validar requisitos preenchidos
 */
export function validateRequirementsFilled(
  requirements: RecipientRequirement[] | TransferRequirement[],
  formData: Record<string, any>
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  for (const req of requirements) {
    if (req.required && !formData[req.key]) {
      missingFields.push(req.key);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Utility: Mapear erro Wise para mensagem amigavel
 */
export function mapWiseError(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message;

  const errorMap: Record<string, string> = {
    'insufficient funds': 'Saldo insuficiente. Faca um aporte na sua conta Wise.',
    'quote expired': 'A cotacao expirou. Por favor, gere uma nova cotacao.',
    'requirements not met': 'Campos obrigatorios faltando. Preencha todos os requisitos.',
    'invalid recipient': 'Dados do beneficiario invalidos.',
    'transfer cancelled': 'Transferencia foi cancelada.',
    'recipient verification': 'Beneficiario requer verificacao adicional.',
  };

  for (const [key, friendlyMsg] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(key)) {
      return friendlyMsg;
    }
  }

  return `Erro na integracao Wise: ${message}`;
}

/**
 * Utility: Estados de transferencia mapeados para UI
 */
export const TRANSFER_STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  draft: { label: 'Rascunho', color: 'gray', icon: '\ud83d\udcc4' },
  pending_approval: { label: 'Aguardando Aprovacao', color: 'yellow', icon: '\u23f3' },
  active: { label: 'Ativa', color: 'blue', icon: '\u2705' },
  processing: { label: 'Processando', color: 'blue', icon: '\u2699\ufe0f' },
  outgoing_payment_sent: { label: 'Pagamento Enviado', color: 'green', icon: '\u2705' },
  funds_returned: { label: 'Fundos Retornados', color: 'red', icon: '\u274c' },
  cancelled: { label: 'Cancelada', color: 'red', icon: '\u274c' },
};

export function getTransferStatusDisplay(status: string | null) {
  return TRANSFER_STATUS_MAP[status || ''] || { label: 'Desconhecido', color: 'gray', icon: '\u2753' };
}
