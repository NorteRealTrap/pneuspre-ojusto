# 🚀 INÍCIO RÁPIDO - Pneus.PreçoJusto

## ⚡ 3 Passos para Rodar

### 1️⃣ Instalar Dependências
```bash
npm install
cd backend && npm install && cd ..
```

### 2️⃣ Configurar Banco de Dados
1. Acesse: https://supabase.com/dashboard/project/lwtwfzeyggahoxofuwte/editor
2. Abra o SQL Editor
3. Execute o arquivo: `SUPABASE_SQL_PRONTO.sql`
4. Execute o arquivo: `PRODUTOS_EXEMPLO.sql`

### 3️⃣ Iniciar Aplicação
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
cd backend
npm run dev
```

Acesse: http://localhost:5173

---

## 👤 Login Admin

**Email**: admin@example.com  
**Senha**: qualquer senha

Para promover seu usuário a admin:
1. Faça login no sistema
2. Copie seu email
3. Execute no Supabase SQL Editor:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'seu@email.com';
```

---

## 📁 Estrutura Essencial

```
PNEUSLOJA/
├── src/
│   ├── app/
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── pages/          # Páginas da aplicação
│   │   └── stores/         # Estado global (Zustand)
│   └── services/           # APIs e integrações
├── backend/
│   └── src/
│       └── server.ts       # API de pagamentos
├── public/                 # Imagens e assets
├── .env                    # Variáveis públicas
└── backend/.env            # Variáveis privadas
```

---

## 🎯 Funcionalidades Principais

### Para Clientes
- ✅ Catálogo de pneus com filtros
- ✅ Carrinho de compras
- ✅ Checkout com 3 formas de pagamento
- ✅ Histórico de pedidos
- ✅ Lista de favoritos

### Para Administradores
- ✅ Dashboard com estatísticas
- ✅ CRUD completo de produtos
- ✅ Controle de estoque
- ✅ Gerenciamento de pedidos

---

## 🔧 Comandos Úteis

```bash
# Desenvolvimento
npm run dev                    # Frontend (porta 5173)
cd backend && npm run dev      # Backend (porta 3000)

# Produção
npm run build                  # Build otimizado
npm run preview                # Preview do build

# Segurança
npm run security:check-rsc     # Verificar vulnerabilidades
```

---

## 📱 Testar Responsividade

1. Abra DevTools (F12)
2. Clique no ícone de dispositivo móvel
3. Teste em:
   - iPhone SE (375px)
   - iPad (768px)
   - Desktop (1920px)

---

## 🆘 Problemas Comuns

### Erro: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Supabase connection failed"
- Verifique se o `.env` está configurado
- Confirme que executou os scripts SQL

### Erro: "Port 5173 already in use"
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5173 | xargs kill -9
```

---

## 📚 Documentação Completa

- **Segurança**: `SISTEMA_SEGURO_OTIMIZADO.md`
- **Banco de Dados**: `SUPABASE_SQL_PRONTO.sql`
- **Produtos Exemplo**: `PRODUTOS_EXEMPLO.sql`

---

## ✅ Checklist de Verificação

- [ ] Dependências instaladas
- [ ] Banco de dados configurado
- [ ] Produtos de exemplo inseridos
- [ ] Frontend rodando (porta 5173)
- [ ] Backend rodando (porta 3000)
- [ ] Login funcionando
- [ ] Catálogo exibindo produtos
- [ ] Carrinho funcionando
- [ ] Dashboard admin acessível

---

**Dúvidas?** Consulte `SISTEMA_SEGURO_OTIMIZADO.md`
