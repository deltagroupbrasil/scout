# 🚀 Setup Vercel via CLI

## Passo 1: Login no Vercel

Execute este comando e siga as instruções no navegador:

```bash
vercel login
```

Isso vai abrir o navegador para você fazer login.

---

## Passo 2: Conectar o Projeto

Execute este comando na pasta do projeto:

```bash
vercel link
```

Quando perguntar:
- **Set up and deploy**: Escolha **"No"** (já está deployado)
- **Link to existing project**: Escolha **"Yes"**
- **What's your project's name**: Digite **"leapscout"**

---

## Passo 3: Adicionar Variáveis de Ambiente

Copiei um script pronto para você. Execute:

```bash
npx tsx scripts/vercel-env-upload.ts
```

Este script vai adicionar automaticamente todas as variáveis de ambiente do arquivo `.env.vercel` no Vercel.

---

## Passo 4: Redeploy

Depois de adicionar as variáveis, faça redeploy:

```bash
vercel --prod
```

Ou pela interface do Vercel: Deployments → ... → Redeploy

---

## ⚡ ATALHO: Fazer tudo de uma vez

Se preferir, você pode executar tudo manualmente via Vercel CLI:

```bash
# 1. Login
vercel login

# 2. Link
vercel link

# 3. Adicionar variáveis (uma por uma)
vercel env add NEXTAUTH_URL production
# Cole: https://leapscout.vercel.app

vercel env add NEXTAUTH_SECRET production
# Cole: sZ1U0dKg9rHILK434GGY/ZJ3UAFyLALO22vw5b8NRvI=

vercel env add CLAUDE_API_KEY production
# Cole: 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

# ... e assim por diante para cada variável
```

---

## 🎯 Recomendação

**Use a interface web do Vercel** com "Bulk Edit" - é mais rápido:

1. Abra `.env.vercel`
2. Copie todo o conteúdo
3. Vá em: https://vercel.com/seu-projeto/settings/environment-variables
4. Clique em "Add New" → "Bulk"
5. Cole tudo
6. Save

Muito mais rápido que adicionar uma por uma via CLI!
