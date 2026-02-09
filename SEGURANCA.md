# 🔐 SEGURANÇA E BOAS PRÁTICAS - PneuStore

## ✅ Medidas de Segurança Implementadas

### 1. Proteção de Dados Sensíveis

#### API Keys
- ✅ **Nunca expostas no código**: Todas as chaves estão em variáveis de ambiente
- ✅ **Arquivo .env no .gitignore**: Não são commitadas no repositório
- ✅ **Validação de existência**: Sistema verifica se a chave está configurada antes de usar

```typescript
// src/services/blackcat.ts
const apiKey = import.meta.env.VITE_BLACKCAT_API_KEY;
if (!apiKey) {
  throw new Error('Black Cat Payments não foi inicializado');
}
```

#### Dados de Cartão
- ✅ **Validação de Luhn**: Algoritmo implementado para validar número de cartão
- ✅ **Sanitização**: Remoção de espaços e caracteres especiais antes de enviar
- ✅ **Não armazenados**: Dados do cartão nunca são salvos localmente
- ✅ **HTTPS obrigatório**: Comunicação criptografada com API

```typescript
// Validação de cartão
private validateCardNumber(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\s/g, '');
  // Algoritmo de Luhn implementado
}
```

### 2. Validação de CPF

- ✅ **Algoritmo completo**: Validação dos dois dígitos verificadores
- ✅ **Rejeita sequências**: CPFs como 111.111.111-11 são rejeitados
- ✅ **Formatação automática**: Máscara aplicada no input

```typescript
// Validação de CPF
private validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  // Validação dos dígitos verificadores
}
```

### 3. Autenticação e Autorização

#### Sistema de Login
- ✅ **Persistência segura**: Dados salvos no localStorage com Zustand
- ✅ **Verificação de sessão**: Checagem em todas as rotas protegidas
- ✅ **Logout limpo**: Remove todos os dados da sessão

```typescript
// src/app/stores/auth.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      // ...
    }),
    { name: 'auth-storage' }
  )
);
```

#### Proteção de Rotas
- ✅ **Dashboard protegido**: Apenas admins podem acessar
- ✅ **Redirecionamento automático**: Usuários não autorizados são redirecionados
- ✅ **Verificação de role**: Sistema de permissões por tipo de usuário

```typescript
// src/app/pages/DashboardPage.tsx
if (!isAuthenticated || user?.role !== 'admin') {
  navigate('/');
  return null;
}
```

### 4. Sanitização de Inputs

#### Máscaras de Entrada
- ✅ **CPF**: 000.000.000-00
- ✅ **Telefone**: (00) 00000-0000
- ✅ **CEP**: 00000-000
- ✅ **Cartão**: 0000 0000 0000 0000

```typescript
// Exemplo de máscara de CPF
const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};
```

#### Limpeza de Dados
- ✅ **Remoção de caracteres especiais**: Antes de enviar para API
- ✅ **Validação de formato**: Verificação de padrões esperados
- ✅ **Prevenção de XSS**: React escapa automaticamente strings

### 5. Gerenciamento de Estado

#### Zustand com Persistência
- ✅ **Dados do carrinho salvos**: Não se perdem ao recarregar
- ✅ **Autenticação persistente**: Usuário permanece logado
- ✅ **Produtos em cache**: Melhor performance

```typescript
// Persistência configurada
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      // ...
    }),
    { name: 'cart-storage' }
  )
);
```

### 6. Comunicação com API

#### Axios Interceptors
- ✅ **Autenticação automática**: Bearer token adicionado em todas as requisições
- ✅ **Tratamento de erros**: Logs e mensagens amigáveis
- ✅ **Timeout configurado**: 30 segundos para evitar travamentos

```typescript
// src/services/blackcat.ts
this.client.interceptors.request.use(
  (config) => {
    config.headers.Authorization = `Bearer ${this.apiKey}`;
    return config;
  }
);
```

---

## 🛡️ Boas Práticas de Segurança

### Para Desenvolvimento

1. **Nunca commite o arquivo .env**
   ```bash
   # Adicione ao .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Use variáveis de ambiente diferentes por ambiente**
   ```env
   # Desenvolvimento
   VITE_BLACKCAT_ENV=sandbox
   
   # Produção
   VITE_BLACKCAT_ENV=production
   ```

3. **Mantenha dependências atualizadas**
   ```bash
   npm audit
   npm update
   ```

### Para Produção

1. **HTTPS Obrigatório**
   - Configure SSL/TLS no servidor
   - Redirecione HTTP para HTTPS
   - Use certificados válidos

2. **Variáveis de Ambiente Seguras**
   - Use serviços como Vercel, Netlify ou AWS Secrets Manager
   - Nunca exponha chaves no código
   - Rotacione chaves periodicamente

3. **Monitoramento**
   - Configure logs de transações
   - Monitore tentativas de acesso não autorizado
   - Alerte sobre erros de pagamento

4. **Backup**
   - Faça backup regular dos dados
   - Teste restauração de backup
   - Mantenha backups em local seguro

---

## 🔍 Checklist de Segurança

### Antes do Deploy

- [ ] Arquivo .env não está no repositório
- [ ] API Keys de produção configuradas
- [ ] HTTPS configurado no servidor
- [ ] Certificado SSL válido
- [ ] Testes de pagamento realizados
- [ ] Validações de formulário funcionando
- [ ] Rotas protegidas testadas
- [ ] Logs de erro configurados

### Manutenção Contínua

- [ ] Atualizar dependências mensalmente
- [ ] Revisar logs de erro semanalmente
- [ ] Testar fluxo de pagamento mensalmente
- [ ] Verificar certificado SSL (renovação)
- [ ] Rotacionar API Keys a cada 6 meses
- [ ] Fazer backup dos dados semanalmente

---

## 🚨 O Que NÃO Fazer

### ❌ Nunca faça isso:

1. **Não exponha API Keys no código**
   ```typescript
   // ❌ ERRADO
   const apiKey = "sk_live_123456789";
   
   // ✅ CORRETO
   const apiKey = import.meta.env.VITE_BLACKCAT_API_KEY;
   ```

2. **Não armazene dados sensíveis no localStorage**
   ```typescript
   // ❌ ERRADO
   localStorage.setItem('cardNumber', '1234567890123456');
   
   // ✅ CORRETO
   // Nunca armazene dados de cartão
   ```

3. **Não desabilite validações**
   ```typescript
   // ❌ ERRADO
   if (true) { // Pula validação
     processPayment();
   }
   
   // ✅ CORRETO
   if (validateCPF(cpf) && validateCard(card)) {
     processPayment();
   }
   ```

4. **Não ignore erros de API**
   ```typescript
   // ❌ ERRADO
   try {
     await api.post('/payment');
   } catch (error) {
     // Ignora erro
   }
   
   // ✅ CORRETO
   try {
     await api.post('/payment');
   } catch (error) {
     console.error('Payment error:', error);
     showErrorMessage(error.message);
   }
   ```

---

## 📞 Suporte de Segurança

**Encontrou uma vulnerabilidade?**
- Reporte imediatamente para: security@pneustore.com.br
- Não divulgue publicamente antes da correção
- Aguarde confirmação da equipe

**Dúvidas sobre segurança?**
- Consulte a documentação do Black Cat: https://docs.blackcatpagamentos.online/security
- Entre em contato com o suporte: suporte@blackcatpagamentos.online

---

## 🎓 Recursos Adicionais

### Documentação Recomendada

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PCI DSS Compliance](https://www.pcisecuritystandards.org/)
- [React Security Best Practices](https://reactjs.org/docs/security.html)
- [Black Cat Security Docs](https://docs.blackcatpagamentos.online/security)

### Ferramentas de Segurança

- **npm audit**: Verifica vulnerabilidades em dependências
- **Snyk**: Monitoramento contínuo de segurança
- **HTTPS Checker**: Valida configuração SSL
- **Lighthouse**: Auditoria de segurança e performance

---

**Segurança é prioridade! 🔒**

*Mantenha seu sistema e seus clientes protegidos seguindo estas práticas.*
