# 🎯 Wise Payouts - Quick Reference

## 📁 Arquivos Criados

### Código TypeScript
| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| `src/types/index.ts` | +200 | Tipos: PayoutProvider, Wise*, WebhookPayload |
| `src/services/wiseService.ts` | 950+ | Implementação WisePayoutService |
| `src/services/wise.utils.ts` | 300+ | Hooks + helpers (useWiseQuote, etc) |
| `src/app/components/WisePayoutForm.example.tsx` | 400+ | Componente React pronto |

### Banco de Dados
| Arquivo | Descrição |
|---------|-----------|
| `supabase/migrations/20260211_wise_payout_integration.sql` | 5 tabelas + índices + RLS |

### Documentação
| Arquivo | Tamanho | Conteúdo |
|---------|--------|----------|
| `WISE_INTEGRATION.md` | 25KB | Guia completo (tudo sobre fluxo) |
| `WISE_IMPLEMENTATION_SUMMARY.md` | 15KB | Status + arquitetura |
| `WISE_IMPLEMENTATION_CHECKLIST.md` | 20KB | Step-by-step (9 fases) |
| `WISE_USAGE_EXAMPLES.md` | 10KB | 12 exemplos de código |
| `WISE_FAQ_TROUBLESHOOTING.md` | 15KB | FAQ + soluções |
| `README_WISE_IMPLEMENTATION.md` | 8KB | Resumo executivo |
| `.env.wise.example` | 2KB | Template de variáveis |

**Total**: 2500+ linhas de código + 100KB documentação

---

## ⚡ Começos Rápidos

### Setup (15 min)
```bash
# 1. Configurar env
cp .env.wise.example .env.local
# Editar: WISE_CLIENT_ID, WISE_CLIENT_SECRET

# 2. Executar migrations
# Supabase Dashboard → SQL Editor
# Cole (20260211_wise_payout_integration.sql) e execute
```

### Teste Básico (30 min)
```typescript
// 1. Testar serviço direto
import { wisePayoutService } from '@/services/wiseService';

const quote = await wisePayoutService.createQuote({
  profileId: 123,
  sourceCurrency: 'BRL',
  targetCurrency: 'USD',
  sourceAmount: 100,
});
console.log('Quote:', quote.id, 'Rate:', quote.rate);
```

### Usar em React (1 hora)
```typescript
// 1. Copiar componente
cp src/app/components/WisePayoutForm.example.tsx \
   src/app/components/WisePayoutForm.tsx

// 2. Importar em sua página
import { WisePayoutForm } from '@/app/components/WisePayoutForm';

export function PayoutPage() {
  return <WisePayoutForm userId={userId} />;
}
```

---

## 🔑 Conceitos-Chave

### Fluxo em 4 Passos
```
1. QUOTE ┐
         ├─→ taxa de câmbio, fee, expiração
2. RECIPIENT ┤
         ├─→ beneficiário (IBAN, CPF, etc)
3. TRANSFER  ├─→ transferência (compliance, fonte de fundos)
4. FUND      ┘
         └─→ executar (move $ de verdade)
```

### Interface Principal
```typescript
PayoutProvider {
  createQuote()              // passo 1
  createRecipient()          // passo 2
  getTransferRequirements()  // passo 2.5 (compliance)
  createTransfer()           // passo 3
  fundTransfer()             // passo 4
  getTransferStatus()        // monitorar
  handleWebhook()            // receber updates
}
```

### Custom Hooks
```typescript
useWiseQuote()       // { quote, loading, error, createQuote() }
useWiseRecipient()   // { recipient, requirements, createRecipient() }
useWiseTransfer()    // { transfer, step, fundTransfer() }
useWiseTransferStatus() // { status, checkStatus() }
```

---

## 🔌 Endpoints Necessários

```typescript
POST   /api/wise/quotes          // Salvar quote
POST   /api/wise/recipients      // Salvar recipient
POST   /api/wise/transfers       // Salvar transfer
PATCH  /api/wise/transfers/{id}  // Atualizar status
POST   /api/webhooks/wise        // Receber webhooks
POST   /api/wise/webhook-events  // Persistir webhook
```

---

## 🛡️ Segurança

### Auth
- ✅ OAuth 2.0 Client Credentials
- ✅ Token cache com expiração
- ✅ Nunca guardar token (regenerar)

### Webhook
- ✅ Validação RSA-SHA256 (X-Signature-SHA256)
- ✅ Responder <5s
- ✅ Processar assincronamente

### BD
- ✅ RLS policies (usuario_id)
- ✅ UNIQUE em customerTransactionId (idempotência)
- ✅ Hash de recipient (evita duplicatas)

---

## 📊 Tabelas BD

| Tabela | Função |
|--------|--------|
| `wise_recipients` | Beneficiários cadastrados |
| `wise_quotes` | Cotações (com expiração) |
| `wise_transfers` | Transferências (com status) |
| `webhook_events` | Auditoria de webhooks |
| `payout_provider_config` | Feature flags por provider |

---

## 🐛 Debugging

### Logs Importantes
```sql
-- Ver transferências
SELECT * FROM wise_transfers ORDER BY created_at DESC;

-- Ver webhooks recebidos
SELECT * FROM webhook_events WHERE event_type = 'transfers#state-change';

-- Ver quem failed (status)
SELECT * FROM wise_transfers WHERE status IN ('funds_returned', 'cancelled');
```

### Check Status
```typescript
const status = await wisePayoutService.getTransferStatus(transferId);
console.log('Status:', status.status); // outgoing_payment_sent = sucesso
```

### Test Webhook
```bash
# Via ngrok (localhost → internet)
ngrok http 3000
# Usar URL gerada (https://abc123.ngrok.io)
```

---

## 🎯 Checklist Mínimo

- [ ] `.env.local` com credentials
- [ ] Migration SQL executada
- [ ] `POST /api/webhooks/wise` implementado
- [ ] Webhook registrado na Wise
- [ ] Teste Quote → Transfer → Fund
- [ ] Componente integrado
- [ ] Feature flag ativada

**Time**: ~8-12 horas para tudo funcionar

---

## 📚 Referências

| Link | Conteúdo |
|------|----------|
| [Wise Docs](https://docs.wise.com/) | API oficial |
| [Send Money API](https://docs.wise.com/guides/product/send-money) | Fluxo específico |
| [Webhooks](https://docs.wise.com/guides/webhook) | Eventos em tempo real |
| [WISE_INTEGRATION.md](./WISE_INTEGRATION.md) | Guia nossogenial |

---

## 💬 Status

✅ **Implementação**: Completa  
🟡 **Testes**: Sandbox (a fazer)  
🔴 **Produção**: A preparar  

**Pronto para**: Configuração iniciar hoje

---

## 🚀 Next Steps (Ordem)

1. Configurar `.env.local`
2. Executar migration SQL
3. Testar Quote (request/response)
4. Criar endpoints backend
5. Registrar webhook
6. Copiar & testar componente React
7. Feature flag (ativar gradualmente)
8. Monitorar métricas

---

**Quick Start**: 15 min setup + 2 hours integration = Live!

