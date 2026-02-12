# âš¡ Quick Start - PneuStore

Comece a vender pneus em 5 minutos!

---

## ðŸš€ InÃ­cio RÃ¡pido

### 1ï¸âƒ£ Instalar DependÃªncias

```bash
npm install
```

### 2ï¸âƒ£ Configurar API Black Cat

Crie o arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env
```

Edite o `.env` e adicione sua chave:

```env
PAYMENT_API_KEY=sua_chave_aqui
VITE_BLACKCAT_ENV=production
```

**ðŸ”‘ Como obter a chave:**
1. Acesse: https://painel.blackcatpagamentos.online/
2. FaÃ§a login ou crie uma conta gratuita
3. VÃ¡ em **ConfiguraÃ§Ãµes â†’ API Keys**
4. Copie a chave e cole no arquivo `.env`

### 3ï¸âƒ£ Iniciar o Projeto

```bash
npm run dev
```

Acesse: **http://localhost:5173** ðŸŽ‰

---

## ðŸ“– Estrutura BÃ¡sica

### PÃ¡ginas DisponÃ­veis

| Rota | DescriÃ§Ã£o | Acesso |
|------|-----------|--------|
| `/` | Homepage com busca de pneus | PÃºblico |
| `/products` | CatÃ¡logo completo com filtros | PÃºblico |
| `/cart` | Carrinho de compras | PÃºblico |
| `/checkout` | FinalizaÃ§Ã£o de compra | Autenticado |
| `/login` | Login de usuÃ¡rios | PÃºblico |
| `/register` | Cadastro de novos usuÃ¡rios | PÃºblico |
| `/account` | Dados da conta | Autenticado |
| `/orders` | HistÃ³rico de pedidos | Autenticado |
| `/dashboard` | Painel administrativo | Admin |

### Credenciais PadrÃ£o

**Admin (Dashboard):**
- Email: `admin@pneustore.com`
- Senha: `admin123`
- Role: `admin`

**Cliente:**
- Email: `cliente@example.com`
- Senha: `cliente123`
- Role: `user`

> âš ï¸ **Importante:** Altere estas credenciais em produÃ§Ã£o!

---

## ðŸŽ¯ Principais Funcionalidades

### Para Clientes

âœ… **Busca de Pneus**
- Por medida (largura, perfil, aro)
- Por marca
- Por categoria de veÃ­culo

âœ… **Filtros AvanÃ§ados**
- Largura, perfil, diÃ¢metro
- Marca e modelo
- Faixa de preÃ§o
- Run Flat e temporada

âœ… **Carrinho Inteligente**
- Adicionar/remover produtos
- Atualizar quantidades
- PersistÃªncia de dados

âœ… **Checkout Completo**
- 3 formas de pagamento:
  - ðŸ’³ CartÃ£o de CrÃ©dito (12x sem juros)
  - ðŸ“± PIX (aprovaÃ§Ã£o instantÃ¢nea)
  - ðŸŽ« Boleto (vencimento 3 dias)

### Para Administradores

âœ… **Dashboard**
- EstatÃ­sticas em tempo real
- Produtos com estoque baixo
- Resumo de vendas

âœ… **Gerenciar Produtos**
- Adicionar novos pneus
- Editar informaÃ§Ãµes
- Controlar estoque
- Definir preÃ§os e promoÃ§Ãµes

âœ… **ConfiguraÃ§Ãµes**
- Dados da loja
- API Keys
- InformaÃ§Ãµes de contato

---

## ðŸ›’ Testando a Loja

### 1. Buscar Pneu

1. Acesse a homepage
2. Use a busca por medida ou clique em "Tamanhos Populares"
3. Veja os resultados filtrados

### 2. Adicionar ao Carrinho

1. Navegue atÃ© `/products`
2. Escolha um pneu
3. Selecione a quantidade
4. Clique em "Adicionar"

### 3. Finalizar Compra

1. VÃ¡ para o carrinho
2. Clique em "Finalizar Compra"
3. FaÃ§a login ou cadastre-se
4. Preencha os dados
5. Escolha a forma de pagamento
6. Confirme a compra

### 4. Acessar Dashboard (Admin)

1. FaÃ§a login com credenciais de admin
2. Acesse `/dashboard`
3. Gerencie produtos e veja estatÃ­sticas

---

## ðŸ’³ Testando Pagamentos

### Ambiente Sandbox

Para testar pagamentos sem cobranÃ§as reais:

```env
VITE_BLACKCAT_ENV=sandbox
```

### Dados de Teste

**CartÃ£o Aprovado:**
```
NÃºmero: 4111 1111 1111 1111
Nome: TESTE APROVADO
Validade: 12/30
CVV: 123
```

**CartÃ£o Recusado:**
```
NÃºmero: 4000 0000 0000 0002
Nome: TESTE RECUSADO
Validade: 12/30
CVV: 123
```

**CPF de Teste:**
```
123.456.789-09
```

---

## ðŸŽ¨ PersonalizaÃ§Ã£o RÃ¡pida

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

#### OpÃ§Ã£o 1: Via Dashboard (Recomendado)
1. FaÃ§a login como admin
2. Acesse Dashboard â†’ Produtos
3. Clique em "Adicionar Produto"
4. Preencha as informaÃ§Ãµes
5. Salve

#### OpÃ§Ã£o 2: Via CÃ³digo
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
  features: ['Esportivo', 'DurÃ¡vel', 'Silencioso'],
  category: 'passeio',
  season: 'all-season',
  runflat: false,
  featured: true,
  description: 'Pneu esportivo de alta performance',
}
```

---

## ðŸ› Problemas Comuns

### Erro: "Black Cat Payments nÃ£o foi inicializado"

**Causa:** API Key nÃ£o configurada

**SoluÃ§Ã£o:**
```bash
# Verifique se o .env existe
ls -la .env

# Verifique o conteÃºdo
cat .env

# Deve conter:
PAYMENT_API_KEY=sua_chave
```

### Erro: "Cannot find module"

**Causa:** DependÃªncias nÃ£o instaladas

**SoluÃ§Ã£o:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### PÃ¡gina em branco

**Causa:** Erro de JavaScript

**SoluÃ§Ã£o:**
1. Abra o Console do navegador (F12)
2. Verifique os erros
3. Limpe o cache: `Ctrl + Shift + Del`
4. Recarregue: `Ctrl + F5`

### Produtos nÃ£o aparecem

**Causa:** LocalStorage corrompido

**SoluÃ§Ã£o:**
```javascript
// No Console do navegador (F12):
localStorage.clear()
// Recarregue a pÃ¡gina
```

---

## ðŸ“š PrÃ³ximos Passos

### Desenvolvimento

- [ ] Adicione seus prÃ³prios produtos
- [ ] Personalize as cores e logo
- [ ] Configure os dados da loja
- [ ] Teste todos os fluxos de pagamento

### ProduÃ§Ã£o

- [ ] Configure um domÃ­nio
- [ ] Configure HTTPS (obrigatÃ³rio)
- [ ] Altere as credenciais padrÃ£o
- [ ] Configure backup automÃ¡tico
- [ ] Ative o monitoramento

### Marketing

- [ ] Configure Google Analytics
- [ ] Adicione meta tags SEO
- [ ] Crie contas nas redes sociais
- [ ] Configure WhatsApp Business
- [ ] Prepare materiais promocionais

---

## ðŸ“ž Precisa de Ajuda?

### DocumentaÃ§Ã£o

- **README completo**: `README.md`
- **Guia de implantaÃ§Ã£o**: `DEPLOYMENT.md`
- **Black Cat Docs**: https://docs.blackcatpagamentos.online/

### Suporte

- **Black Cat**: suporte@blackcatpagamentos.online
- **Issues**: Crie uma issue no repositÃ³rio

---

## âœ… Checklist de ValidaÃ§Ã£o

Antes de comeÃ§ar a vender, verifique:

- [ ] Projeto roda localmente (`npm run dev`)
- [ ] API Black Cat configurada
- [ ] Pode adicionar produtos ao carrinho
- [ ] Checkout processa pagamentos
- [ ] Dashboard acessÃ­vel
- [ ] Responsive em mobile
- [ ] Todas as pÃ¡ginas carregam sem erros

---

## ðŸŽ‰ Pronto para Vender!

ParabÃ©ns! Sua loja estÃ¡ configurada e pronta para comeÃ§ar a vender pneus online.

**Boas vendas! ðŸš€ðŸ’°**

---

*Ãšltima atualizaÃ§Ã£o: Fevereiro 2024*

