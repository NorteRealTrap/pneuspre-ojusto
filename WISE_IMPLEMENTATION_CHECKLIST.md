# ✅ Checklist de Implementação - Wise Payout

**Data Início**: 11 de fevereiro de 2026  
**Objetivo**: Integrar Wise Send Money API como provedor de payout

---

## 📋 FASE 1: Preparação & Configuração (30 min)

### 1.1 Clonar/Atualizar o Código
- [ ] `git pull` para sincronizar com as mudanças
- [ ] Verificar que os seguintes arquivos foram criados:
  - [ ] `src/types/index.ts` (tipos adicionados)
  - [ ] `src/services/wiseService.ts` (novo)
  - [ ] `src/services/wise.utils.ts` (novo)
  - [ ] `src/app/components/WisePayoutForm.example.tsx` (novo)
  - [ ] `supabase/migrations/20260211_wise_payout_integration.sql` (novo)
  - [ ] `WISE_INTEGRATION.md` (doc)
  - [ ] `WISE_IMPLEMENTATION_SUMMARY.md` (doc)
  - [ ] `WISE_USAGE_EXAMPLES.md` (exemplos)
  - [ ] `.env.wise.example` (config template)

### 1.2 Criar Conta Wise (se não tiver)
- [ ] Ir para https://wise.com/
- [ ] Criar conta (ou usar existente)
- [ ] Completar verificação (KYC básico)
- [ ] Acessar Settings → Profile

### 1.3 Gerar Credenciais Sandbox
- [ ] Ir para Settings → **Developers** (não Security!)
- [ ] Clicar em **Create Application**
- [ ] Preencher nome: `pneusloja-sandbox-app`
- [ ] Selecionar tipo: **Platform**
- [ ] Clicar em **Create**
- [ ] Copiar: **Client ID** e **Client Secret**
- [ ] Guardar em local seguro (1password, bitwarden, etc.)

### 1.4 Configurar Variáveis de Ambiente
- [ ] Copiar `.env.wise.example` → `.env.local` (ou adicionar ao `.env` existente)
- [ ] Preencher:
  ```env
  WISE_ENV=sandbox
  WISE_BASE_URL=https://api.wise-sandbox.com
  WISE_CLIENT_ID=seu_client_id_sandbox
  WISE_CLIENT_SECRET=seu_client_secret_sandbox
  WISE_WEBHOOK_SECRET=temp_value_for_now
  ```
- [ ] Verificar que arquivo não está no git (`.env.local` em `.gitignore`)

### 1.5 Executar Migrations (Banco de Dados)
#### Via Supabase Dashboard:
- [ ] Ir para Supabase → Project → SQL Editor
- [ ] Criar nova query
- [ ] Copiar conteúdo de `supabase/migrations/20260211_wise_payout_integration.sql`
- [ ] Executar (clicar play)
- [ ] Verificar que tabelas foram criadas:
  ```sql
  SELECT tablename FROM pg_tables WHERE schemaname='public';
  ```
  Deve listar: `wise_recipients`, `wise_quotes`, `wise_transfers`, `webhook_events`, `payout_provider_config`

#### Via Supabase CLI (alternativa):
```bash
supabase db push
```

---

## 🧪 FASE 2: Testes Básicos (1 hora)

### 2.1 Teste de Conectividade
- [ ] Criar arquivo `test-wise.ts` temporário
- [ ] Copiar código de `WISE_USAGE_EXAMPLES.md` → Exemplo 1
- [ ] Executar:
  ```bash
  npx ts-node test-wise.ts
  ```
- [ ] Verificar que consegue:
  - [ ] ✅ Obter `profileId`
  - [ ] ✅ Criar cotação (quote)
  - [ ] ✅ Listar requisitos de recipient
  - [ ] ✅ Criar recipient
  - [ ] ✅ etc.
- [ ] Deletar arquivo `test-wise.ts` depois

### 2.2 Teste de Quote (Cotação)
- [ ] Testar criar quote com diferentes moedas:
  - [ ] BRL → USD
  - [ ] BRL → EUR
  - [ ] USD → BRL
- [ ] Verificar resposta contém:
  - [ ] `id` (quoteId)
  - [ ] `rate` (taxa de câmbio)
  - [ ] `fee` (taxa de transação)
  - [ ] `expiresAt` (data de expiração)
- [ ] Verificar que `expiresAt` é no futuro (5-10 minutos)

### 2.3 Teste de Recipient
- [ ] Obter requisitos da quote anterior
- [ ] Verificar que retorna lista de campos (ex: IBAN, accountHolderName)
- [ ] Criar recipient com dados de teste:
  ```
  type: "iban"
  currency: "USD"
  accountHolderName: "Test User"
  details: {
    IBAN: "DE89370400440532013000"
  }
  ```
- [ ] Verificar que retorna `recipientId` válido

### 2.4 Teste de Transfer
- [ ] Descobrir requisitos de transfer (compliance)
- [ ] Criar transfer com dados anteriores
- [ ] Verificar que retorna:
  - [ ] `transferId`
  - [ ] `status` (deve ser `draft` ou similar)
  - [ ] Persistido no banco (ver tabela `wise_transfers`)

### 2.5 Teste de Idempotência
- [ ] Reusar mesmo `customerTransactionId`
- [ ] Tentar criar transfer novamente
- [ ] Verificar que retorna mesma transferência (não duplica)

### 2.6 Teste de Erro (Graceful)
- [ ] Testar quote com moeda inválida → deve retornar erro
- [ ] Testar recipient com dados inválidos → erro
- [ ] Verificar que erros são capturados e mapeados amigavelmente

---

## 🎨 FASE 3: Integração em Componente React (2 horas)

### 3.1 Copiar Componente Exemplo
- [ ] Copiar `src/app/components/WisePayoutForm.example.tsx`
- [ ] Renomear para `src/app/components/WisePayoutForm.tsx`
- [ ] Atualizar imports no seu projeto

### 3.2 Customizar para Seu Caso
- [ ] Ajustar moedas disponíveis (seu negócio específico)
- [ ] Adicionar/remover campos de formulário
- [ ] Customizar validações
- [ ] Integrar com seu design system (Tailwind, Material, etc.)
- [ ] Adicionar seus próprios estilos CSS

### 3.3 Testar Componente Isolado
- [ ] Montar componente em página de teste
- [ ] Testar fluxo completo (4 steps):
  - [ ] Step 1: Quote (obter cotação)
  - [ ] Step 2: Recipient (beneficiário)
  - [ ] Step 3: Transfer details (compliance)
  - [ ] Step 4: Confirm & send (enviar)
- [ ] Verificar que UI está clara / responsiva
- [ ] Testar errors (mostrar mensagens amigáveis)

### 3.4 Integrar com Seu Fluxo
- [ ] Decidir onde colocar o componente
  - [ ] Página de payout novo?
  - [ ] Modal no checkout?
  - [ ] Abinha?
- [ ] Passar `userId` como prop
- [ ] Conectar callback `onPayoutComplete`
- [ ] Testar navegação pós-sucesso

---

## 🔌 FASE 4: Backend Endpoints (3 horas)

### 4.1 Criar POST `/api/wise/quotes`
```typescript
POST /api/wise/quotes
Body: { id, profileId, sourceCurrency, ... }
Response: { success: true }
```
- [ ] Persistir em `wise_quotes` table
- [ ] Verificar autenticação (auth.uid())
- [ ] Validar dados antes de inserir

### 4.2 Criar POST `/api/wise/recipients`
```typescript
POST /api/wise/recipients
Body: { wise_recipient_id, currency, ... }
Response: { success: true }
```
- [ ] Persistir em `wise_recipients` table
- [ ] Computar hash (detectar duplicatas)
- [ ] Validar campos obrigatórios

### 4.3 Criar POST `/api/wise/transfers`
```typescript
POST /api/wise/transfers
Body: { wise_transfer_id, wise_quote_id, ... }
Response: { success: true }
```
- [ ] Persistir em `wise_transfers` table
- [ ] Garantir UNIQUE em `customer_transaction_id` (idempotência)
- [ ] Validar relacionamentos (quote existe? recipient existe?)

### 4.4 Criar PATCH `/api/wise/transfers/{id}`
```typescript
PATCH /api/wise/transfers/{id}
Body: { status }
Response: { success: true, transfer }
```
- [ ] Atualizar status da transfer
- [ ] Log de mudanças
- [ ] Apenas usuário dono pode atualizar (RLS)

### 4.5 Criar POST `/api/webhooks/wise` (Handler)
```typescript
POST /api/webhooks/wise (sem autenticação!)
Headers: X-Signature-SHA256: ...
Body: { deliveryId, eventType, data, ... }
Response: { received: true }
```
- [ ] **IMPORTANTE**: Responder 2xx em <5 segundos
- [ ] Validar assinatura: `wisePayoutService.validateWebhookSignature(...)`
- [ ] Persistir em `webhook_events`
- [ ] Processar assincronamente (queue, job, etc.)
- [ ] Se `transfers#state-change`: atualizar `wise_transfers.status`

### 4.6 Criar POST `/api/wise/webhook-events` (persistência)
```typescript
POST /api/wise/webhook-events
Body: { deliveryId, eventType, payload, ... }
Response: { success: true }
```
- [ ] Persistir em `webhook_events`
- [ ] Atualizar `processed_at` quando processado

### 4.7 Testes de Endpoint
- [ ] Testar `POST /quotes` → dados salvos
- [ ] Testar `POST /recipients` → hash evita duplicatas
- [ ] Testar `POST /transfers` → idempotência funciona
- [ ] Testar `PATCH /transfers/{id}` → RLS protege dados
- [ ] Testar `POST /webhooks/wise` → processa webhook

---

## 🔔 FASE 5: Webhooks (1-2 horas)

### 5.1 Registrar Webhook na Wise
- [ ] Ir para https://wise.com/
- [ ] Settings → **Webhooks** (procurar aba de api/desenvolvimento)
- [ ] Clicar **+ New Webhook**
- [ ] Preencher:
  - [ ] **Name**: `pneusloja-sandbox` (ou seu nome)
  - [ ] **URL**: `http://localhost:3000/api/webhooks/wise` (ou seu ngrok)
  - [ ] **Events**: Selecionar **transfers#state-change**
- [ ] Clicar **Create**
- [ ] Copiar **Webhook Secret** (gerado automaticamente)
- [ ] Atualizar `.env.local`:
  ```env
  WISE_WEBHOOK_SECRET=seu_secret_aqui
  ```

### 5.2 Testar Webhook Localmente
#### Com ngrok (para Wise alcançar localhost):
- [ ] Instalar: `npm install -g ngrok`
- [ ] Rodando seu servidor em `:3000`
- [ ] Em outro terminal:
  ```bash
  ngrok http 3000
  ```
- [ ] Copiar URL gerada (ex: `https://abc123.ngrok.io`)
- [ ] Atualizar Webhook URL na Wise (URL pública)

#### Testar Send:
- [ ] Na dashboard Wise, no Webhook criado
- [ ] Clicar **Send Test**
- [ ] Verificar que seu servidor recebeu:
  - [ ] POST em `/api/webhooks/wise`
  - [ ] Headers com `x-signature-sha256`
  - [ ] Body com payload

### 5.3 Verificar Persistência
- [ ] Ir ao Supabase Dashboard
- [ ] Tabela `webhook_events`
- [ ] Verificar que evento foi persistido:
  ```sql
  SELECT * FROM webhook_events 
  ORDER BY created_at DESC 
  LIMIT 1;
  ```

### 5.4 Testar State-Change Real
- [ ] Criar transfer real (não apenas draft)
- [ ] Fundear transfer
- [ ] Observar webhook sendo recebido
- [ ] Verificar que `wise_transfers.status` foi atualizado
- [ ] Verificar que UI reflete mudança (polling + webhook)

---

## 🎯 FASE 6: Feature Flag & Roteamento (1 hora)

### 6.1 Implementar Roteador de Provider
- [ ] Criar função `getPayoutProvider()`:
  ```typescript
  async function getPayoutProvider(opts?: {
    currency?: string;
    amount?: number;
  }): Promise<PayoutProvider> {
    // Lógica de roteamento
  }
  ```
- [ ] Buscar config em `payout_provider_config`
- [ ] Implementar lógica (ex: USD → Wise, BRL → Blackcat)

### 6.2 Ativar Feature Flag
- [ ] No banco, inserir:
  ```sql
  UPDATE payout_provider_config
  SET enabled = TRUE
  WHERE name = 'wise_payout'
  ```
- [ ] OU via Supabase Dashboard:
  - [ ] Tabela `payout_provider_config`
  - [ ] Row `wise_payout`
  - [ ] Editar `enabled` = `true`

### 6.3 Teste de Fallback
- [ ] Desativar Wise temporariamente (`enabled = false`)
- [ ] Tentar criar payout → deve usar provider alternativo
- [ ] Reativar Wise
- [ ] Testar fluxo normal novamente

### 6.4 Monitoramento
- [ ] Setup de logs de qual provider foi usado
- [ ] Métricas: sucesso rate, latência, erros
- [ ] Dashboard (ou simplesmente logs)

---

## 📊 FASE 7: Testes End-to-End (2-3 horas)

### 7.1 Cenário: Transfer BRL → USD (Completo)
- [ ] [ ] User acessa form
- [ ] [ ] Seleciona: BRL → USD, valor 100
- [ ] [ ] Clica "Gerar Cotação" → quote criada ✅
- [ ] [ ] Carrega requisitos beneficiário
- [ ] [ ] Preenche IBAN (testado)
- [ ] [ ] Clica "Próximo" → recipient criado ✅
- [ ] [ ] Carrega requisitos de transfer
- [ ] [ ] Preenche compliance (transferPurpose, etc)
- [ ] [ ] Clica "Próximo" → transfer criada ✅
- [ ] [ ] Review dados
- [ ] [ ] Clica "Enviar" → funding iniciado ✅
- [ ] [ ] Status muda para "processing" (webhook recebido) ✅
- [ ] [ ] User vê "Enviado com sucesso!" ✅

### 7.2 Cenário: Erro - Quote Expirada
- [ ] Criar quote
- [ ] Esperar >10min (ou simular no código)
- [ ] Tentar criar recipient
- [ ] Verificar que erro é capturado e mensagem amigável é mostrada ✅

### 7.3 Cenário: Erro - Destinatário Inválido
- [ ] Preencher IBAN inválido
- [ ] Tentar criar recipient
- [ ] Verificar erro é capturado ✅

### 7.4 Cenário: Idempotência
- [ ] Criar transfer A com customerTransactionId = "tx-123"
- [ ] Network falha antes de receber resposta
- [ ] Retry: criar transfer novamente com mesmo customerTransactionId
- [ ] Verificar que retorna mesma transfer (não duplicada) ✅

### 7.5 Teste de Carga Leve
- [ ] Executar 5-10 transfers em sequência
- [ ] Verificar sucesso rate ~100%
- [ ] Verificar tempo médio por step
- [ ] Observar logs (sem erros)

---

## 🚀 FASE 8: Deploy para Produção (2-3 horas)

### 8.1 Gerar Credenciais Produção na Wise
- [ ] Nova aplicação Wise para **produção**
  - [ ] Ir para https://wise.com/
  - [ ] Settings → Developers → Create Application (produção)
  - [ ] Nome: `pneusloja-production-app`
  - [ ] Copiar Client ID e Secret
- [ ] Guardar em secret manager (não no git!)
- [ ] Configurar em env var de produção (vercel, heroku, etc.)

### 8.2 Prepare Env Production
- [ ] Criar arquivo `.env.production` (local, não commitar):
  ```env
  WISE_ENV=production
  WISE_BASE_URL=https://api.wise.com
  WISE_CLIENT_ID=seu_prod_client_id
  WISE_CLIENT_SECRET=seu_prod_client_secret
  WEBHOOK_URL=https://seu-dominio.com/api/webhooks/wise
  WISE_WEBHOOK_SECRET=seu_prod_webhook_secret
  ```
- [ ] Testar localmente com `NODE_ENV=production`

### 8.3 Registrar Webhook Produção
- [ ] Na Wise (produção), registrar novo webhook
- [ ] URL pública: `https://seu-dominio.com/api/webhooks/wise`
- [ ] Copiar webhook secret
- [ ] Atualizar `WISE_WEBHOOK_SECRET` env var

### 8.4 Migrar Banco Produção
- [ ] Executar migrations no banco de produção
  ```sql
  -- Execute a migration 20260211_wise_payout_integration.sql
  ```
- [ ] Verificar que tabelas foram criadas
- [ ] Alimentar `payout_provider_config` com dados iniciais

### 8.5 Feature Flag Gradual
- [ ] Desabilitar Wise inicialmente:
  ```sql
  UPDATE payout_provider_config
  SET enabled = FALSE
  WHERE name = 'wise_payout';
  ```
- [ ] Fazer deploy
- [ ] Ativar para 1 usuário admin (teste manual)
- [ ] Ativar para 5% (usuários específicos)
- [ ] Monitorar: sucesso rate, erros, latência
- [ ] Aumentar para 50%
- [ ] Aumentar para 100% (ou manter em %X se problema)

### 8.6 Monitoramento Produção
- [ ] Setup de alerts:
  - [ ] Webhook não chega há 5 min
  - [ ] Taxa de erro > 5%
  - [ ] Latência média > 30s
- [ ] Dashboard de métricas (Datadog, New Relic, LogRocket, etc.)
- [ ] Runbook de troubleshooting (qdo algo quebra)

### 8.7 Teste de Transação Real (Pequena)
- [ ] Executar 1 transfer real de $1-5
- [ ] Verificar que fundos saem de verdade
- [ ] Verificar webhook e status em tempo real
- [ ] Confirmar que dinheiro chegou no recipient

---

## 📈 FASE 9: Otimização & Manutenção

### 9.1 Monitoramento Contínuo
- [ ] Dashboard de payout (success rate, avg latency)
- [ ] Alertas de erro (via email, Slack, etc.)
- [ ] Logs estruturados (CloudWatch, LogRocket, etc.)

### 9.2 Cleanup de Dados
- [ ] Rodar cron para limpar webhooks antigos (> 90 dias):
  ```
  SELECT cleanup_old_webhook_events();
  ```
- [ ] Verificar tamanho de tabelas
- [ ] Arquivar transfers antigas se necessário

### 9.3 Documentação
- [ ] Manter guias atualizados (links, credentials)
- [ ] Runbook: "O que fazer se transfer falhar?"
- [ ] Contatos: suporte Wise, seu time, etc.

### 9.4 Feedback & Melhorias
- [ ] Coletar feedback de usuários
- [ ] Identificar gaps (campos faltando, requisitos dinâmicos não tratados, etc.)
- [ ] Melhorias de UX (simplificar fluxo, adicionar estimativas, etc.)

---

## ✅ CHECKLIST FINAL

### Antes de Marcar como Completo:
- [ ] Todas as fases acima ✅
- [ ] Nenhum erro em produção (primeiras 24h)
- [ ] Taxa de sucesso > 95%
- [ ] Documentação atualizada
- [ ] Team treinou (conhece fluxo, troubleshooting)
- [ ] Runbook escrito e testado
- [ ] Backup/recovery plan criado
- [ ] Comunicado a Wise support que você está vivendo

---

## 📞 Suporte & Contatos

| Item | Contato |
|------|---------|
| **Wise API** | https://docs.wise.com/ |
| **Wise Support** | support@wise.com |
| **Seu Time** | ... |
| **Backup** | ... |

---

**Início**: 11 de fevereiro de 2026  
**Tempo Estimado Total**: 10-15 horas (spread ao longo de dias)  
**Sucesso**: ✅ quando fluxo completo funciona em produção com 24h sem erros

---

