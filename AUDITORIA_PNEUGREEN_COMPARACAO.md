# Auditoria: Comparação PNEUSLOJA vs PneuGreen.com.br

**Data:** 12 de fevereiro de 2026  
**Status:** Análise em andamento

---

## 1. ROTAS FALTANTES NA APLICAÇÃO

### 1.1 Categorias de Produtos (CRÍTICO)

| Rota | Status | Descrição |
|------|--------|-----------|
| `/kit-de-pneus` | ❌ Faltante | Kit de Pneus |
| `/marcas` | ❌ Faltante | Página de todas as marcas |
| `/marcas/:marca` | ❌ Faltante | Produtos de marca específica |
| `/caminhonete-e-suv` | ❌ Faltante | Categoria Caminhonete e SUV |
| `/caminhonete-e-suv/caminhonete` | ❌ Faltante | Subcategoria Caminhonete |
| `/caminhonete-e-suv/suv` | ❌ Faltante | Subcategoria SUV |
| `/van-e-utilitario` | ❌ Faltante | Categoria Van e Utilitário |
| `/moto` | ❌ Faltante | Categoria Moto |
| `/pneu-urbano` | ❌ Faltante | Pneu Urbano (Moto) |
| `/pneu-off-road` | ❌ Faltante | Pneu Off-Road (Moto) |
| `/pneu-trail` | ❌ Faltante | Pneu Trail (Moto) |
| `/moto/valvula` | ❌ Faltante | Válvulas para Moto |
| `/caminhao-e-onibus` | ❌ Faltante | Categoria Caminhão e Ônibus |
| `/agricola-e-otr` | ❌ Faltante | Categoria Agrícola e OTR |
| `/agricola-e-otr/agricola` | ❌ Faltante | Subcategoria Agrícola |
| `/agricola-e-otr/otr` | ❌ Faltante | Subcategoria OTR |
| `/shampoo-automotivo` | ❌ Faltante | Categoria Shampoo Automotivo |
| `/camaras-de-ar` | ❌ Faltante | Categoria Câmaras de Ar |
| `/camaras-de-ar/aro-13` a `/aro-30` | ❌ Faltante | Câmaras por aro (8 variações) |

### 1.2 Páginas Institucionais (IMPORTANTE)

| Rota | Status | Descrição |
|------|--------|-----------|
| `/quem-somos` | ❌ Faltante | Sobre a empresa |
| `/seguranca` | ❌ Faltante | Informações de segurança |
| `/frete-e-entrega` | ❌ Faltante | Informações de frete |
| `/pagamento` | ❌ Faltante | Métodos de pagamento |
| `/depoimentos-de-clientes` | ❌ Faltante | Depoimentos e reviews |

### 1.3 Páginas de Ajuda/Políticas (IMPORTANTE)

| Rota | Status | Descrição |
|------|--------|-----------|
| `/politica-de-troca-e-devolucao` | ❌ Faltante | Política de Troca e Devolução |
| `/politica-de-reembolso` | ❌ Faltante | Política de Reembolso |
| `/politica-de-garantia` | ❌ Faltante | Política de Garantia |
| `/politica-de-privacidade` | ❌ Faltante | Privacidade |
| `/contato` | ❌ Faltante | Formulário de Contato |
| `/minha-conta` | ⚠️ Parcial | Redirecionado como `/account` |

### 1.4 Rotas Existentes vs Site Base

| Rota Atual | Rota Base | Status |
|-----------|-----------|--------|
| `/login` | `/my-account/login` | ✅ Alternativa OK |
| `/register` | `/cadastro` | ✅ Alternativa OK |
| `/products` | `/produtos` | ✅ Ambas existem |
| `/carrinho` | `/cart` | ✅ Ambas existem |
| `/checkout` | N/A | ✅ Existe |
| `/account` | N/A | ✅ Existe |
| `/orders` | `/meus-pedidos` | ❌ Rota diferente |
| `/dashboard` | N/A | ✅ Rota Admin |

---

## 2. COMPONENTES CRÍTICOS VERIFICADOS

### 2.1 Navbar
- ❌ Menu de categorias incompleto
- ⚠️ Faltam submenus para marcas
- ⚠️ Faltam links institucionais no footer
- ⚠️ Faltam links de políticas

### 2.2 Footer
- ⚠️ Todos os links de políticas apontam para `/`
- ⚠️ Link de "Quem somos" não existe
- ⚠️ Links de pagamento/frete não atualizam dados reais
- ⚠️ Seção de redes sociais incompleta

### 2.3 HomePage
- ✅ Banners existe (verifica)
- ✅ Busca por medida existe
- ✅ Produtos destaque existem
- ✅ Produtos mais vendidos existem
- ⚠️ Newsletter não está funcional
- ⚠️ Contato WhatsApp precisa verificar

---

## 3. PROBLEMAS ENCONTRADOS

### Prioridade CRÍTICA
1. **Falta de 20+ rotas de categorias** - Produtos não podem ser filtrados por categoria
2. **Páginas institucionais ausentes** - Prejudica SEO e experiência do usuário
3. **Links quebrados no Footer** - Todas as políticas apontam para `/`

### Prioridade ALTA
1. **Navbar incompleta** - Menu não reflete estrutura do site real
2. **Submenus faltando** - Usuários não conseguem navegar marcas
3. **Redirecionamentos inconsistentes** - `/meus-pedidos` vs `/orders`

### Prioridade MÉDIA
1. **Newsletter** - Formulário existente mas não funcional
2. **Formulário de Contato** - Não existe rota `/contato`
3. **Integração WhatsApp** - Apenas botão, sem formulário backend

---

## 4. PLANO DE AÇÃO

### Fase 1: Rotas e Páginas (Dia 1)
- [ ] Criar todas as 20+ páginas de categoria
- [ ] Criar páginas institucionais (5 páginas)
- [ ] Criar páginas de políticas (5 páginas)
- [ ] Atualizar App.tsx com todas as rotas

### Fase 2: Componentes (Dia 1)
- [ ] Atualizar Navbar com menu completo
- [ ] Atualizar Footer com links corretos
- [ ] Criar navegação por categorias

### Fase 3: Integração (Dia 2)
- [ ] Conectar categorias ao banco de dados
- [ ] Implementar filtros por marca
- [ ] Adicionar filtros por aro
- [ ] Testar redirecionamentos

### Fase 4: Otimização (Dia 2)
- [ ] Verificar SEO meta tags
- [ ] Validar URLs amigáveis
- [ ] Testar navegação completa
- [ ] Deploy final

---

## 5. CHECKLIST DE COMPARAÇÃO

### Estrutura HTML Base (PneuGreen)

**Header:**
- [x] Logo e navegação
- [x] Busca
- [x] Carrinho
- [x] Login/Cadastro
- [x] Top bar com informações

**Menu Principal:**
- [ ] KIT DE PNEUS
- [ ] MARCAS (com submenu de 45+ marcas)
- [ ] CAMINHONETE E SUV (com submenu)
- [ ] VAN E UTILITÁRIO
- [ ] MOTO (com submenu)
- [ ] CAMINHÃO E ÔNIBUS
- [ ] AGRÍCOLA E OTR (com submenu)
- [ ] SHAMPOO AUTOMOTIVO
- [ ] CÂMARAS DE AR (com submenu por aro)

**Página Home:**
- [x] Banner carousel
- [x] Busca por medida
- [x] Produtos mais vendidos
- [x] Produtos destaque
- [ ] Banner de frete grátis
- [ ] Newsletter (não funcional)

**Footer:**
- [ ] Entre em Contato (incompleto)
- [ ] Institucional (quebrado)
- [ ] Ajuda (quebrado)
- [ ] Minha Conta
- [ ] Meios de pagamento
- [ ] Selos de segurança

---

## 6. RECOMENDAÇÕES

1. **Implementar categorias dinamicamente** - Buscar do banco de dados
2. **Criar páginas genéricas para categorias** - Reutilizar componentes
3. **Adicionar breadcrumbs** - Melhorar navegação
4. **Implementar 404 page** - Para rotas não encontradas
5. **Adicionar sitemap.xml** - Para SEO
6. **Configurar redirects** - Para URLs antigas

---

**Próximos passos:** Implementar todas as rotas faltantes e páginas
