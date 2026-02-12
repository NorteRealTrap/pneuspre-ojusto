# 📋 GUIA DE CONFIGURAÇÃO - PNEUS.PRECOJUSTO

## 🚀 QUICK START (5 MINUTOS)

### Pré-requisitos
- Node.js 20.x or superior
- npm 10.x or superior
- Git

### 1️⃣ Clonar e Instalar

```bash
git clone <seu-repositorio>
cd pneusloja
npm install
```

### 2️⃣ Configurar Variáveis de Ambiente

Crie arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
```

**Edite `.env` com suas chaves:**

```
VITE_SUPABASE_URL=https://[seu-project].supabase.co
VITE_SUPABASE_ANON_KEY=[sua-chave-anon]
VITE_API_URL=http://localhost:3000/api
VITE_PAYMENT_ENV=sandbox
```

### 3️⃣ Backend (Em outro terminal)

```bash
cd backend
npm install
cp .env.example .env
# Edite backend/.env com suas chaves
npm run dev
```

### 4️⃣ Frontend

```bash
npm run dev
```

➜ Abra: https://localhost:5173

---

## 🔑 CONFIGURAÇÃO SUPABASE

### Criar Projeto

1. Vá para https://supabase.com
2. Login / Sign up
3. Criar novo projeto
4. Copiar "Project URL" → `VITE_SUPABASE_URL`
5. Copiar "anon key" → `VITE_SUPABASE_ANON_KEY`
6. Copiar "service role key" → `SUPABASE_SERVICE_KEY` (backend only)

### Criar Tabelas

Vá em "SQL Editor" e execute:

```sql
-- Tabela de produtos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  width SMALLINT NOT NULL,
  profile SMALLINT NOT NULL,
  diameter SMALLINT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  image TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de pedidos
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_id VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de itens do pedido
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL
);

-- Habilitar RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
```

### Configurar RLS (Row Level Security)

```sql
-- Qualquer um pode ler produtos
CREATE POLICY "anyone_can_read_products" ON products
  FOR SELECT USING (true);

-- Usuários veem apenas seus pedidos
CREATE POLICY "users_see_own_orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Usuários só criam pedidos para si mesmos
CREATE POLICY "users_create_own_orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 🛒 ADICIONAR PRODUTOS

### Via SQL (Rápido)

```sql
INSERT INTO products (brand, model, category, width, profile, diameter, price, stock, image)
VALUES 
  ('Michelin', 'Energy', 'passeio', 205, 60, 16, 450.00, 50, 'https://...'),
  ('Pirelli', 'P8', 'suv', 225, 65, 17, 580.00, 30, 'https://...'),
  ('Goodyear', 'EfficientGrip', 'caminhonete', 245, 75, 16, 620.00, 20, 'https://...');
```

---

## 💳 CONFIGURAR PAGAMENTOS

### Black Cat Payments

1. Criar conta em https://painel.blackcatpagamentos.online/
2. Gerar API Key
3. Copiar em `backend/.env`:

```
PAYMENT_API_KEY=pk_live_seu_compartilhado
PAYMENT_WEBHOOK_SECRET=seu_webhook_secret
PAYMENT_ENV=sandbox
```

⚠️ **`PAYMENT_API_KEY` é para o backend, NUNCA no frontend!**

---

## 📦 DEPLOYMENT

### Frontend (Vercel)

```bash
npm run build
vercel --prod
```

### Backend (Render, Heroku ou seu servidor)

```bash
cd backend
npm run build
npm start
```

**Variáveis de Ambiente:**
```
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://pneusprecojusto.vercel.app
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
PAYMENT_API_KEY=...
PAYMENT_WEBHOOK_SECRET=...
```

---

## 🧪 TESTES

### Verificar se está pronto

```bash
npm run build      # Build para produção
npm run preview    # Visualizar build local
npm run lint       # Checar erros de código
```

### Fluxo de Teste Completo

1. ✅ Acessar home: https://localhost:5173
2. ✅ Registrar usuário
3. ✅ Fazer login
4. ✅ Adicionar produto ao carrinho
5. ✅ Ir para checkout
6. ✅ Testar pagamento em sandbox

---

## 🚨 CHECKLIST PRÉ-PRODUÇÃO

- [ ] Todas as variáveis `.env` configuradas
- [ ] Supabase com RLS habilitado
- [ ] Produtos inseridos no banco
- [ ] Black Cat Payments configurado
- [ ] Build sem erros
- [ ] Backend rodando em produção
- [ ] Frontend deployed em Vercel
- [ ] HTTPS ativado
- [ ] Domínio customizado configurado (opcional)

---

## 📞 SUPORTE

**Documentação completa:**
- [Segurança](./SEGURANCA.md)
- [Arquitetura](./ARQUITETURA.md)
- [Pagamentos](./SEGURANCA_PAGAMENTOS.md)

**Comunidades:**
- Supabase Docs: https://supabase.com/docs
- React Router: https://reactrouter.com
- Tailwind: https://tailwindcss.com

---

**Atualizado:** 09/02/2026
