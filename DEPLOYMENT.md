# ðŸš€ Guia de ImplantaÃ§Ã£o - PneuStore

Este guia detalha como colocar sua loja de pneus em produÃ§Ã£o.

---

## ðŸ“‹ PrÃ©-requisitos

Antes de implantar, certifique-se de ter:

- [x] Conta no Black Cat Payments configurada
- [x] DomÃ­nio prÃ³prio (opcional, mas recomendado)
- [x] Certificado SSL (HTTPS obrigatÃ³rio para pagamentos)
- [x] Servidor de hospedagem ou serviÃ§o de cloud

---

## ðŸŒ OpÃ§Ãµes de Hospedagem

### 1. **Vercel** (Recomendado - Gratuito)

**Vantagens:**
- Deploy automÃ¡tico
- HTTPS gratuito
- CDN global
- FÃ¡cil configuraÃ§Ã£o

**Passos:**

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Adicionar variÃ¡veis de ambiente
vercel env add PAYMENT_API_KEY production
```

**Configurar domÃ­nio personalizado:**
```bash
vercel domains add seu-dominio.com.br
```

### 2. **Netlify** (Gratuito)

```bash
# 1. Instalar Netlify CLI
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Build
npm run build

# 4. Deploy
netlify deploy --prod

# 5. Configurar variÃ¡veis de ambiente no dashboard
```

### 3. **AWS S3 + CloudFront**

```bash
# 1. Build
npm run build

# 2. Instalar AWS CLI
# https://aws.amazon.com/cli/

# 3. Upload para S3
aws s3 sync dist/ s3://seu-bucket/ --delete

# 4. Invalidar cache do CloudFront
aws cloudfront create-invalidation --distribution-id ID --paths "/*"
```

### 4. **Servidor VPS (Ubuntu)**

```bash
# 1. Conectar ao servidor
ssh user@seu-servidor.com

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Instalar Nginx
sudo apt-get install nginx

# 4. Clonar repositÃ³rio
git clone seu-repositorio.git /var/www/pneustore

# 5. Instalar dependÃªncias e build
cd /var/www/pneustore
npm install
npm run build

# 6. Configurar Nginx
sudo nano /etc/nginx/sites-available/pneustore
```

**ConfiguraÃ§Ã£o do Nginx:**
```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;

    root /var/www/pneustore/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/pneustore /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Instalar SSL (Let's Encrypt)
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com.br
```

---

## ðŸ” ConfiguraÃ§Ã£o de VariÃ¡veis de Ambiente

### ProduÃ§Ã£o

Crie um arquivo `.env.production`:

```env
# API Black Cat (PRODUÃ‡ÃƒO)
PAYMENT_API_KEY=sua_chave_de_producao_aqui
VITE_BLACKCAT_ENV=production

# Dados da Loja
VITE_STORE_NAME=PneuStore
VITE_STORE_CNPJ=12.345.678/0001-90
VITE_STORE_PHONE=(11) 99999-9999
VITE_STORE_EMAIL=contato@pneustore.com.br
VITE_STORE_ADDRESS=Rua Exemplo, 123 - SÃ£o Paulo, SP

# Redes Sociais
VITE_WHATSAPP_NUMBER=5511999999999
VITE_INSTAGRAM_HANDLE=pneustore
VITE_FACEBOOK_PAGE=pneustore

# Google Analytics (opcional)
VITE_GA_TRACKING_ID=UA-XXXXXXXXX-X
```

âš ï¸ **IMPORTANTE:**
- **NUNCA** comite o arquivo `.env` no Git
- Use as variÃ¡veis de ambiente do serviÃ§o de hospedagem
- Mantenha a API Key segura

---

## ðŸ”§ OtimizaÃ§Ãµes para ProduÃ§Ã£o

### 1. Adicionar Google Analytics

Instale o pacote:
```bash
npm install react-ga4
```

Adicione no `src/app/App.tsx`:
```typescript
import ReactGA from 'react-ga4';

useEffect(() => {
  const trackingId = import.meta.env.VITE_GA_TRACKING_ID;
  if (trackingId) {
    ReactGA.initialize(trackingId);
    ReactGA.send("pageview");
  }
}, []);
```

### 2. Adicionar Meta Tags SEO

Edite `index.html`:
```html
<head>
  <!-- SEO -->
  <title>PneuStore - Pneus de Qualidade com os Melhores PreÃ§os</title>
  <meta name="description" content="Encontre os melhores pneus para seu veÃ­culo. Entrega rÃ¡pida, parcelamento em 12x sem juros e as melhores marcas do mercado.">
  <meta name="keywords" content="pneus, pneus baratos, pneus online, comprar pneus, goodyear, michelin, pirelli">
  
  <!-- Open Graph -->
  <meta property="og:title" content="PneuStore - Pneus de Qualidade">
  <meta property="og:description" content="As melhores ofertas de pneus online">
  <meta property="og:image" content="https://seu-dominio.com.br/og-image.jpg">
  <meta property="og:url" content="https://seu-dominio.com.br">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="PneuStore">
  <meta name="twitter:description" content="Pneus de qualidade com os melhores preÃ§os">
</head>
```

### 3. Configurar sitemap.xml

Crie `public/sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://seu-dominio.com.br/</loc>
    <lastmod>2024-01-01</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://seu-dominio.com.br/products</loc>
    <lastmod>2024-01-01</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>
```

### 4. Adicionar robots.txt

Crie `public/robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://seu-dominio.com.br/sitemap.xml
```

---

## ðŸ“Š Monitoramento

### 1. Google Search Console

1. Acesse: https://search.google.com/search-console
2. Adicione sua propriedade
3. Verifique a propriedade
4. Envie o sitemap.xml

### 2. Black Cat Dashboard

Monitore suas transaÃ§Ãµes em:
- https://painel.blackcatpagamentos.online/

### 3. Logs de Erro

Configure o Sentry (opcional):
```bash
npm install @sentry/react
```

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "sua_dsn_aqui",
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

---

## ðŸ”’ Checklist de SeguranÃ§a

Antes de ir para produÃ§Ã£o:

- [ ] HTTPS configurado
- [ ] API Keys em variÃ¡veis de ambiente
- [ ] CORS configurado corretamente
- [ ] ValidaÃ§Ãµes client-side e server-side
- [ ] ProteÃ§Ã£o contra SQL Injection
- [ ] ProteÃ§Ã£o contra XSS
- [ ] Rate limiting configurado
- [ ] Logs de auditoria ativos
- [ ] Backups automÃ¡ticos configurados
- [ ] PolÃ­tica de privacidade criada
- [ ] Termos de uso criados

---

## ðŸ“± PWA (Progressive Web App) - Opcional

### 1. Instalar Vite PWA Plugin

```bash
npm install vite-plugin-pwa -D
```

### 2. Configurar vite.config.ts

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PneuStore',
        short_name: 'PneuStore',
        description: 'Loja de Pneus Online',
        theme_color: '#004E89',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
```

---

## ðŸš€ Deploy AutomÃ¡tico com GitHub Actions

Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Build
      run: npm run build
      env:
        PAYMENT_API_KEY: ${{ secrets.BLACKCAT_API_KEY }}
        
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        working-directory: ./
```

---

## ðŸ“ˆ Performance

### Metas de Performance

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: > 90

### Ferramentas de Teste

1. **Lighthouse** (Chrome DevTools)
2. **PageSpeed Insights**: https://pagespeed.web.dev/
3. **GTmetrix**: https://gtmetrix.com/

---

## ðŸ› Troubleshooting em ProduÃ§Ã£o

### Problema: VariÃ¡veis de ambiente nÃ£o funcionam

**SoluÃ§Ã£o:**
```bash
# Verificar se as variÃ¡veis foram definidas
npm run build
# Procurar por "undefined" nos logs
```

### Problema: Erro 404 ao recarregar pÃ¡gina

**SoluÃ§Ã£o:**
Configure rewrite rules no servidor:

**Vercel** - `vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Netlify** - `_redirects`:
```
/*    /index.html   200
```

### Problema: Pagamento nÃ£o processa

**Checklist:**
1. API Key estÃ¡ correta?
2. Ambiente estÃ¡ configurado (production/sandbox)?
3. HTTPS estÃ¡ ativo?
4. CORS estÃ¡ configurado?

---

## ðŸ“ž Suporte

### Black Cat Payments
- **Email**: suporte@blackcatpagamentos.online
- **Docs**: https://docs.blackcatpagamentos.online/
- **Status**: https://status.blackcatpagamentos.online/

### Hospedagem
- **Vercel**: https://vercel.com/support
- **Netlify**: https://www.netlify.com/support/
- **AWS**: https://aws.amazon.com/support/

---

## âœ… Checklist Final

Antes de lanÃ§ar:

- [ ] Build de produÃ§Ã£o testado localmente
- [ ] VariÃ¡veis de ambiente configuradas
- [ ] HTTPS funcionando
- [ ] Pagamentos testados em sandbox
- [ ] Pagamentos testados em produÃ§Ã£o
- [ ] SEO configurado
- [ ] Analytics configurado
- [ ] Monitoramento ativo
- [ ] Backups configurados
- [ ] DocumentaÃ§Ã£o atualizada
- [ ] Equipe treinada
- [ ] Suporte pronto

---

## ðŸŽ‰ ParabÃ©ns!

Sua loja estÃ¡ pronta para vender! ðŸš€

**Primeiros passos apÃ³s o deploy:**

1. Teste uma compra real
2. Verifique os emails de confirmaÃ§Ã£o
3. Monitore as primeiras transaÃ§Ãµes
4. Ajuste conforme necessÃ¡rio

**Boa sorte com suas vendas! ðŸ’°**

