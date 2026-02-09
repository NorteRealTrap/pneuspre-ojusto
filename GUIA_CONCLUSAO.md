# 🚀 GUIA COMPLETO - CONCLUSÃO DO SITE

## PASSO 1: Configurar Supabase (5 minutos)

### 1.1 Criar Projeto Supabase
1. Acesse: https://supabase.com
2. Clique em "New Project"
3. Preencha:
   - Project name: `pneus-precojusto`
   - Database password: (salve em local seguro)
   - Region: `South America (São Paulo)`
4. Clique "Create new project" e aguarde

### 1.2 Executar SQL no Dashboard
1. No Supabase Dashboard, vá para "SQL Editor"
2. Clique em "New Query"
3. Copie TODO o conteúdo do arquivo `SUPABASE_SETUP.sql`
4. Cole na query
5. Clique "Run"

### 1.3 Obter Credenciais
1. Vá para "Settings" > "API"
2. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
3. Cole no arquivo `.env`

---

## PASSO 2: Instalar Dependências (2 minutos)

```bash
npm install
```

---

## PASSO 3: Configurar Variáveis de Ambiente

Edite o arquivo `.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
VITE_PAYMENT_PROVIDER=blackcat
VITE_PAYMENT_API_KEY=sua_chave_aqui
VITE_PAYMENT_ENV=sandbox
VITE_STORE_NAME=Pneus.PreçoJusto
VITE_STORE_CNPJ=00.000.000/0000-00
VITE_STORE_PHONE=(11) 99999-9999
VITE_STORE_EMAIL=contato@pneusprecojusto.com.br
```

---

## PASSO 4: Adicionar Produtos ao Supabase

### Opção A: Via Dashboard (Manual)
1. No Supabase, vá para "Table Editor"
2. Clique em "products"
3. Clique "Insert row"
4. Preencha os dados

### Opção B: Via SQL (Rápido)
1. Vá para "SQL Editor"
2. Execute este SQL:

```sql
INSERT INTO products (brand, model, width, profile, diameter, load_index, speed_rating, price, stock, image, features, category, season, runflat, featured, description)
VALUES
('Michelin', 'Pilot Sport 4', '225', '45', '17', '91', 'Y', 1299.90, 50, 'https://via.placeholder.com/400x300?text=Michelin+Pilot', ARRAY['Esportivo', 'Alto Desempenho', 'Aderência'], 'Automóvel', 'summer', false, true, 'Pneu esportivo de alta performance'),
('Pirelli', 'Cinturato P7', '205', '55', '16', '91', 'V', 899.90, 75, 'https://via.placeholder.com/400x300?text=Pirelli+Cinturato', ARRAY['Conforto', 'Durabilidade', 'Economia'], 'Automóvel', 'all-season', false, true, 'Pneu versátil para uso urbano'),
('Goodyear', 'Wrangler TrailRunner', '265', '70', '16', '112', 'S', 1599.90, 30, 'https://via.placeholder.com/400x300?text=Goodyear+Wrangler', ARRAY['Off-road', 'Tração', 'Durabilidade'], 'SUV', 'all-season', false, true, 'Pneu para SUV e 4x4'),
('Continental', 'EcoContact 6', '195', '65', '15', '91', 'H', 749.90, 100, 'https://via.placeholder.com/400x300?text=Continental+Eco', ARRAY['Economia', 'Eco-friendly', 'Conforto'], 'Automóvel', 'all-season', false, false, 'Pneu econômico e sustentável'),
('Bridgestone', 'Turanza T005', '215', '60', '17', '96', 'H', 1099.90, 45, 'https://via.placeholder.com/400x300?text=Bridgestone+Turanza', ARRAY['Conforto', 'Segurança', 'Durabilidade'], 'Automóvel', 'all-season', false, false, 'Pneu premium para conforto máximo');
```

---

## PASSO 5: Rodar o Projeto

```bash
npm run dev
```

Acesse: http://localhost:5173

---

## PASSO 6: Testar Funcionalidades

### 6.1 Criar Conta
1. Clique em "Entrar" (canto superior direito)
2. Clique em "Não tem uma conta? Cadastre-se"
3. Preencha:
   - Email: seu-email@exemplo.com
   - Senha: senha123
   - Nome: Seu Nome
   - CPF: 123.456.789-00
   - Telefone: (11) 99999-9999
4. Clique "Cadastrar"

### 6.2 Fazer Login
1. Clique em "Entrar"
2. Use o email e senha criados
3. Clique "Entrar"

### 6.3 Comprar Pneus
1. Clique em "Produtos"
2. Veja os pneus carregados do Supabase
3. Clique "Adicionar ao Carrinho"
4. Clique no ícone do carrinho
5. Clique "Ir para Checkout"
6. Preencha endereço
7. Escolha método de pagamento
8. Clique "Finalizar Pedido"

### 6.4 Ver Pedidos
1. Clique em "Meus Pedidos"
2. Veja o histórico de compras

---

## PASSO 7: Integrar Pagamento (Black Cat)

### 7.1 Criar Conta Black Cat
1. Acesse: https://painel.blackcatpagamentos.online/
2. Clique "Criar Conta"
3. Preencha dados
4. Confirme email

### 7.2 Obter API Key
1. No painel, vá para "Configurações" > "API"
2. Copie a chave
3. Cole em `VITE_PAYMENT_API_KEY` no `.env`

### 7.3 Integrar no Checkout
O arquivo `src/services/paymentGateway.ts` já tem a integração pronta.

---

## PASSO 8: Deploy (Vercel/Netlify)

### Deploy no Vercel (Recomendado)
```bash
npm install -g vercel
vercel
```

### Deploy no Netlify
```bash
npm run build
# Arraste a pasta 'dist' para Netlify
```

---

## ✅ CHECKLIST FINAL

- [ ] Supabase criado e SQL executado
- [ ] Variáveis de ambiente configuradas
- [ ] Produtos adicionados ao banco
- [ ] npm install executado
- [ ] npm run dev funcionando
- [ ] Conta criada e login funcionando
- [ ] Produtos carregando na página
- [ ] Carrinho funcionando
- [ ] Checkout funcionando
- [ ] Pedidos salvando no banco
- [ ] Black Cat integrado (opcional)
- [ ] Deploy realizado

---

## 🆘 TROUBLESHOOTING

### Erro: "VITE_SUPABASE_URL is not defined"
**Solução:** Verifique se o arquivo `.env` está na raiz do projeto e reinicie o servidor

### Erro: "Produtos não carregam"
**Solução:** 
1. Verifique se a tabela `products` foi criada no Supabase
2. Verifique se há produtos inseridos
3. Abra o console (F12) e veja o erro

### Erro: "Não consigo fazer login"
**Solução:**
1. Verifique se a autenticação está habilitada no Supabase
2. Confirme o email na caixa de entrada
3. Tente criar uma nova conta

### Erro: "Carrinho não persiste"
**Solução:** Limpe o localStorage do navegador (F12 > Application > Clear Storage)

---

## 📞 PRÓXIMOS PASSOS

1. **Integrar Pagamento Real** - Conectar Black Cat/Mercado Pago
2. **Email Transacional** - Enviar confirmação de pedido
3. **Dashboard Admin** - Gerenciar produtos e pedidos
4. **Busca Avançada** - Filtros por especificações
5. **Avaliações** - Sistema de reviews
6. **SEO** - Meta tags e sitemap
7. **Analytics** - Google Analytics

---

Pronto! Seu site está funcionando! 🎉
