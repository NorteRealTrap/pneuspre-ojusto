# 🚗 Pneus Preçojusto - E-commerce de Pneus

Plataforma moderna e segura para venda de pneus com integração de pagamentos, autenticação JWT e painel administrativo.

## ✨ Funcionalidades

### Cliente
- 🔍 Busca avançada (marca, largura, perfil, diâmetro)
- 🛒 Carrinho persistente (localStorage)
- 💳 Checkout com 3 formas de pagamento
  - Cartão de crédito (até 12x)
  - PIX (instantâneo)
  - Boleto (3 dias)
- 📱 Design responsivo (mobile, tablet, desktop)
- 📦 Histórico de pedidos
- ❤️ Lista de favoritos

### Admin
- 📊 Dashboard com estatísticas
- ⚙️ Gerenciar produtos
- 📦 Controlar estoque
- 💰 Visualizar pedidos
- 👥 Gerenciar usuários

## 🛠️ Tech Stack

```
Frontend:   React 18 + TypeScript + Vite + Tailwind CSS
Backend:    Node.js + Express
Database:   PostgreSQL (Supabase)
Auth:       JWT (Supabase)
Payments:   Black Cat Payments API
Deploy:     Vercel (Frontend) + Cloud (Backend)
```

## 🚀 Quick Start

```bash
# Frontend
npm install
npm run dev

# Backend (outro terminal)
cd backend
npm install
npm run dev
```

Visite: http://localhost:5173

## 📖 Documentação

- **[SETUP.md](./SETUP.md)** - Guia completo de configuração
- **[SEGURANCA.md](./SEGURANCA.md)** - Boas práticas de segurança
- **[ARQUITETURA.md](./ARQUITETURA.md)** - Estrutura do projeto
- **[ROTAS.md](./ROTAS.md)** - Mapa de rotas

## 🔐 Segurança

✅ Autenticação JWT  
✅ RLS (Row Level Security)  
✅ Validação de dados  
✅ HTTPS obrigatório  
✅ Proteção de rotas  
✅ Criptografia de senhas  

## 📋 Pré-requisitos

- Node.js 20.x
- npm 10.x
- Conta Supabase
- Black Cat Payments (opcional)

## 👤 Autor

Desenvolvido como projeto e-commerce profissional.

## 📝 Licença

Proprietary - Todos os direitos reservados.

---

**Status:** ✅ Pronto para Produção  
**Última atualização:** 09/02/2026

