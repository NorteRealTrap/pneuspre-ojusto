# ⚡ Quick Start - PneuStore

Comece a vender pneus em 5 minutos!

---

## 🚀 Início Rápido

### 1️⃣ Instalar Dependências

```bash
npm install
```

### 2️⃣ Configurar API Black Cat

Crie o arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Edite o `.env` e adicione sua chave:

```env
VITE_BLACKCAT_API_KEY=sua_chave_aqui
VITE_BLACKCAT_ENV=production
```

**🔑 Como obter a chave:**
1. Acesse: https://painel.blackcatpagamentos.online/
2. Faça login ou crie uma conta gratuita
3. Vá em **Configurações → API Keys**
4. Copie a chave e cole no arquivo `.env`

### 3️⃣ Iniciar o Projeto

```bash
npm run dev
```

Acesse: **http://localhost:5173** 🎉

---

## 📖 Estrutura Básica

### Páginas Disponíveis

| Rota | Descrição | Acesso |
|------|-----------|--------|
| `/` | Homepage com busca de pneus | Público |
| `/products` | Catálogo completo com filtros | Público |
| `/cart` | Carrinho de compras | Público |
| `/checkout` | Finalização de compra | Autenticado |
| `/login` | Login de usuários | Público |
| `/register` | Cadastro de novos usuários | Público |
| `/account` | Dados da conta | Autenticado |
| `/orders` | Histórico de pedidos | Autenticado |
| `/dashboard` | Painel administrativo | Admin |

### Credenciais Padrão

**Admin (Dashboard):**
- Email: `admin@pneustore.com`
- Senha: `admin123`
- Role: `admin`

**Cliente:**
- Email: `cliente@example.com`
- Senha: `cliente123`
- Role: `user`

> ⚠️ **Importante:** Altere estas credenciais em produção!

---

## 🎯 Principais Funcionalidades

### Para Clientes

✅ **Busca de Pneus**
- Por medida (largura, perfil, aro)
- Por marca
- Por categoria de veículo

✅ **Filtros Avançados**
- Largura, perfil, diâmetro
- Marca e modelo
- Faixa de preço
- Run Flat e temporada

✅ **Carrinho Inteligente**
- Adicionar/remover produtos
- Atualizar quantidades
- Persistência de dados

✅ **Checkout Completo**
- 3 formas de pagamento:
  - 💳 Cartão de Crédito (12x sem juros)
  - 📱 PIX (aprovação instantânea)
  - 🎫 Boleto (vencimento 3 dias)

### Para Administradores

✅ **Dashboard**
- Estatísticas em tempo real
- Produtos com estoque baixo
- Resumo de vendas

✅ **Gerenciar Produtos**
- Adicionar novos pneus
- Editar informações
- Controlar estoque
- Definir preços e promoções

✅ **Configurações**
- Dados da loja
- API Keys
- Informações de contato

---

## 🛒 Testando a Loja

### 1. Buscar Pneu

1. Acesse a homepage
2. Use a busca por medida ou clique em "Tamanhos Populares"
3. Veja os resultados filtrados

### 2. Adicionar ao Carrinho

1. Navegue até `/products`
2. Escolha um pneu
3. Selecione a quantidade
4. Clique em "Adicionar"

### 3. Finalizar Compra

1. Vá para o carrinho
2. Clique em "Finalizar Compra"
3. Faça login ou cadastre-se
4. Preencha os dados
5. Escolha a forma de pagamento
6. Confirme a compra

### 4. Acessar Dashboard (Admin)

1. Faça login com credenciais de admin
2. Acesse `/dashboard`
3. Gerencie produtos e veja estatísticas

---

## 💳 Testando Pagamentos

### Ambiente Sandbox

Para testar pagamentos sem cobranças reais:

```env
VITE_BLACKCAT_ENV=sandbox
```

### Dados de Teste

**Cartão Aprovado:**
```
Número: 4111 1111 1111 1111
Nome: TESTE APROVADO
Validade: 12/30
CVV: 123
```

**Cartão Recusado:**
```
Número: 4000 0000 0000 0002
Nome: TESTE RECUSADO
Validade: 12/30
CVV: 123
```

**CPF de Teste:**
```
123.456.789-09
```

---

## 🎨 Personalização Rápida

### Alterar Cores

Edite `/src/styles/theme.css`:

```css
:root {
  --primary: #004E89;    /* Azul principal */
  --secondary: #FF6B35;  /* Laranja */
  --accent: #F7B801;     /* Amarelo */
}
```

### Alterar Logo

Substitua o arquivo `public/logo.png` pela logo da sua loja.

### Adicionar Produtos

#### Opção 1: Via Dashboard (Recomendado)
1. Faça login como admin
2. Acesse Dashboard → Produtos
3. Clique em "Adicionar Produto"
4. Preencha as informações
5. Salve

#### Opção 2: Via Código
Edite `/src/app/stores/tires.ts` e adicione no array `mockTires`:

```typescript
{
  id: '11',
  brand: 'Goodyear',
  model: 'Eagle Sport',
  width: '195',
  profile: '55',
  diameter: '16',
  loadIndex: '91',
  speedRating: 'V',
  price: 549.90,
  oldPrice: 649.90,
  stock: 25,
  image: 'https://sua-imagem.jpg',
  features: ['Esportivo', 'Durável', 'Silencioso'],
  category: 'passeio',
  season: 'all-season',
  runflat: false,
  featured: true,
  description: 'Pneu esportivo de alta performance',
}
```

---

## 🐛 Problemas Comuns

### Erro: "Black Cat Payments não foi inicializado"

**Causa:** API Key não configurada

**Solução:**
```bash
# Verifique se o .env existe
ls -la .env

# Verifique o conteúdo
cat .env

# Deve conter:
VITE_BLACKCAT_API_KEY=sua_chave
```

### Erro: "Cannot find module"

**Causa:** Dependências não instaladas

**Solução:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Página em branco

**Causa:** Erro de JavaScript

**Solução:**
1. Abra o Console do navegador (F12)
2. Verifique os erros
3. Limpe o cache: `Ctrl + Shift + Del`
4. Recarregue: `Ctrl + F5`

### Produtos não aparecem

**Causa:** LocalStorage corrompido

**Solução:**
```javascript
// No Console do navegador (F12):
localStorage.clear()
// Recarregue a página
```

---

## 📚 Próximos Passos

### Desenvolvimento

- [ ] Adicione seus próprios produtos
- [ ] Personalize as cores e logo
- [ ] Configure os dados da loja
- [ ] Teste todos os fluxos de pagamento

### Produção

- [ ] Configure um domínio
- [ ] Configure HTTPS (obrigatório)
- [ ] Altere as credenciais padrão
- [ ] Configure backup automático
- [ ] Ative o monitoramento

### Marketing

- [ ] Configure Google Analytics
- [ ] Adicione meta tags SEO
- [ ] Crie contas nas redes sociais
- [ ] Configure WhatsApp Business
- [ ] Prepare materiais promocionais

---

## 📞 Precisa de Ajuda?

### Documentação

- **README completo**: `README.md`
- **Guia de implantação**: `DEPLOYMENT.md`
- **Black Cat Docs**: https://docs.blackcatpagamentos.online/

### Suporte

- **Black Cat**: suporte@blackcatpagamentos.online
- **Issues**: Crie uma issue no repositório

---

## ✅ Checklist de Validação

Antes de começar a vender, verifique:

- [ ] Projeto roda localmente (`npm run dev`)
- [ ] API Black Cat configurada
- [ ] Pode adicionar produtos ao carrinho
- [ ] Checkout processa pagamentos
- [ ] Dashboard acessível
- [ ] Responsive em mobile
- [ ] Todas as páginas carregam sem erros

---

## 🎉 Pronto para Vender!

Parabéns! Sua loja está configurada e pronta para começar a vender pneus online.

**Boas vendas! 🚀💰**

---

*Última atualização: Fevereiro 2024*
