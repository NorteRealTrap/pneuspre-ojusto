# 📸 GUIA VISUAL - EXECUTAR SQL NO SUPABASE

## PASSO 1: Acessar Supabase Dashboard

```
URL: https://supabase.com/dashboard
```

Você verá a tela de login. Faça login com sua conta.

---

## PASSO 2: Selecionar Projeto

Após login, você verá seus projetos.

Clique no projeto: **pneus-precojusto**

---

## PASSO 3: Abrir SQL Editor

No menu esquerdo, procure por:

```
SQL Editor
```

Clique nele.

---

## PASSO 4: Criar Nova Query

Você verá um botão:

```
+ New Query
```

Clique nele.

---

## PASSO 5: Copiar SQL

Abra o arquivo: `SUPABASE_SQL_PRONTO.sql`

Copie TODO o conteúdo (Ctrl+A, Ctrl+C)

---

## PASSO 6: Colar no Supabase

Na janela do SQL Editor, cole o SQL (Ctrl+V)

Você verá o SQL aparecer na tela.

---

## PASSO 7: Executar

Procure pelo botão:

```
Run
```

Ou pressione: **Ctrl+Enter**

---

## PASSO 8: Verificar Resultado

Se tudo correu bem, você verá:

```
✅ Success
```

Se houver erro, você verá:

```
❌ Error: ...
```

---

## ✅ PRONTO!

Se recebeu "Success", o banco de dados foi criado com sucesso!

Agora você pode rodar:

```bash
npm install
npm run dev
```

---

## 🆘 PROBLEMAS?

### Erro: "relation already exists"
- Significa que as tabelas já foram criadas
- Você pode ignorar ou deletar as tabelas e rodar novamente

### Erro: "permission denied"
- Verifique se você está logado com a conta correta
- Verifique se o projeto é seu

### Erro: "syntax error"
- Copie o SQL de `SUPABASE_SQL_PRONTO.sql`
- Não modifique nada
- Cole exatamente como está

---

**Status:** ✅ Pronto para usar
