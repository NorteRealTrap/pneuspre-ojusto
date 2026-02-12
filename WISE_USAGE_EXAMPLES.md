#!/usr/bin/env node

/**
 * =====================================================
 * MANUAL: Como usar a integração Wise
 * =====================================================
 * Exemplos práticos de código para implementar
 * Wise Send Money no seu projeto
 */

// =====================================================
// EXEMPLO 1: Usar WisePayoutService diretamente
// =====================================================

import { wisePayoutService } from '@/services/wiseService';

async function example1_directService() {
  try {
    // 1. Obter perfil
    const profileId = await wisePayoutService.getProfileId();
    console.log('Perfil:', profileId);

    // 2. Criar cotação
    const quote = await wisePayoutService.createQuote({
      profileId,
      sourceCurrency: 'BRL',
      targetCurrency: 'USD',
      sourceAmount: 1000,
    });
    console.log('Quote criada:', quote.id, 'Taxa:', quote.rate);

    // 3. Obter requisitos de recipient
    const recipientReqs = await wisePayoutService.validateRecipientRequirements(quote);
    console.log('Campos obrigatórios:', recipientReqs.map(r => r.key));

    // 4. Criar recipient
    const recipient = await wisePayoutService.createRecipient({
      profileId,
      currency: 'USD',
      type: 'iban',
      accountHolderName: 'John Doe',
      details: {
        IBAN: 'DE89370400440532013000',
      },
    });
    console.log('Recipient criado:', recipient.id);

    // 5. Descobrir requisitos de transfer
    const transferReqs = await wisePayoutService.getTransferRequirements({
      profileId,
      quoteId: quote.id,
      recipientId: recipient.id,
    });
    console.log('Requisitos de compliance:', transferReqs.map(r => r.key));

    // 6. Criar transfer
    const transfer = await wisePayoutService.createTransfer({
      profileId,
      quote,
      recipient,
      customerTransactionId: `tx-${Date.now()}`,
      transferPurpose: 'payment_for_services',
      sourceOfFunds: 'business_income',
    });
    console.log('Transfer criada:', transfer.id, 'Status:', transfer.status);

    // 7. Fundear transfer
    const funding = await wisePayoutService.fundTransfer({
      profileId,
      transferId: transfer.id,
      method: 'BALANCE',
    });
    console.log('Funding result:', funding);

    // 8. Monitorar status
    const status = await wisePayoutService.getTransferStatus(transfer.id);
    console.log('Status atual:', status.status);
  } catch (error) {
    console.error('Erro:', error);
  }
}

// =====================================================
// EXEMPLO 2: Usar Hooks em Componente React
// =====================================================

import { useWiseQuote, useWiseRecipient, useWiseTransfer } from '@/services/wise.utils';

function Example2_ReactComponent() {
  const quote = useWiseQuote();
  const recipient = useWiseRecipient();
  const transfer = useWiseTransfer();

  const handleQuote = async () => {
    const q = await quote.createQuote({
      profileId: 123,
      sourceCurrency: 'BRL',
      targetCurrency: 'USD',
      sourceAmount: 500,
    });
    console.log('Quote criada com hook:', q.id);
  };

  return (
    <div>
      <button onClick={handleQuote} disabled={quote.loading}>
        {quote.loading ? 'Carregando...' : 'Gerar Cotação'}
      </button>
      {quote.error && <p style={{ color: 'red' }}>{quote.error}</p>}
      {quote.quote && (
        <p>Taxa: {quote.quote.rate} | Expira em: {quote.quote.expiresAt}</p>
      )}
    </div>
  );
}

// =====================================================
// EXEMPLO 3: Processar Webhook
// =====================================================

// Backend (Express, por exemplo)
import express from 'express';

const app = express();
app.use(express.json());

app.post('/api/webhooks/wise', async (req, res) => {
  try {
    const payload = req.body;
    const signature = req.headers['x-signature-sha256'] as string;

    // Processar webhook
    await wisePayoutService.handleWebhook(payload, signature);

    // Responder 2xx rapidamente
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    // Responder 2xx de qualquer forma (Wise reconhecerá como entregue)
    res.status(202).json({ error: 'Será processado depois' });
  }
});

// =====================================================
// EXEMPLO 4: Roteador de Provider (Feature Flag)
// =====================================================

import { supabase } from '@/services/supabase';
import { PayoutProvider } from '@/types/index';
import { wisePayoutService } from '@/services/wiseService';

async function getPayoutProvider(options?: {
  currency?: string;
  amount?: number;
  userId?: string;
}): Promise<PayoutProvider> {
  // Buscar config de provider
  const { data } = await supabase
    .from('payout_provider_config')
    .select('*')
    .eq('enabled', true)
    .order('priority', { ascending: false });

  // Lógica de roteamento
  if (options?.currency === 'USD' && options?.amount && options.amount > 5000) {
    // Para transferências grandes em USD, preferir Wise
    return wisePayoutService;
  }

  if (options?.currency === 'BRL') {
    // Para BRL, manter Blackcat se disponível
    // return blackcatPayoutProvider;
  }

  // Default: Wise (você pode mudar a lógica)
  return wisePayoutService;
}

// Uso
const provider = await getPayoutProvider({ currency: 'USD', amount: 10000 });
const quote = await provider.createQuote({...});

// =====================================================
// EXEMPLO 5: Validar Requirements Dinamicamente
// =====================================================

import {
  validateRequirementsFilled,
  mapWiseError,
} from '@/services/wise.utils';

function validateAndCreateRecipient() {
  const requirements = [
    { key: 'IBAN', type: 'text', label: 'IBAN', required: true },
    { key: 'accountHolderName', type: 'text', label: 'Nome', required: true },
  ];

  const formData = {
    IBAN: 'DE89370400440532013000',
    accountHolderName: 'John Doe',
  };

  const { valid, missingFields } = validateRequirementsFilled(requirements, formData);

  if (!valid) {
    console.error('Campos faltando:', missingFields);
    return;
  }

  // Prosseguir com criação
  console.log('Todos os campos preenchidos ✅');
}

// =====================================================
// EXEMPLO 6: Tratamento de Erro Amigável
// =====================================================

import { mapWiseError } from '@/services/wise.utils';

async function transferComTratamentoDeErro() {
  try {
    const transfer = await wisePayoutService.createTransfer({...});
  } catch (error) {
    const friendlyMsg = mapWiseError(error);
    // friendlyMsg será algo como:
    // "Saldo insuficiente. Faça um aporte na sua conta Wise."
    // Em vez de erro técnico da API
    console.error('Erro amigável:', friendlyMsg);
    // Mostrar para usuário
  }
}

// =====================================================
// EXEMPLO 7: Monitorar Status com Polling
// =====================================================

import { useWiseTransferStatus, TRANSFER_STATUS_MAP } from '@/services/wise.utils';

function MonitorTransfer({ transferId }: { transferId: string }) {
  const { status, loading, checkStatus } = useWiseTransferStatus(transferId);

  if (!status) return <p>Aguardando status...</p>;

  const display = TRANSFER_STATUS_MAP[status];

  return (
    <div>
      <p>
        {display.icon} {display.label}
      </p>
      <button onClick={checkStatus} disabled={loading}>
        Atualizar
      </button>
    </div>
  );
}

// =====================================================
// EXEMPLO 8: Gerar customerTransactionId (Idempotência)
// =====================================================

import { generateCustomerTransactionId } from '@/services/wise.utils';

async function createTransferIdempotent(userId: string) {
  // Gerar ID único (idempotência)
  const customerTxId = generateCustomerTransactionId(`payout-${userId}`);
  // Resultado: "tx-1707645432123-abc123def"

  const transfer = await wisePayoutService.createTransfer({
    profileId: 123,
    quote: quoteData,
    recipient: recipientData,
    customerTransactionId: customerTxId, // ESSENCIAL
  });

  // Se houver timeout/retry, reusar o mesmo ID
  // Wise reconhecerá e retornará a transferência existente
  if (networkError) {
    const sameTransfer = await wisePayoutService.createTransfer({
      ...
      customerTransactionId: customerTxId, // reusar!
    });
    // sameTransfer.id === transfer.id (idempotente)
  }
}

// =====================================================
// EXEMPLO 9: Integrar em Checkout Existente
// =====================================================

// Seu fluxo de checkout atual (Blackcat)
async function currentCheckout(cartData) {
  // ...seu código de checkout
  const payment = await blackcatGateway.processarPagamento(...)
}

// Novo fluxo com Wise (payout para fornecedor, por exemplo)
async function newPayoutFlow(supplierId: string, amount: number) {
  const provider = await getPayoutProvider({
    currency: 'USD',
    amount,
  });

  if (provider.name === 'wise') {
    // Fluxo Wise
    const quote = await provider.createQuote({...});
    const recipient = await provider.createRecipient({...});
    const transfer = await provider.createTransfer({
      quote,
      recipient,
      customerTransactionId: `supplier-payout-${supplierId}`,
    });
    await provider.fundTransfer({...});
  } else {
    // Fallback para outro provider
  }
}

// =====================================================
// EXEMPLO 10: Testar no Sandbox
// =====================================================

async function testWiseSandbox() {
  console.log('🧪 Testando Wise Sandbox...');

  // Config: WISE_ENV=sandbox no .env.local

  try {
    // 1. Quote
    const quote = await wisePayoutService.createQuote({
      profileId: 123,
      sourceCurrency: 'BRL',
      targetCurrency: 'USD',
      sourceAmount: 100, // Valor pequeno para teste
    });
    console.log('✅ Quote criada:', quote.id);

    // 2. Requirements
    const reqs = await wisePayoutService.validateRecipientRequirements(quote);
    console.log('✅ Requirements:', reqs.map(r => r.key));

    // 3. Recipient
    const recipient = await wisePayoutService.createRecipient({
      profileId: 123,
      currency: 'USD',
      type: 'iban',
      accountHolderName: 'Test User',
      details: {
        IBAN: 'DE89370400440532013000', // IBAN de teste da Wise
      },
    });
    console.log('✅ Recipient criada:', recipient.id);

    // 4. Transfer
    const transfer = await wisePayoutService.createTransfer({
      profileId: 123,
      quote,
      recipient,
      customerTransactionId: `test-${Date.now()}`,
    });
    console.log('✅ Transfer criada:', transfer.id);

    // 5. Fund (sandbox permite sem saldo real)
    const funding = await wisePayoutService.fundTransfer({
      profileId: 123,
      transferId: transfer.id,
      method: 'BALANCE',
    });
    console.log('✅ Funding iniciado:', funding.status);

    // 6. Status
    const status = await wisePayoutService.getTransferStatus(transfer.id);
    console.log('✅ Status:', status.status);

    console.log('\n✅ Todos os testes passaram!');
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// =====================================================
// EXEMPLO 11: Configurar Webhook (manual no Painel Wise)
// =====================================================

/*
PASSO 1: Ir para https://wise.com/api-docs
PASSO 2: Settings → Webhooks
PASSO 3: Criar novo webhook com:
  - Name: "Meu Webhook"
  - URL: https://seu-app.com/api/webhooks/wise
  - Events: transfers#state-change
  - Salvar
PASSO 4: Copiar o webhook secret (gerado automaticamente)
PASSO 5: Configurar no .env.local:
  WISE_WEBHOOK_SECRET=seu_secret_aqui

PASSO 6: Testar clicando em "Send Test" no painel

No seu backend, o endpoint POST /api/webhooks/wise
receberá eventos como:
{
  "deliveryId": "webhook-...",
  "eventType": "transfers#state-change",
  "createdAt": "2026-02-11T10:00:00Z",
  "data": {
    "transferId": "12345",
    "status": "outgoing_payment_sent",
    ...
  }
}
*/

// =====================================================
// EXEMPLO 12: Deploy Gradual (Feature Flag)
// =====================================================

// No seu banco (payout_provider_config):
INSERT INTO payout_provider_config (name, provider, enabled, priority)
VALUES 
  ('wise_payout_v1', 'wise', FALSE, 5);  -- Desabilitado inicialmente

// Depois de testar:
UPDATE payout_provider_config
SET enabled = TRUE, priority = 10
WHERE name = 'wise_payout_v1';

// Para rollout gradual:
// - Fase 1: enable para admin only
// - Fase 2: enable para 10% das requests (roteador condicional)
// - Fase 3: enable para 50%
// - Fase 4: enable para todos

// =====================================================
// Exportar para testes
// =====================================================

export {
  example1_directService,
  Example2_ReactComponent,
  getPayoutProvider,
  validateAndCreateRecipient,
  transferComTratamentoDeErro,
  MonitorTransfer,
  createTransferIdempotent,
  newPayoutFlow,
  testWiseSandbox,
};
