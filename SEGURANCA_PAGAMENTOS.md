# 🔐 GUIA DE SEGURANÇA - PAGAMENTOS

## ⚠️ ALERTA CRÍTICO

**NUNCA coloque chave privada em variáveis VITE_**

Variáveis com prefixo `VITE_` são expostas no frontend (visível no código-fonte).

---

## ✅ ARQUITETURA SEGURA

```
Frontend (React)
    ↓
Backend (Node.js)
    ↓
Gateway de Pagamento
```

### Frontend
- ✅ Chave pública (se existir)
- ✅ Chamadas ao backend
- ❌ NUNCA chave privada

### Backend
- ✅ Chave privada
- ✅ Validação de pagamentos
- ✅ Webhooks
- ✅ Reembolsos

---

## 📋 ESTRUTURA DE ARQUIVOS

```
backend/
├── src/
│   └── server.ts .................. Backend Express
├── .env ........................... Chave privada (NUNCA commite!)
├── package.json
└── tsconfig.json

frontend/
├── .env ........................... Apenas chaves públicas
├── src/
│   └── services/
│       ├── supabase.ts ............ Supabase
│       └── paymentService.ts ...... Chamadas ao backend
```

---

## 🚀 COMO RODAR

### Terminal 1 - Backend
```bash
cd backend
npm install
npm run dev
# Roda em http://localhost:3000
```

### Terminal 2 - Frontend
```bash
cd .
npm install
npm run dev
# Roda em http://localhost:5173
```

---

## 🔑 VARIÁVEIS DE AMBIENTE

### Backend (.env)
```
PAYMENT_API_KEY=pk_live_... (CHAVE PRIVADA)
PAYMENT_ENV=sandbox|production
SUPABASE_SERVICE_KEY=...
```

### Frontend (.env)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:3000/api
```

---

## 🛡️ FLUXO SEGURO DE PAGAMENTO

```
1. Usuário clica "Finalizar Pedido"
   ↓
2. Frontend envia dados ao Backend
   ↓
3. Backend valida com Supabase
   ↓
4. Backend chama Gateway com chave privada
   ↓
5. Gateway processa pagamento
   ↓
6. Gateway envia webhook ao Backend
   ↓
7. Backend atualiza pedido no Supabase
   ↓
8. Frontend recebe confirmação
```

---

## ✅ CHECKLIST DE SEGURANÇA

- [ ] Chave privada NUNCA em VITE_
- [ ] Chave privada NUNCA no frontend
- [ ] Backend intermediando pagamentos
- [ ] .env do backend no .gitignore
- [ ] Validação de token em cada rota
- [ ] Webhook validando assinatura
- [ ] HTTPS em produção
- [ ] Rate limiting no backend

---

## 🚨 ERROS COMUNS

### ❌ ERRADO
```javascript
// Frontend
const PAYMENT_KEY = 'pk_live_...'; // EXPOSTO!
const response = await fetch('https://api.gateway.com/charge', {
  headers: { 'Authorization': `Bearer ${PAYMENT_KEY}` }
});
```

### ✅ CORRETO
```javascript
// Frontend
const response = await fetch('http://localhost:3000/api/payment/charge', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Backend
const PAYMENT_KEY = process.env.PAYMENT_API_KEY; // SEGURO!
const response = await fetch('https://api.gateway.com/charge', {
  headers: { 'Authorization': `Bearer ${PAYMENT_KEY}` }
});
```

---

## 📞 PRÓXIMOS PASSOS

1. Rodar backend: `cd backend && npm run dev`
2. Rodar frontend: `npm run dev`
3. Testar fluxo de pagamento
4. Integrar com gateway real
5. Deploy seguro em produção

---

**Segurança em primeiro lugar!** 🔐
