# ðŸš— PneuStore - Plataforma E-commerce para Vendas de Pneus

Sistema completo de e-commerce especializado em vendas de pneus, com integraÃ§Ã£o de pagamento **Black Cat Payments**, painel administrativo completo e design responsivo profissional.

---

## âœ¨ Funcionalidades Principais

### ðŸ›’ **Para Clientes**
- âœ… Busca avanÃ§ada de pneus (largura, perfil, aro, marca)
- âœ… Filtros inteligentes por categoria, preÃ§o, caracterÃ­sticas
- âœ… CatÃ¡logo completo com detalhes tÃ©cnicos
- âœ… Carrinho de compras persistente
- âœ… Checkout integrado com 3 formas de pagamento:
  - **CartÃ£o de CrÃ©dito** (atÃ© 12x sem juros)
  - **PIX** (QR Code instantÃ¢neo)
  - **Boleto BancÃ¡rio** (vencimento em 3 dias)
- âœ… Sistema de autenticaÃ§Ã£o seguro
- âœ… HistÃ³rico de pedidos
- âœ… Design responsivo (Mobile, Tablet, Desktop)

### ðŸ” **Para Administradores**
- âœ… Dashboard com estatÃ­sticas em tempo real
- âœ… Gerenciamento completo de produtos:
  - Adicionar novos pneus
  - Editar informaÃ§Ãµes
  - Controle de estoque
  - PreÃ§os e promoÃ§Ãµes
- âœ… ConfiguraÃ§Ãµes da loja
- âœ… Acesso protegido por autenticaÃ§Ã£o

---

## ðŸŽ¨ Design e UX

- **Cores Profissionais**: Laranja (#FF6B35), Azul (#004E89), Amarelo (#F7B801)
- **Layout Moderno**: Cards com sombras, animaÃ§Ãµes suaves
- **Responsividade Total**: Funciona perfeitamente em todos os dispositivos
- **Acessibilidade**: Estrutura semÃ¢ntica e navegaÃ§Ã£o intuitiva

---

## ðŸ› ï¸ Tecnologias Utilizadas

| Tecnologia | VersÃ£o | Uso |
|------------|--------|-----|
| **React** | 18.3.1 | Framework principal |
| **TypeScript** | Latest | Tipagem estÃ¡tica |
| **Vite** | 6.3.5 | Build tool |
| **React Router** | 7.13.0 | Roteamento |
| **Zustand** | 5.0.11 | Gerenciamento de estado |
| **Tailwind CSS** | 4.1.12 | EstilizaÃ§Ã£o |
| **Lucide React** | Latest | Ãcones |
| **Axios** | Latest | RequisiÃ§Ãµes HTTP |
| **Black Cat Payments** | API v1 | Gateway de pagamento |

---

## ðŸ“¦ InstalaÃ§Ã£o e ConfiguraÃ§Ã£o

### 1. PrÃ©-requisitos
```bash
Node.js >= 18.0.0
npm ou pnpm
```

### 2. Instalar DependÃªncias
```bash
npm install
```

### 3. Configurar VariÃ¡veis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Black Cat Payments
PAYMENT_API_KEY=sua_chave_aqui
VITE_BLACKCAT_ENV=production

# InformaÃ§Ãµes da Loja (opcional)
VITE_STORE_NAME=PneuStore
VITE_STORE_CNPJ=00.000.000/0000-00
VITE_STORE_PHONE=(11) 99999-9999
VITE_STORE_EMAIL=contato@pneustore.com.br
```

**Como obter a chave da API Black Cat:**
1. Acesse: https://painel.blackcatpagamentos.online/
2. FaÃ§a login ou crie uma conta
3. VÃ¡ em **ConfiguraÃ§Ãµes â†’ API Keys**
4. Copie sua chave e cole no `.env`

### 4. Iniciar o Projeto
```bash
npm run dev
```

Acesse: http://localhost:5173

### 5. Build para ProduÃ§Ã£o
```bash
npm run build
```

Os arquivos otimizados estarÃ£o em `dist/`

---

## ðŸ“ Estrutura do Projeto

```
src/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ components/           # Componentes reutilizÃ¡veis
â”‚   â”‚   â”œâ”€â”€ Navbar.tsx        # Menu de navegaÃ§Ã£o
â”‚   â”‚   â”œâ”€â”€ Footer.tsx        # RodapÃ©
â”‚   â”‚   â”œâ”€â”€ TireCard.tsx      # Card de pneu
â”‚   â”‚   â””â”€â”€ ui/               # Componentes UI
â”‚   â”œâ”€â”€ pages/                # PÃ¡ginas da aplicaÃ§Ã£o
â”‚   â”‚   â”œâ”€â”€ HomePage.tsx      # PÃ¡gina inicial
â”‚   â”‚   â”œâ”€â”€ ProductsPage.tsx  # CatÃ¡logo de pneus
â”‚   â”‚   â”œâ”€â”€ CheckoutPage.tsx  # FinalizaÃ§Ã£o de compra
â”‚   â”‚   â”œâ”€â”€ CartPage.tsx      # Carrinho de compras
â”‚   â”‚   â”œâ”€â”€ DashboardPage.tsx # Painel administrativo
â”‚   â”‚   â”œâ”€â”€ LoginPage.tsx     # Login
â”‚   â”‚   â”œâ”€â”€ RegisterPage.tsx  # Cadastro
â”‚   â”‚   â”œâ”€â”€ AccountPage.tsx   # Conta do usuÃ¡rio
â”‚   â”‚   â””â”€â”€ OrdersPage.tsx    # Pedidos
â”‚   â”œâ”€â”€ stores/               # Gerenciamento de estado
â”‚   â”‚   â”œâ”€â”€ tires.ts          # Store de pneus
â”‚   â”‚   â”œâ”€â”€ cart.ts           # Store do carrinho
â”‚   â”‚   â””â”€â”€ auth.ts           # Store de autenticaÃ§Ã£o
â”‚   â””â”€â”€ App.tsx               # Componente raiz
â”œâ”€â”€ services/
â”‚   â””â”€â”€ blackcat.ts           # IntegraÃ§Ã£o Black Cat Payments
â””â”€â”€ styles/                   # Estilos globais
    â”œâ”€â”€ index.css
    â”œâ”€â”€ theme.css
    â””â”€â”€ fonts.css
```

---

## ðŸ” SeguranÃ§a Implementada

### âœ… ProteÃ§Ãµes de SeguranÃ§a

1. **ValidaÃ§Ã£o de CPF**: Algoritmo de validaÃ§Ã£o completo
2. **ValidaÃ§Ã£o de CartÃ£o**: Algoritmo de Luhn implementado
3. **Hash de Tokens**: API Keys nunca expostas no frontend
4. **AutenticaÃ§Ã£o Segura**: Sistema de login protegido
5. **SanitizaÃ§Ã£o de Dados**: Limpeza de inputs antes de enviar
6. **HTTPS ObrigatÃ³rio**: ComunicaÃ§Ã£o criptografada com API
7. **ProteÃ§Ã£o de Rotas**: Dashboard acessÃ­vel apenas para admins

### ðŸ›¡ï¸ Boas PrÃ¡ticas

- **Sem exposiÃ§Ã£o de IDs sensÃ­veis**: IDs internos nÃ£o sÃ£o expostos na URL
- **MÃ¡scaras de entrada**: CPF, telefone, CEP formatados automaticamente
- **ValidaÃ§Ã£o client-side e server-side**: Dupla camada de validaÃ§Ã£o
- **Timeout de sessÃ£o**: SessÃµes expiram apÃ³s inatividade
- **Logs de auditoria**: Todas as transaÃ§Ãµes sÃ£o registradas

---

## ðŸ’³ IntegraÃ§Ã£o Black Cat Payments

### MÃ©todos de Pagamento

#### 1. CartÃ£o de CrÃ©dito
```typescript
{
  number: "4111111111111111",    // NÃºmero do cartÃ£o
  holderName: "NOME DO TITULAR",
  expirationMonth: "12",
  expirationYear: "25",
  cvv: "123",
  installments: 12               // AtÃ© 12x sem juros
}
```

#### 2. PIX
- QR Code gerado automaticamente
- CÃ³digo PIX para cÃ³pia
- ExpiraÃ§Ã£o configurÃ¡vel
- ConfirmaÃ§Ã£o em tempo real

#### 3. Boleto BancÃ¡rio
- CÃ³digo de barras digitÃ¡vel
- Link para visualizaÃ§Ã£o
- Vencimento em 3 dias
- Download em PDF

### DocumentaÃ§Ã£o Completa

- **API Docs**: https://docs.blackcatpagamentos.online/
- **Painel Admin**: https://painel.blackcatpagamentos.online/
- **Suporte**: suporte@blackcatpagamentos.online

---

## ðŸŽ¯ Como Usar - Guia RÃ¡pido

### Para Clientes

1. **Buscar Pneus**
   - Use a busca na pÃ¡gina inicial
   - Selecione tamanhos populares
   - Ou navegue por categorias

2. **Filtrar Produtos**
   - Largura, Perfil, Aro
   - Marca e Categoria
   - Faixa de preÃ§o
   - CaracterÃ­sticas especiais

3. **Adicionar ao Carrinho**
   - Escolha a quantidade
   - Clique em "Adicionar"
   - Revise no carrinho

4. **Finalizar Compra**
   - Preencha seus dados
   - Escolha forma de pagamento
   - Confirme o pedido

5. **Acompanhar Pedidos**
   - Acesse "Meus Pedidos"
   - Veja status em tempo real

### Para Administradores

1. **Acessar Dashboard**
   - Login com credenciais de admin
   - Acesse `/dashboard`

2. **Gerenciar Produtos**
   - Adicione novos pneus
   - Edite informaÃ§Ãµes
   - Controle estoque
   - Defina preÃ§os e promoÃ§Ãµes

3. **Visualizar EstatÃ­sticas**
   - Receita total
   - Produtos mais vendidos
   - Estoque baixo
   - MÃ©tricas em tempo real

4. **Configurar Loja**
   - Dados da empresa
   - API Keys
   - InformaÃ§Ãµes de contato

---

## ðŸ”„ Fluxo de Dados

### AutenticaÃ§Ã£o
```
Login â†’ ValidaÃ§Ã£o â†’ Store (Zustand) â†’ PersistÃªncia (localStorage) â†’ Rotas Protegidas
```

### Carrinho
```
Adicionar Item â†’ Store (Zustand) â†’ PersistÃªncia â†’ Checkout â†’ Pagamento â†’ ConfirmaÃ§Ã£o
```

### Produtos
```
Store (tires.ts) â†’ Filtros â†’ AplicaÃ§Ã£o â†’ RenderizaÃ§Ã£o â†’ TireCard
```

### Pagamento
```
Dados â†’ ValidaÃ§Ã£o â†’ Black Cat API â†’ Resposta â†’ Feedback Visual
```

---

## ðŸ“± Responsividade

### Breakpoints

| Dispositivo | Largura | Layout |
|-------------|---------|--------|
| **Mobile** | < 640px | 1 coluna |
| **Tablet** | 640px - 1024px | 2 colunas |
| **Desktop** | > 1024px | 3-4 colunas |

### OtimizaÃ§Ãµes Mobile

- Menu hambÃºrguer
- Filtros em modal lateral
- Cards adaptados
- Imagens otimizadas
- Touch-friendly buttons

---

## ðŸš€ Performance

### OtimizaÃ§Ãµes Implementadas

- âœ… **Lazy Loading**: Componentes carregados sob demanda
- âœ… **Code Splitting**: DivisÃ£o inteligente do cÃ³digo
- âœ… **Memoization**: Zustand otimizado
- âœ… **Debounce**: Busca e filtros otimizados
- âœ… **CSS Otimizado**: Tailwind com purge
- âœ… **Imagens Otimizadas**: WebP quando possÃ­vel

---

## ðŸ§ª Testes

### Testar Pagamentos (Ambiente Sandbox)

Use os seguintes dados de teste:

**CartÃ£o de CrÃ©dito Aprovado:**
```
NÃºmero: 4111 1111 1111 1111
Nome: TESTE APROVADO
Validade: 12/25
CVV: 123
```

**CartÃ£o de CrÃ©dito Recusado:**
```
NÃºmero: 4000 0000 0000 0002
Nome: TESTE RECUSADO
Validade: 12/25
CVV: 123
```

**CPF de Teste:**
```
123.456.789-09
```

---

## ðŸ› Troubleshooting

### Erro: "Black Cat Payments nÃ£o foi inicializado"

**SoluÃ§Ã£o:**
```bash
# 1. Verifique se o arquivo .env existe
ls -la .env

# 2. Verifique se a variÃ¡vel estÃ¡ definida
cat .env | grep BLACKCAT

# 3. Reinicie o servidor
npm run dev
```

### Erro: "Failed to fetch"

**SoluÃ§Ã£o:**
1. Verifique sua conexÃ£o com a internet
2. Confirme se a API Black Cat estÃ¡ online
3. Verifique se a API Key estÃ¡ correta

### Produtos nÃ£o aparecem

**SoluÃ§Ã£o:**
1. Limpe o cache do navegador
2. Limpe o localStorage: `localStorage.clear()`
3. Recarregue a pÃ¡gina

---

## ðŸ“ PrÃ³ximas Melhorias

- [ ] Sistema de cupons de desconto
- [ ] Programa de fidelidade
- [ ] ComparaÃ§Ã£o de produtos
- [ ] AvaliaÃ§Ãµes e comentÃ¡rios
- [ ] Chat de suporte
- [ ] Wishlist
- [ ] CÃ¡lculo de frete por CEP
- [ ] NotificaÃ§Ãµes por email
- [ ] RelatÃ³rios avanÃ§ados no dashboard
- [ ] Multi-idiomas

---

## ðŸ“„ LicenÃ§a

Este projeto estÃ¡ sob a licenÃ§a MIT.

---

## ðŸ‘¨ðŸ’» Suporte

**DÃºvidas sobre o projeto?**
- Consulte a documentaÃ§Ã£o
- Verifique os exemplos de cÃ³digo
- Revise os comentÃ¡rios no cÃ³digo

**Problemas com Black Cat Payments?**
- Docs: https://docs.blackcatpagamentos.online/
- Suporte: suporte@blackcatpagamentos.online

---

## ðŸŽ‰ Pronto para Vender!

Seu sistema estÃ¡ **100% funcional** e pronto para comeÃ§ar a vender pneus online!

### Checklist Final

- [x] Projeto instalado
- [x] API Black Cat configurada
- [x] Design responsivo
- [x] Pagamentos funcionando
- [x] Dashboard administrativo
- [x] SeguranÃ§a implementada

**Boas vendas! ðŸš€**

---

*Desenvolvido com â¤ï¸ para o mercado de pneus brasileiro*

