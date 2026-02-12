# 🔧 GUIA DE MANUTENÇÃO - PneuStore

## 📅 Rotinas de Manutenção

---

## 🔄 MANUTENÇÃO DIÁRIA

### Monitoramento
- [ ] Verificar se o site está no ar
- [ ] Checar logs de erro
- [ ] Verificar transações do dia
- [ ] Responder dúvidas de clientes

### Produtos
- [ ] Atualizar estoque de produtos vendidos
- [ ] Verificar produtos com estoque baixo
- [ ] Adicionar novos produtos (se houver)

**Tempo estimado**: 15-30 minutos

---

## 📊 MANUTENÇÃO SEMANAL

### Análise de Dados
- [ ] Revisar vendas da semana
- [ ] Identificar produtos mais vendidos
- [ ] Verificar taxa de conversão
- [ ] Analisar abandono de carrinho

### Conteúdo
- [ ] Atualizar preços (se necessário)
- [ ] Adicionar promoções
- [ ] Revisar descrições de produtos
- [ ] Atualizar imagens (se necessário)

### Técnico
- [ ] Verificar performance do site
- [ ] Checar tempo de carregamento
- [ ] Revisar logs de erro
- [ ] Testar fluxo de compra

**Tempo estimado**: 1-2 horas

---

## 🗓️ MANUTENÇÃO MENSAL

### Segurança
- [ ] Atualizar dependências
- [ ] Verificar vulnerabilidades (`npm audit`)
- [ ] Revisar logs de acesso
- [ ] Testar backup e restauração

### Performance
- [ ] Executar Lighthouse audit
- [ ] Otimizar imagens grandes
- [ ] Limpar cache desnecessário
- [ ] Verificar tamanho do bundle

### Conteúdo
- [ ] Revisar todos os produtos
- [ ] Atualizar informações da loja
- [ ] Verificar links quebrados
- [ ] Atualizar FAQ (se houver)

### Financeiro
- [ ] Reconciliar transações
- [ ] Verificar taxas do Black Cat
- [ ] Analisar custos de hospedagem
- [ ] Gerar relatório de vendas

**Tempo estimado**: 3-4 horas

---

## 📦 ATUALIZAÇÃO DE DEPENDÊNCIAS

### Verificar Atualizações

```bash
# Ver pacotes desatualizados
npm outdated

# Verificar vulnerabilidades
npm audit
```

### Atualizar Pacotes

```bash
# Atualizar pacotes menores (patch)
npm update

# Atualizar pacotes maiores (minor/major)
npm install react@latest react-dom@latest

# Corrigir vulnerabilidades
npm audit fix
```

### Testar Após Atualização

```bash
# Limpar cache
rm -rf node_modules package-lock.json

# Reinstalar
npm install

# Testar localmente
npm run dev

# Build de produção
npm run build

# Testar build
npm run preview
```

---

## 🛠️ TAREFAS COMUNS

### 1. Adicionar Novo Produto

**Arquivo**: `src/app/stores/tires.ts`

```typescript
// Adicione no array mockTires
{
  id: 'novo-id-unico',
  brand: 'Marca',
  model: 'Modelo',
  width: '205',
  profile: '55',
  diameter: '16',
  loadIndex: '91',
  speedRating: 'V',
  price: 649.90,
  oldPrice: 749.90, // opcional
  stock: 25,
  image: 'https://url-da-imagem.jpg',
  features: ['Característica 1', 'Característica 2'],
  category: 'passeio',
  season: 'all-season',
  runflat: false,
  featured: true, // destaque na homepage
  description: 'Descrição do produto',
}
```

### 2. Alterar Cores do Site

**Arquivo**: `src/styles/theme.css`

```css
:root {
  /* Cores principais */
  --primary: #FF6B35;    /* Laranja */
  --secondary: #004E89;  /* Azul */
  --accent: #F7B801;     /* Amarelo */
  
  /* Cores de estado */
  --success: #00C853;
  --error: #FF5252;
  --warning: #FFC107;
  --info: #2196F3;
  
  /* Cores neutras */
  --gray-50: #fafafa;
  --gray-100: #f5f5f5;
  --gray-200: #eeeeee;
  --gray-300: #e0e0e0;
  --gray-400: #bdbdbd;
  --gray-500: #9e9e9e;
  --gray-600: #757575;
  --gray-700: #616161;
  --gray-800: #424242;
  --gray-900: #212121;
}
```

### 3. Alterar Informações da Loja

**Arquivo**: `.env`

```env
VITE_STORE_NAME=Nome da Sua Loja
VITE_STORE_CNPJ=00.000.000/0000-00
VITE_STORE_PHONE=(11) 99999-9999
VITE_STORE_EMAIL=contato@sualoja.com.br
VITE_STORE_ADDRESS=Seu Endereço Completo
```

**Arquivo**: `src/app/pages/DashboardPage.tsx`

Edite a seção de configurações para usar as variáveis de ambiente.

### 4. Adicionar Nova Categoria

**Arquivo**: `src/app/stores/tires.ts`

```typescript
// Adicione o novo tipo na interface
export interface Tire {
  // ...
  category: 'passeio' | 'suv' | 'caminhonete' | 'van' | 'moto' | 'caminhao'; // adicione aqui
  // ...
}
```

**Arquivo**: `src/app/pages/HomePage.tsx`

Adicione o card da nova categoria na seção de categorias.

### 5. Alterar Número de Parcelas

**Arquivo**: `src/app/pages/CheckoutPage.tsx`

```typescript
// Procure por:
{Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
  // ...
))}

// Altere 12 para o número desejado
{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
  // ...
))}
```

---

## 🐛 RESOLUÇÃO DE PROBLEMAS

### Problema: Site não carrega

**Diagnóstico:**
```bash
# Verificar se o servidor está rodando
npm run dev

# Verificar logs de erro
# Abra o console do navegador (F12)
```

**Solução:**
1. Limpar cache do navegador
2. Limpar node_modules e reinstalar
3. Verificar se a porta 5173 está livre
4. Verificar variáveis de ambiente

### Problema: Pagamento não funciona

**Diagnóstico:**
```bash
# Verificar se a API Key está configurada
cat .env | grep BLACKCAT

# Verificar logs no console
# Abra o console do navegador (F12)
```

**Solução:**
1. Verificar se a API Key está correta
2. Verificar se o ambiente está correto (production/sandbox)
3. Testar com dados de teste do Black Cat
4. Verificar conexão com a internet
5. Verificar se a API Black Cat está online

### Problema: Produtos não aparecem

**Diagnóstico:**
```bash
# Verificar se os produtos estão no store
# Abra o console do navegador (F12)
# Digite: localStorage.getItem('tire-storage')
```

**Solução:**
1. Limpar localStorage: `localStorage.clear()`
2. Recarregar a página
3. Verificar se os produtos estão em `src/app/stores/tires.ts`
4. Verificar se há erros no console

### Problema: Dashboard não abre

**Diagnóstico:**
```bash
# Verificar se está logado como admin
# Abra o console do navegador (F12)
# Digite: localStorage.getItem('auth-storage')
```

**Solução:**
1. Fazer login com email contendo "admin"
2. Verificar se o usuário tem role 'admin'
3. Limpar cache e fazer login novamente

---

## 📈 OTIMIZAÇÃO CONTÍNUA

### Performance

```bash
# Analisar bundle size
npm run build
# Verifique o tamanho dos arquivos em dist/

# Executar Lighthouse
# Abra o Chrome DevTools (F12)
# Vá em Lighthouse
# Execute audit
```

### SEO

```bash
# Verificar meta tags
# Abra o código fonte da página (Ctrl+U)
# Verifique se todas as meta tags estão presentes
```

### Acessibilidade

```bash
# Testar navegação por teclado
# Use Tab para navegar
# Use Enter para clicar
# Use Esc para fechar modais
```

---

## 💾 BACKUP

### Backup Manual

```bash
# Backup do código
git push origin main

# Backup do banco de dados (se houver)
# Depende do seu banco de dados

# Backup de imagens
# Copie a pasta de imagens para um local seguro
```

### Backup Automático

Configure backup automático na sua plataforma de hospedagem:

- **Vercel**: Automático via Git
- **Netlify**: Automático via Git
- **AWS**: Configure AWS Backup

---

## 📊 RELATÓRIOS

### Relatório Semanal

- Total de vendas
- Produtos mais vendidos
- Taxa de conversão
- Abandono de carrinho
- Novos clientes

### Relatório Mensal

- Receita total
- Crescimento vs mês anterior
- Produtos mais lucrativos
- Análise de estoque
- Custos operacionais

---

## 🔐 SEGURANÇA

### Checklist Mensal

- [ ] Atualizar dependências
- [ ] Verificar vulnerabilidades
- [ ] Revisar logs de acesso
- [ ] Testar backup
- [ ] Verificar certificado SSL
- [ ] Revisar permissões de usuários

### Em Caso de Incidente

1. **Identificar o problema**
   - Verificar logs
   - Identificar a causa

2. **Conter o problema**
   - Desativar funcionalidade afetada
   - Notificar usuários (se necessário)

3. **Resolver**
   - Aplicar correção
   - Testar solução

4. **Documentar**
   - Registrar o incidente
   - Documentar a solução
   - Prevenir recorrência

---

## 📞 SUPORTE

### Recursos

- **Documentação**: Consulte os arquivos .md na raiz do projeto
- **Black Cat**: suporte@blackcatpagamentos.online
- **Comunidade React**: https://react.dev/community
- **Stack Overflow**: https://stackoverflow.com/questions/tagged/reactjs

### Contatos de Emergência

- **Hospedagem**: Suporte da sua plataforma
- **Pagamentos**: Black Cat Payments
- **DNS**: Seu provedor de domínio

---

## 📝 LOG DE MANUTENÇÃO

Mantenha um registro de todas as manutenções:

```
Data: 15/01/2025
Tipo: Atualização
Descrição: Atualizado React para versão 18.3.2
Responsável: Nome
Status: Concluído
Observações: Sem problemas

---

Data: 20/01/2025
Tipo: Correção
Descrição: Corrigido bug no filtro de preços
Responsável: Nome
Status: Concluído
Observações: Testado em produção

---
```

---

## ✅ CHECKLIST DE MANUTENÇÃO

### Diário
- [ ] Site está no ar
- [ ] Sem erros críticos
- [ ] Transações processadas

### Semanal
- [ ] Análise de vendas
- [ ] Atualização de preços
- [ ] Teste de fluxo de compra

### Mensal
- [ ] Atualização de dependências
- [ ] Auditoria de segurança
- [ ] Relatório de performance
- [ ] Backup testado

### Trimestral
- [ ] Revisão completa do código
- [ ] Atualização de documentação
- [ ] Planejamento de melhorias
- [ ] Análise de ROI

---

**Mantenha seu sistema sempre atualizado e seguro! 🔒**

*Manutenção preventiva é melhor que correção de problemas.*
