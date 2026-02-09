# 🚀 Guia de Implantação - PneuStore

Este guia detalha como colocar sua loja de pneus em produção.

---

## 📋 Pré-requisitos

Antes de implantar, certifique-se de ter:

- [x] Conta no Black Cat Payments configurada
- [x] Domínio próprio (opcional, mas recomendado)
- [x] Certificado SSL (HTTPS obrigatório para pagamentos)
- [x] Servidor de hospedagem ou serviço de cloud

---

## 🌐 Opções de Hospedagem

### 1. **Vercel** (Recomendado - Gratuito)

**Vantagens:**
- Deploy automático
- HTTPS gratuito
- CDN global
- Fácil configuração

**Passos:**

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Adicionar variáveis de ambiente
vercel env add VITE_BLACKCAT_API_KEY production
```

**Configurar domínio personalizado:**
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

# 5. Configurar variáveis de ambiente no dashboard
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

# 4. Clonar repositório
git clone seu-repositorio.git /var/www/pneustore

# 5. Instalar dependências e build
cd /var/www/pneustore
npm install
npm run build

# 6. Configurar Nginx
sudo nano /etc/nginx/sites-available/pneustore
```

**Configuração do Nginx:**
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

## 🔐 Configuração de Variáveis de Ambiente

### Produção

Crie um arquivo `.env.production`:

```env
# API Black Cat (PRODUÇÃO)
VITE_BLACKCAT_API_KEY=sua_chave_de_producao_aqui
VITE_BLACKCAT_ENV=production

# Dados da Loja
VITE_STORE_NAME=PneuStore
VITE_STORE_CNPJ=12.345.678/0001-90
VITE_STORE_PHONE=(11) 99999-9999
VITE_STORE_EMAIL=contato@pneustore.com.br
VITE_STORE_ADDRESS=Rua Exemplo, 123 - São Paulo, SP

# Redes Sociais
VITE_WHATSAPP_NUMBER=5511999999999
VITE_INSTAGRAM_HANDLE=pneustore
VITE_FACEBOOK_PAGE=pneustore

# Google Analytics (opcional)
VITE_GA_TRACKING_ID=UA-XXXXXXXXX-X
```

⚠️ **IMPORTANTE:**
- **NUNCA** comite o arquivo `.env` no Git
- Use as variáveis de ambiente do serviço de hospedagem
- Mantenha a API Key segura

---

## 🔧 Otimizações para Produção

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
  <title>PneuStore - Pneus de Qualidade com os Melhores Preços</title>
  <meta name="description" content="Encontre os melhores pneus para seu veículo. Entrega rápida, parcelamento em 12x sem juros e as melhores marcas do mercado.">
  <meta name="keywords" content="pneus, pneus baratos, pneus online, comprar pneus, goodyear, michelin, pirelli">
  
  <!-- Open Graph -->
  <meta property="og:title" content="PneuStore - Pneus de Qualidade">
  <meta property="og:description" content="As melhores ofertas de pneus online">
  <meta property="og:image" content="https://seu-dominio.com.br/og-image.jpg">
  <meta property="og:url" content="https://seu-dominio.com.br">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="PneuStore">
  <meta name="twitter:description" content="Pneus de qualidade com os melhores preços">
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

## 📊 Monitoramento

### 1. Google Search Console

1. Acesse: https://search.google.com/search-console
2. Adicione sua propriedade
3. Verifique a propriedade
4. Envie o sitemap.xml

### 2. Black Cat Dashboard

Monitore suas transações em:
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

## 🔒 Checklist de Segurança

Antes de ir para produção:

- [ ] HTTPS configurado
- [ ] API Keys em variáveis de ambiente
- [ ] CORS configurado corretamente
- [ ] Validações client-side e server-side
- [ ] Proteção contra SQL Injection
- [ ] Proteção contra XSS
- [ ] Rate limiting configurado
- [ ] Logs de auditoria ativos
- [ ] Backups automáticos configurados
- [ ] Política de privacidade criada
- [ ] Termos de uso criados

---

## 📱 PWA (Progressive Web App) - Opcional

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

## 🚀 Deploy Automático com GitHub Actions

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
        VITE_BLACKCAT_API_KEY: ${{ secrets.BLACKCAT_API_KEY }}
        
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID }}
        vercel-project-id: ${{ secrets.PROJECT_ID }}
        working-directory: ./
```

---

## 📈 Performance

### Metas de Performance

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse Score**: > 90

### Ferramentas de Teste

1. **Lighthouse** (Chrome DevTools)
2. **PageSpeed Insights**: https://pagespeed.web.dev/
3. **GTmetrix**: https://gtmetrix.com/

---

## 🐛 Troubleshooting em Produção

### Problema: Variáveis de ambiente não funcionam

**Solução:**
```bash
# Verificar se as variáveis foram definidas
npm run build
# Procurar por "undefined" nos logs
```

### Problema: Erro 404 ao recarregar página

**Solução:**
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

### Problema: Pagamento não processa

**Checklist:**
1. API Key está correta?
2. Ambiente está configurado (production/sandbox)?
3. HTTPS está ativo?
4. CORS está configurado?

---

## 📞 Suporte

### Black Cat Payments
- **Email**: suporte@blackcatpagamentos.online
- **Docs**: https://docs.blackcatpagamentos.online/
- **Status**: https://status.blackcatpagamentos.online/

### Hospedagem
- **Vercel**: https://vercel.com/support
- **Netlify**: https://www.netlify.com/support/
- **AWS**: https://aws.amazon.com/support/

---

## ✅ Checklist Final

Antes de lançar:

- [ ] Build de produção testado localmente
- [ ] Variáveis de ambiente configuradas
- [ ] HTTPS funcionando
- [ ] Pagamentos testados em sandbox
- [ ] Pagamentos testados em produção
- [ ] SEO configurado
- [ ] Analytics configurado
- [ ] Monitoramento ativo
- [ ] Backups configurados
- [ ] Documentação atualizada
- [ ] Equipe treinada
- [ ] Suporte pronto

---

## 🎉 Parabéns!

Sua loja está pronta para vender! 🚀

**Primeiros passos após o deploy:**

1. Teste uma compra real
2. Verifique os emails de confirmação
3. Monitore as primeiras transações
4. Ajuste conforme necessário

**Boa sorte com suas vendas! 💰**
