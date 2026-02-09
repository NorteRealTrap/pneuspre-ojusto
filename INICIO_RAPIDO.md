# 🚀 GUIA RÁPIDO DE INÍCIO - PneuStore

## ⚡ Início Rápido em 3 Passos

### 1️⃣ Instalar Dependências
```bash
npm install
```

### 2️⃣ Configurar Black Cat API
1. Copie o arquivo de exemplo:
   ```bash
   copy .env.example .env
   ```

2. Obtenha sua chave em: https://painel.blackcatpagamentos.online/

3. Adicione no arquivo `.env`:
   ```
   VITE_BLACKCAT_API_KEY=sua_chave_aqui
   ```

### 3️⃣ Iniciar o Projeto
```bash
npm run dev
```

**Pronto!** Acesse http://localhost:5173

---

## 🎯 Principais Funcionalidades

### ✅ Para Clientes
- Busca avançada de pneus por medida
- Filtros inteligentes (marca, categoria, preço)
- Carrinho de compras persistente
- 3 formas de pagamento:
  - 💳 Cartão (12x sem juros)
  - 📱 PIX (instantâneo)
  - 🎫 Boleto (3 dias)

### ✅ Para Administradores
- Dashboard com estatísticas
- Gerenciamento completo de produtos
- Controle de estoque
- Configurações da loja

**Login Admin:** Use email com "admin" para acessar o painel

---

## 📋 Checklist de Verificação

Antes de colocar em produção:

- [ ] API Key do Black Cat configurada
- [ ] Testou o fluxo de compra completo
- [ ] Verificou responsividade mobile
- [ ] Customizou cores e logo (se necessário)
- [ ] Adicionou produtos reais no store
- [ ] Configurou domínio e hospedagem
- [ ] Testou todos os métodos de pagamento

---

## 🛒 Fluxo de Compra do Cliente

1. **Busca** → Cliente encontra o pneu na homepage
2. **Filtros** → Refina a busca na página de produtos
3. **Detalhes** → Visualiza informações do produto
4. **Carrinho** → Adiciona ao carrinho
5. **Dados** → Preenche informações pessoais
6. **Pagamento** → Escolhe forma de pagamento
7. **Confirmação** → Recebe confirmação do pedido

---

## 🎨 Personalização

### Adicionar Produtos

Edite: `src/app/stores/tires.ts`

```typescript
{
  id: '11',
  brand: 'Goodyear',
  model: 'Assurance',
  width: '185',
  profile: '65',
  diameter: '15',
  loadIndex: '88',
  speedRating: 'H',
  price: 429.90,
  oldPrice: 499.90,
  stock: 20,
  image: 'https://exemplo.com/imagem.jpg',
  features: ['Durável', 'Econômico', 'Silencioso'],
  category: 'passeio',
  season: 'all-season',
  runflat: false,
  featured: true,
}
```

### Alterar Cores

Edite: `src/styles/theme.css`

```css
:root {
  --primary: #FF6B35;    /* Laranja */
  --secondary: #004E89;  /* Azul */
  --accent: #F7B801;     /* Amarelo */
}
```

---

## 🔒 Segurança

✅ Validação de CPF e cartão
✅ API Keys protegidas
✅ Comunicação HTTPS
✅ Rotas protegidas
✅ Sanitização de dados

---

## 📱 Contatos e Suporte

**Black Cat Payments:**
- Docs: https://docs.blackcatpagamentos.online/
- Painel: https://painel.blackcatpagamentos.online/
- Suporte: suporte@blackcatpagamentos.online

**Documentação Completa:**
- Consulte: `README_COMPLETO.md`

---

## 🎉 Sua loja está pronta para vender!

**Próximos passos:**
1. Adicione seus produtos reais
2. Configure informações da loja
3. Teste o fluxo completo
4. Faça o deploy em produção

**Boas vendas! 🚀**
