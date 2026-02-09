# 🚀 GUIA DE DEPLOY - PneuStore

## 📋 Pré-requisitos para Deploy

Antes de fazer o deploy, certifique-se de que:

- [x] Projeto testado localmente
- [x] API Black Cat configurada e testada
- [x] Todos os produtos adicionados
- [x] Informações da loja configuradas
- [x] Fluxo de compra testado completamente
- [x] Responsividade verificada em todos os dispositivos

---

## 🌐 Opções de Hospedagem

### 1. Vercel (Recomendado) ⭐

**Vantagens:**
- Deploy automático via Git
- HTTPS gratuito
- CDN global
- Variáveis de ambiente seguras
- Zero configuração

**Passos:**

1. **Criar conta na Vercel**
   - Acesse: https://vercel.com
   - Faça login com GitHub/GitLab/Bitbucket

2. **Conectar repositório**
   ```bash
   # Instale o Vercel CLI
   npm install -g vercel
   
   # Faça login
   vercel login
   
   # Deploy
   vercel
   ```

3. **Configurar variáveis de ambiente**
   - Acesse o dashboard do projeto
   - Vá em Settings → Environment Variables
   - Adicione:
     ```
     VITE_BLACKCAT_API_KEY=sua_chave_aqui
     VITE_BLACKCAT_ENV=production
     ```

4. **Deploy automático**
   - Cada push no branch principal faz deploy automático
   - Preview deployments para branches de feature

**Comando único:**
```bash
vercel --prod
```

---

### 2. Netlify

**Vantagens:**
- Interface amigável
- Deploy via drag-and-drop
- Formulários integrados
- Funções serverless

**Passos:**

1. **Build do projeto**
   ```bash
   npm run build
   ```

2. **Deploy via Netlify CLI**
   ```bash
   # Instalar CLI
   npm install -g netlify-cli
   
   # Login
   netlify login
   
   # Deploy
   netlify deploy --prod
   ```

3. **Ou via interface web**
   - Acesse: https://app.netlify.com
   - Arraste a pasta `dist/` para o site
   - Configure variáveis de ambiente

**Configuração de variáveis:**
- Site Settings → Build & Deploy → Environment
- Adicione as variáveis VITE_*

---

### 3. AWS Amplify

**Vantagens:**
- Integração com AWS
- Escalabilidade automática
- Backend integrado

**Passos:**

1. **Instalar Amplify CLI**
   ```bash
   npm install -g @aws-amplify/cli
   amplify configure
   ```

2. **Inicializar projeto**
   ```bash
   amplify init
   amplify add hosting
   ```

3. **Deploy**
   ```bash
   npm run build
   amplify publish
   ```

---

### 4. GitHub Pages

**Vantagens:**
- Gratuito para repositórios públicos
- Integração direta com GitHub

**Passos:**

1. **Instalar gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **Adicionar scripts no package.json**
   ```json
   {
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     },
     "homepage": "https://seu-usuario.github.io/pneustore"
   }
   ```

3. **Deploy**
   ```bash
   npm run deploy
   ```

---

## 🔧 Configuração de Build

### Vite Config (vite.config.ts)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          store: ['zustand'],
          ui: ['lucide-react'],
        },
      },
    },
  },
});
```

### Build para Produção

```bash
# Limpar cache
rm -rf node_modules dist

# Reinstalar dependências
npm install

# Build otimizado
npm run build

# Testar build localmente
npm run preview
```

---

## 🔐 Variáveis de Ambiente

### Arquivo .env (Produção)

```env
# Black Cat Payments - PRODUÇÃO
VITE_BLACKCAT_API_KEY=sk_live_sua_chave_producao
VITE_BLACKCAT_ENV=production

# Informações da Loja
VITE_STORE_NAME=PneuStore
VITE_STORE_CNPJ=00.000.000/0000-00
VITE_STORE_PHONE=(11) 99999-9999
VITE_STORE_EMAIL=contato@pneustore.com.br
VITE_STORE_ADDRESS=Rua Exemplo, 123 - Centro - São Paulo/SP

# Analytics (opcional)
VITE_GA_TRACKING_ID=UA-XXXXXXXXX-X
```

### Arquivo .env.development (Desenvolvimento)

```env
# Black Cat Payments - SANDBOX
VITE_BLACKCAT_API_KEY=sk_test_sua_chave_sandbox
VITE_BLACKCAT_ENV=sandbox

# Informações da Loja (teste)
VITE_STORE_NAME=PneuStore - DEV
VITE_STORE_CNPJ=00.000.000/0000-00
VITE_STORE_PHONE=(11) 99999-9999
VITE_STORE_EMAIL=dev@pneustore.com.br
```

---

## 📊 Otimizações de Performance

### 1. Imagens

```bash
# Otimizar imagens antes do deploy
npm install -g imagemin-cli

# Comprimir imagens
imagemin src/assets/* --out-dir=src/assets/optimized
```

### 2. Code Splitting

Já implementado no projeto com React.lazy:

```typescript
// Exemplo de lazy loading
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
```

### 3. Caching

Configure headers de cache no servidor:

```
# Vercel (vercel.json)
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 🔍 SEO e Meta Tags

### Adicionar no index.html

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- SEO -->
  <title>PneuStore - Pneus com os Melhores Preços</title>
  <meta name="description" content="Compre pneus das melhores marcas com até 12x sem juros. Entrega rápida e segura. Goodyear, Michelin, Pirelli e mais!" />
  <meta name="keywords" content="pneus, pneus online, comprar pneus, pneus baratos, goodyear, michelin, pirelli" />
  
  <!-- Open Graph -->
  <meta property="og:title" content="PneuStore - Pneus com os Melhores Preços" />
  <meta property="og:description" content="Compre pneus das melhores marcas com até 12x sem juros" />
  <meta property="og:image" content="https://pneustore.com.br/og-image.jpg" />
  <meta property="og:url" content="https://pneustore.com.br" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="PneuStore - Pneus com os Melhores Preços" />
  <meta name="twitter:description" content="Compre pneus das melhores marcas com até 12x sem juros" />
  
  <!-- Favicon -->
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

---

## 📈 Analytics e Monitoramento

### Google Analytics

```typescript
// src/utils/analytics.ts
export const initGA = () => {
  const trackingId = import.meta.env.VITE_GA_TRACKING_ID;
  if (trackingId) {
    // Adicionar script do GA
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    script.async = true;
    document.head.appendChild(script);
    
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', trackingId);
  }
};
```

### Sentry (Monitoramento de Erros)

```bash
npm install @sentry/react
```

```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "sua_dsn_aqui",
  environment: import.meta.env.MODE,
});
```

---

## 🔒 Checklist de Segurança

Antes do deploy:

- [ ] Arquivo .env não está no repositório
- [ ] .gitignore configurado corretamente
- [ ] API Keys de produção configuradas
- [ ] HTTPS configurado
- [ ] Certificado SSL válido
- [ ] Headers de segurança configurados
- [ ] CORS configurado corretamente
- [ ] Rate limiting implementado (se necessário)
- [ ] Logs de erro configurados
- [ ] Backup configurado

---

## 🧪 Testes Pós-Deploy

### Checklist de Testes

1. **Funcionalidades Básicas**
   - [ ] Homepage carrega corretamente
   - [ ] Busca de pneus funciona
   - [ ] Filtros aplicam corretamente
   - [ ] Carrinho adiciona/remove itens
   - [ ] Login/Registro funcionam

2. **Checkout e Pagamento**
   - [ ] Formulário de checkout valida dados
   - [ ] Pagamento com cartão funciona
   - [ ] PIX gera QR Code
   - [ ] Boleto gera código de barras
   - [ ] Confirmação de pedido exibida

3. **Dashboard Admin**
   - [ ] Login admin funciona
   - [ ] Adicionar produto funciona
   - [ ] Editar produto funciona
   - [ ] Excluir produto funciona
   - [ ] Estatísticas carregam

4. **Responsividade**
   - [ ] Mobile (< 640px)
   - [ ] Tablet (640px - 1024px)
   - [ ] Desktop (> 1024px)

5. **Performance**
   - [ ] Lighthouse Score > 90
   - [ ] Tempo de carregamento < 3s
   - [ ] Imagens otimizadas
   - [ ] Sem erros no console

---

## 🆘 Troubleshooting

### Erro: "Failed to load module"

**Solução:**
```bash
# Limpar cache e rebuildar
rm -rf node_modules dist .vite
npm install
npm run build
```

### Erro: "Environment variable not defined"

**Solução:**
- Verifique se as variáveis estão configuradas no painel da hospedagem
- Variáveis devem começar com `VITE_`
- Faça redeploy após adicionar variáveis

### Erro: "404 on page refresh"

**Solução para Vercel:**
```json
// vercel.json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Solução para Netlify:**
```
// _redirects
/*    /index.html   200
```

---

## 📞 Suporte

**Problemas com Deploy?**
- Vercel: https://vercel.com/support
- Netlify: https://www.netlify.com/support/
- AWS: https://aws.amazon.com/support/

**Problemas com Black Cat?**
- Docs: https://docs.blackcatpagamentos.online/
- Suporte: suporte@blackcatpagamentos.online

---

## 🎉 Deploy Concluído!

Após o deploy bem-sucedido:

1. ✅ Teste todas as funcionalidades
2. ✅ Configure domínio personalizado
3. ✅ Configure SSL/HTTPS
4. ✅ Adicione ao Google Search Console
5. ✅ Configure Google Analytics
6. ✅ Monitore erros com Sentry
7. ✅ Faça backup regular dos dados

**Sua loja está no ar! 🚀**

---

*Mantenha o sistema atualizado e monitore regularmente para garantir a melhor experiência aos seus clientes.*
