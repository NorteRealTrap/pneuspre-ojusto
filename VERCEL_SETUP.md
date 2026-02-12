# Vercel: configurar dev/preview/prod

## 1) CLI e login
- Instale: `npm install -g vercel`
- Entre: `vercel login`

## 2) Vincular o projeto
- No diretório `d:\PNEUSLOJA`: `vercel link`
- Se já existir o projeto no time, selecione (ex.: `pneuspre-ojusto`).

## 3) Definir variáveis por ambiente
Use o arquivo `vercel.env.example` como guia. Para cada variável rode:
```
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_URL preview
vercel env add VITE_SUPABASE_URL development
# repita para todas: VITE_SUPABASE_ANON_KEY, VITE_API_URL, VITE_PAYMENT_ENV, VITE_STORE_*, VITE_WHATSAPP_NUMBER,
# VITE_INSTAGRAM_HANDLE, VITE_FACEBOOK_PAGE, VITE_GA_TRACKING_ID, PAYMENT_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY, PAYMENT_API_KEY
```
Sugestões de valores:
- Production: `VITE_API_URL=/api`, `VITE_PAYMENT_ENV=production`, segredos reais.
- Preview: `VITE_API_URL=/api`, `VITE_PAYMENT_ENV=sandbox`, segredos de teste.
- Development: pode usar valores locais do `.env` e do `backend/.env`.

## 4) Sincronizar para local (opcional)
Para gerar um `.env.local` com o que está no painel Vercel:
```
vercel env pull .env.local
```

## 5) Deploy
- `vercel --prod` para produção.
- `vercel` para preview.
- Push para `main` já dispara deploy (vercel.json configurado).

## Observações
- `vercel.json` já define build (`npm run build`), saída `dist`, runtime Node 20 para `/api`, e rewrite SPA para o React Router.
- Rotas `/api/*` continuam indo para funções serverless; demais rotas caem em `index.html`.
