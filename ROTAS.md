# Mapa de Rotas

## Frontend (React Router)

### Publicas
- `/`
- `/products`
- `/produtos`
- `/product/:id`
- `/cart`
- `/carrinho`
- `/login`
- `/register`
- `/forgot-password`
- `/about`
- `/faq`
- `/shipping`
- `/returns`
- `/warranty`
- `/privacy`
- `/terms`
- `/cookies`

### Protegidas (usuario autenticado)
- `/wishlist`
- `/favoritos`
- `/checkout`
- `/account`
- `/minha-conta`
- `/orders`
- `/pedidos`

### Protegidas (admin)
- `/dashboard`
- `/admin`

## Backend (Express)

Base: `/api`

### Pagamentos
- `POST /api/payment/charge` (auth required)
- `POST /api/payment/confirm` (auth required)
- `POST /api/payment/refund` (auth required)
- `POST /api/payment/webhook` (assinatura obrigatoria)

## Seguranca de Rotas
- Frontend usa `RequireAuth` e `RequireAdmin` em `src/app/components/RouteGuards.tsx`.
- Backend valida JWT com Supabase em `backend/src/server.ts` antes das rotas de pagamento.
