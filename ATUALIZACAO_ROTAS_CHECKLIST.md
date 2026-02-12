# Atualização de Rotas - Verificação e Próximos Passos

**Status:** ✅ App.tsx atualizado com 50+ rotas  
**Data:** 12 de fevereiro de 2026

---

## 1. ROTAS ADICIONADAS ✅

### Categorias de Produtos (30 rotas)
```
✅ /kit-de-pneus
✅ /marcas
✅ /marcas/:marca
✅ /caminhonete-e-suv
✅ /caminhonete-e-suv/caminhonete
✅ /caminhonete-e-suv/suv
✅ /van-e-utilitario
✅ /moto
✅ /pneu-urbano
✅ /pneu-off-road
✅ /pneu-trail
✅ /moto/valvula
✅ /caminhao-e-onibus
✅ /agricola-e-otr
✅ /agricola-e-otr/agricola
✅ /agricola-e-otr/otr
✅ /shampoo-automotivo
✅ /camaras-de-ar
✅ /camaras-de-ar/aro-13 → /camaras-de-ar/aro-30 (10 rotas)
```

### Páginas Institucionais (5 rotas)
```
✅ /quem-somos
✅ /frete-e-entrega
✅ /pagamento
✅ /seguranca
✅ /depoimentos-de-clientes
```

### Políticas e Termos (6 rotas)
```
✅ /politica-de-troca-e-devolucao
✅ /politica-de-reembolso
✅ /politica-de-garantia
✅ /politica-de-privacidade
✅ /contato
✅ /terms
```

### Alternativas de Rotas
```
✅ /my-account/login (alternativa para /login)
✅ /cadastro (alternativa para /register)
✅ /central-do-cliente (alternativa para /account)
✅ /meus-pedidos (alternativa para /orders)
```

---

## 2. CHECKLIST DE VERIFICAÇÃO - LINKS NAVBAR

### Menu Principal - Precisa Verificar
- [ ] Logo aponta para `/`
- [ ] KIT DE PNEUS → `/kit-de-pneus`
- [ ] MARCAS → `/marcas` (com submenu para 45+ marcas)
- [ ] CAMINHONETE E SUV → `/caminhonete-e-suv`
  - [ ] Submenu: Caminhonete → `/caminhonete-e-suv/caminhonete`
  - [ ] Submenu: SUV → `/caminhonete-e-suv/suv`
- [ ] VAN E UTILITÁRIO → `/van-e-utilitario`
- [ ] MOTO → `/moto`
  - [ ] Submenu: Pneu Urbano → `/pneu-urbano`
  - [ ] Submenu: Pneu Off-Road → `/pneu-off-road`
  - [ ] Submenu: Pneu Trail → `/pneu-trail`
  - [ ] Submenu: Válvula → `/moto/valvula`
- [ ] CAMINHÃO E ÔNIBUS → `/caminhao-e-onibus`
- [ ] AGRÍCOLA E OTR → `/agricola-e-otr`
  - [ ] Submenu: Agrícola → `/agricola-e-otr/agricola`
  - [ ] Submenu: OTR → `/agricola-e-otr/otr`
- [ ] SHAMPOO AUTOMOTIVO → `/shampoo-automotivo`
- [ ] CÂMARAS DE AR → `/camaras-de-ar`
  - [ ] Submenu: Aro 13-30 → `/camaras-de-ar/aro-{n}`

### Header Top
- [ ] Meus Pedidos → `/meus-pedidos`
- [ ] Minha Conta → `/minha-conta`
- [ ] Entre → `/login`
- [ ] Cadastre-se → `/cadastro`

### Busca
- [ ] Formulário POST para `/produtos` ou `/products`

---

## 3. CHECKLIST DE VERIFICAÇÃO - LINKS FOOTER

### Institucional
- [ ] Quem somos → `/quem-somos`
- [ ] Segurança → `/seguranca`
- [ ] Frete e Entrega → `/frete-e-entrega`
- [ ] Pagamento → `/pagamento`
- [ ] Depoimento de Clientes → `/depoimentos-de-clientes`

### Ajuda
- [ ] Política de Troca e Devolução → `/politica-de-troca-e-devolucao`
- [ ] Política de Reembolso → `/politica-de-reembolso`
- [ ] Política de Garantia → `/politica-de-garantia`
- [ ] Política de Privacidade → `/politica-de-privacidade`
- [ ] Contato → `/contato`

### Minha Conta
- [ ] Login → `/login`
- [ ] Cadastre-se → `/cadastro`
- [ ] Meu Carrinho → `/carrinho`
- [ ] Meus Pedidos → `/meus-pedidos`

### Redes Sociais
- [ ] Facebook → https://www.facebook.com/usepneugreen?mibextid=LQQJ4d
- [ ] Instagram → https://www.instagram.com/pneugreen_
- [ ] WhatsApp → https://wa.me/37998464172

---

## 4. PRÓXIMOS PASSOS

### Fase 1: Verificar Navbar/Footer (Hoje)
```bash
# Verificar arquivo Navbar.tsx
# Verificar arquivo Footer.tsx
# Atualizar links para rotas corretas
# Testar navegação em todos os links
```

### Fase 2: Adicionar Filtros em ProductsPage (Hoje)
O `ProductsPage` agora recebe requisições de 30+ categorias diferentes.  
Precisa adicionar lógica para:
- [ ] Detectar a rota atual
- [ ] Filtrar produtos pela categoria
- [ ] Filtrar produtos pela marca (se rota = /marcas/:marca)
- [ ] Filtrar por aro (se rota = /camaras-de-ar/aro-{n})

### Fase 3: Testar Rotas (Hoje)
```bash
# Testar todas as rotas listadas acima
npm run dev

# 1. Clique em cada categoria no menu
# 2. Verifique se cada rota funciona
# 3. Verifique se cada página renderiza
# 4. Verifique se os links do footer funcionam
```

### Fase 4: Deploy (Amanhã)
```bash
git add .
git commit -m "feat: add 50 new routes for PneuGreen categories and info pages"
git push origin main
# Vercel fará deploy automático
```

---

## 5. INFORMAÇÕES IMPORTANTES

### Variáveis de Ambiente (.env.local)
```
VITE_API_URL=https://pneusprecojusto.vercel.app/api
VITE_SUPABASE_URL=https://lwtwfzeyggahoxofuwte.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### Banco de Dados - Tabelas Necessárias
```sql
-- Já devem existir
- products
- categories
- brands
- orders
- users

-- Podem precisar ser criadas/atualizadas
- tire_specs (para filtros por aro)
- tire_categories (Urbano, Off-Road, Trail)
```

### Links de Contato (Do HTML Base)
```
WhatsApp: (37) 99846-4172
Email: atendimento@pneugreen.com.br
Horário: Segunda a Sexta 7h às 17h:30
Endereço: Rua Joaquim Gomes Bernardes, 31
          Bairro Marília | Lagoa da Prata/MG
          CEP: 35592-276
```

---

## 6. OBSERVAÇÕES FINAIS

✅ **Completo:**
- App.tsx com todas as 50+ rotas
- Suporte para URLs alternativas (meus-pedidos, cadastro, etc)
- Fallback para homepage em caso de rota não encontrada

⚠️ **Pendente:**
- Verificar e atualizar Navbar.tsx
- Verificar e atualizar Footer.tsx
- Adicionar lógica de filtros em ProductsPage
- Implementar busca dinâmica por categoria
- Adicionar breadcrumbs para navegação

🔄 **Próxima Execução:**
Após commit, rodar `npm run dev` e testar cada rota manualmente.

