# ❓ Wise Payout Integration - FAQ & Troubleshooting

---

## 🔧 Problemas & Soluções

### "Erro: WISE_CLIENT_ID ou WISE_CLIENT_SECRET não encontrados"

**Causa**: Variáveis não configuradas no `.env.local`

**Solução**:
1. Copiar `.env.wise.example` → `.env.local`:
   ```bash
   cp .env.wise.example .env.local
   ```
2. Preencher com valores reais:
   ```env
   WISE_CLIENT_ID=seu_client_id_aqui
   WISE_CLIENT_SECRET=seu_client_secret_aqui
   ```
3. Restart server
4. Verificar: `console.log(process.env.WISE_CLIENT_ID)` (apenas development!)

---

### "Erro ao obter token Wise: 401"

**Causa**: Credenciais inválidas ou expiradas

**Solução**:
1. Verificar `WISE_CLIENT_ID` e `WISE_CLIENT_SECRET` em `.env.local`
2. Ir para https://wise.com/ → Settings → Developers
3. Verificar que app ainda existe e não foi deletada
4. Copiar novos Client ID/Secret se necessário
5. Deletar cache local:
   ```typescript
   // Em wiseService.ts, limpar tokenCache
   wisePayoutService.tokenCache = null;
   ```

---

### "Erro: Nenhum profile encontrado na conta Wise"

**Causa**: Conta Wise não tem perfil ou está incompleta

**Solução**:
1. Ir para https://wise.com/ → Account Settings
2. Completar setup (KYC, verificação)
3. Ir para "Profile" ou "My Account" → verificar que há pelo menos 1 perfil
4. Se necessário, criar novo perfil:
   - Personal: para conta pessoal
   - Business: para negó

cio

---

### "Erro: Quote expirou"

**Causa**: Quote tem validade (5-10 min), foi criada muito tempo atrás

**Solução**:
1. No código, guardar `expiresAt`:
   ```typescript
   const quote = await wisePayoutService.createQuote(...);
   const isExpired = new Date(quote.expiresAt) < new Date();
   if (isExpired) {
     // Gerar nova quote
   }
   ```
2. Implementar timer no componente:
   ```typescript
   if (quote.isExpired) {
     showMessage("Cotação expirou, gerando nova...");
     await handleCreateQuote(); // regene
   }
   ```

---

### "Erro: Requisitos dinâmicos não aparecem (fieldss faltando ou vazios)"

**Causa**: Endpoint de requirements não retornando dados esperados

**Solução**:
1. Verificar quote está válida e não expirada
2. Adicionar header `Accept-Minor-Version: 1` (já implementado)
3. Log de resposta:
   ```typescript
   const reqs = await wisePayoutService.validateRecipientRequirements(quote);
   console.log('Requirements:', JSON.stringify(reqs, null, 2));
   ```
4. Se ainda vazio, contata Wise support com quote ID

---

### "Erro: Recipient criado mas não consegue usar em Transfer"

**Causa**: Recipient em estado de verificação (confirmations_required = true)

**Solução**:
1. Verificar status do recipient:
   ```sql
   SELECT confirmation_status FROM wise_recipients WHERE id = ...;
   ```
2. Se `pending`, esperar verificação (pode ser automático ou requerer ação)
3. No código, adicionar check:
   ```typescript
   if (recipient.confirmations_required) {
     showMessage("Beneficiário requer verificação adicional");
   }
   ```

---

### "Erro: Transfer não consegue passar em getTransferRequirements"

**Causa**: Campos obrigatórios faltando ou inválidos

**Solução**:
1. Log completo de requirements:
   ```typescript
   const reqs = await getTransferRequirements({...});
   console.log('Transfer Reqs:', reqs);
   // Verificar campos com required: true
   ```
2. Preencher TODOS os required fields:
   ```typescript
   const transferReqs = [
     { key: 'transferPurpose', required: true },
     { key: 'sourceOfFunds', required: true },
   ];
   
   const filled = {
     transferPurpose: 'payment_for_services',
     sourceOfFunds: 'business_income',
   };
   ```
3. Validar com `validateRequirementsFilled()`:
   ```typescript
   const { valid, missingFields } = validateRequirementsFilled(reqs, filled);
   if (!valid) {
     console.error('Missing:', missingFields);
   }
   ```

---

### "Erro: Fund Transfer com 'insufficient funds'"

**Causa**: Saldo não suficiente na conta Wise (method = 'BALANCE')

**Solução**:
1. Verificar saldo:
   ```typescript
   const balances = await wisePayoutService.checkBalance(profileId);
   console.log('Balances:', balances);
   ```
2. Se saldo insuficiente, fazer aporte:
   - Ir para https://wise.com/ → fazer aporte (card, transfer, etc.)
   - Ou usar método de funding diferente:
     ```typescript
     await fundTransfer({ method: 'CARD' }); // em vez de BALANCE
     ```
3. Retentar depois de aporte

---

### "Webhook não chegando / não processado"

**Causa**: URL webhook não acessível, ou assinatura inválida

**Solução**:

#### A) Verificar URL:
1. Testar manualmente:
   ```bash
   curl -X POST http://seu-webhook-url
   ```
   Deve responder com 200/202 (não 404 ou erro)

2. Se localhost, usar ngrok:
   ```bash
   ngrok http 3000
   # URL: https://abc123.ngrok.io
   ```

3. Atualizar URL na Wise Dashboard (Webhooks)

#### B) Verificar assinatura:
```typescript
const isValid = wisePayoutService.validateWebhookSignature(
  JSON.stringify(payload),
  req.headers['x-signature-sha256']
);
console.log('Signature valid:', isValid);
```

Se `false`, verificar que `WISE_WEBHOOK_SECRET` é exato

#### C) Verificar logs:
- Supabase: `SELECT * FROM webhook_events WHERE processed_at IS NULL;`
- Se há eventos mas não processados, há erro no handler
- Ver `processing_error` na coluna

---

### "Idempotência não funciona (transferências duplicam)"

**Causa**: `customerTransactionId` não está sendo reutilizado

**Solução**:
1. Sempre gerar mesmo ID para mesma operação:
   ```typescript
   const customerId = `payout-${userId}-${paymentId}`;
   // Reusar para retries
   ```

2. Salvar ID no banco antes de criar transfer:
   ```sql
   INSERT INTO transfers_log (customer_transaction_id, ...)
   VALUES (customerId, ...);
   ```

3. Antes de retentar, verificar se já existe:
   ```typescript
   const existing = await db.query(
     'SELECT * FROM wise_transfers WHERE customer_transaction_id = ?',
     [customerId]
   );
   if (existing) return existing; // reusar
   ```

---

### "Status da transfer não atualiza (webhook recebido mas status fechado)"

**Causa**: Webhook recebido mas BD não foi atualizado

**Solução**:
1. Verificar que webhook foi persistido:
   ```sql
   SELECT * FROM webhook_events WHERE event_type = 'transfers#state-change'
   ORDER BY created_at DESC LIMIT 5;
   ```

2. Verificar que `wise_transfers` foi atualizado:
   ```sql
   SELECT status, updated_at FROM wise_transfers
   WHERE wise_transfer_id = 'seu-transfer-id';
   ```

3. Se webhook persistido mas transfer não atualizada:
   - Há erro no handler
   - Log em `processing_error` na hook_events
   - Processar manualmente com polling:
     ```typescript
     const status = await wisePayoutService.getTransferStatus(transferId);
     // Atualizar BD manualmente
     ```

---

### "Erro: 'mTLS certificate not found'"

**Causa**: Usando embedded payouts (produção) sem certificado

**Solução**:
1. Se estiver em sandbox, não precisa de mTLS
2. Se produção com mTLS:
   - Obter cert/key da Wise
   - Salvar em paths seguro (não no git):
     ```
     /etc/wise/client-cert.pem
     /etc/wise/client-key.pem
     ```
   - Configurar env vars:
     ```env
     WISE_MTLS_CERT_PATH=/etc/wise/client-cert.pem
     WISE_MTLS_KEY_PATH=/etc/wise/client-key.pem
     ```

---

### "Erro: RLS policy bloqueando acesso ao BD"

**Causa**: Usuário não tem permissão para ver seus próprios dados

**Solução**:
1. Verificar que RLS foi criada corretamente (migration executada):
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'wise_transfers';
   ```

2. Verificar que `auth.uid()` está disponível:
   ```typescript
   // No backend, garantir que session.user.id existe
   const userId = (await authService.getSession()).user?.id;
   ```

3. Adicionar coluna `usuario_id` se faltar:
   ```sql
   ALTER TABLE wise_transfers ADD COLUMN usuario_id UUID REFERENCES auth.users(id);
   UPDATE wise_transfers SET usuario_id = auth.uid() WHERE usuario_id IS NULL;
   ```

---

### "Performance lenta - requisições demoram muito"

**Causa**: Timeouts, rede lenta, ou muitas chamadas

**Solução**:
1. Aumentar timeout (default 30s):
   ```env
   WISE_REQUEST_TIMEOUT_MS=60000
   ```

2. Implementar cache para quotes/recipients:
   ```typescript
   const quoteCache = new Map();
   quoteCache.set(quoteId, quote);
   if (quoteCache.has(quoteId)) return quoteCache.get(quoteId);
   ```

3. Reduzir polling frequency:
   ```typescript
   // De 10s para 30s
   setInterval(checkStatus, 30000);
   ```

4. Implementar batching para múltiplas transfers

---

### "Erro: authService não funciona / sessão expirada"

**Causa**: Token expirado ou não autenticado

**Solução**:
1. Guardar que wiseService está dentro de componente autenticado:
   ```typescript
   import { useAuth } from '@/hooks/useAuth';
   
   function WiseForm() {
     const { user, session } = useAuth();
     if (!user) return <Redirect to="/login" />;
     // ...
   }
   ```

2. Refresh token antes de usar:
   ```typescript
   const session = await authService.getSession();
   if (!session?.access_token) {
     await authService.refreshSession();
   }
   ```

3. Tratamento de erro 401:
   ```typescript
   try {
     await wisePayoutService.createQuote(...);
   } catch (e) {
     if (e.message.includes('401') || e.message.includes('session')) {
       redirectTo('/login');
     }
   }
   ```

---

## ❓ FAQs

### P: Posso usar Wise para receber pagamento de clientes (pay-in)?
**R**: Não recomendado. Wise é otimizado para payout (enviar dinheiro). Para pay-in, usar Blackcat ou Stripe.

### P: Qual moeda trabalha melhor com Wise?
**R**: USD, EUR, GBP são suportados globalmente. BRL tem requisitos adicionais (transferNature que impacta IOF).

### P: Preciso de mTLS mesmo em sandbox?
**R**: Não, mas requer em produção se usar embedded payouts. Teste em sandbox primeiro sem mTLS.

### P: Quanto tempo leva de quote até funds_returned?
**R**: Tipicamente 5-30 minutos, depende de rota (SWIFT leva mais, SEPA é rápido).

### P: Wise fornece callback/webhook automático?
**R**: Sim! Via webhook (transfers#state-change). Sem webhook precisar de polling.

### P: Como saber se transfer foi bem-sucedida?
**R**: Via webhook ou polling. Estados finais: `outgoing_payment_sent` (sucesso) ou `funds_returned` (bounce).

### P: Posso cancelar uma transfer?
**R**: Sim, se status ainda é `draft` ou `pending_approval`. Depois que em `processing`, não.

### P: Wise fornece relatório/reconciliação?
**R**: Sim, via API (/transfers history) e dashboard. Recomenda usar webhooks para bater contas.

### P: Preciso guardar token de client credentials?
**R**: NÃO! Gerar a cada requisição (ou cache curto ~1h). Usar via header Authorization Bearer.

### P: Como lidar com múltiplas moedas?
**R**: Criar quote para cada par (BRL→USD, USD→EUR, etc). API detecta automaticamente requisitos.

---

## 📞 Suporte Escalation

Se problema persiste após investigação:

1. **Verificar Logs**:
   ```sql
   SELECT * FROM webhook_events WHERE created_at > NOW() - '1 hour'::interval;
   SELECT * FROM wise_transfers WHERE created_at > NOW() - '1 hour'::interval;
   ```

2. **Wise Support**: support@wise.com
   - Envidar: Quote ID, Transfer ID, timestamp do erro
   - Wise consegue investigar no servidor deles

3. **Seu Time**:
   - Documentar o erro completo
   - Envidar: logs, payloads, steps para reproduzir

---

## 📝 Logs Estruturados (Recomendado)

Para melhor troubleshooting, implementar logs estruturados:

```typescript
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  service: 'wise',
  action: 'createQuote',
  quoteId: '...',
  sourceCurrency: 'BRL',
  targetCurrency: 'USD',
  sourceAmount: 1000,
  status: 'success',
  duration_ms: 234,
}));
```

Assim é fácil buscar e analisar depois.

---

**Última atualização**: 11 de fevereiro de 2026

