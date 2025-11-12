# Guia de Deploy - Vercel + PostgreSQL

Este guia cobre o deploy completo do LeapScout na Vercel com banco de dados PostgreSQL.

## 🎯 Pré-requisitos

- Conta na Vercel (https://vercel.com)
- Conta no GitHub (repositório já deve estar criado)
- PostgreSQL database (recomendado: Vercel Postgres, Supabase ou Neon)

## 📦 Checklist Pré-Deploy

### 1. Preparar o Repositório

- [ ] Commit de todas as alterações
- [ ] Push para o GitHub
- [ ] Verificar que `.env` está no `.gitignore` (não fazer commit de secrets!)
- [ ] Verificar que `.env.example` está atualizado com todas as variáveis necessárias

### 2. Preparar Banco de Dados PostgreSQL

**Opção A: Vercel Postgres (Recomendado)**
1. Acesse https://vercel.com/dashboard
2. Vá em "Storage" → "Create Database" → "Postgres"
3. Nome: `leapscout-db`
4. Region: East US (ou mais próximo do Brasil)
5. Copie a `DATABASE_URL` gerada

**Opção B: Supabase (Gratuito, 500MB)**
1. Acesse https://supabase.com
2. Crie novo projeto: "leapscout"
3. Vá em Settings → Database
4. Copie a "Connection String" (modo "Connection pooling")
5. Formato: `postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?pgbouncer=true`

**Opção C: Neon (Gratuito, serverless)**
1. Acesse https://neon.tech
2. Crie novo projeto: "leapscout"
3. Copie a connection string

### 3. Configurar Variáveis de Ambiente na Vercel

Acesse: Vercel Dashboard → Seu Projeto → Settings → Environment Variables

**Variáveis Obrigatórias:**

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/db?schema=public"

# NextAuth (IMPORTANTE: mudar em produção!)
NEXTAUTH_URL="https://seu-dominio.vercel.app"
NEXTAUTH_SECRET="[gerar novo secret com: openssl rand -base64 32]"

# Cron Job Protection
CRON_SECRET="[gerar novo secret aleatório]"

# API Keys (copiar do .env local ou criar novas)
CLAUDE_API_KEY="sk-ant-..."
HUNTER_IO_API_KEY="..."
```

**Variáveis Opcionais (para scraping):**

```bash
BRIGHT_DATA_PUPPETEER_URL="wss://..."
BRIGHT_DATA_UNLOCKER_KEY="..."
BRIGHT_DATA_SERP_KEY="..."
```

**⚠️ Importante:**
- Marcar todas como "Production", "Preview" e "Development"
- NUNCA commitar secrets no Git
- Gerar novos valores para `NEXTAUTH_SECRET` e `CRON_SECRET` em produção

## 🚀 Deploy na Vercel

### Passo 1: Conectar Repositório

1. Acesse https://vercel.com/new
2. Selecione o repositório GitHub: `leapscout`
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (ou deixar em branco)
   - **Build Command**: `npm run build` (padrão)
   - **Output Directory**: `.next` (padrão)
   - **Install Command**: `npm install` (padrão)

### Passo 2: Configurar Build Settings

Na seção "Environment Variables", adicionar todas as variáveis listadas acima.

**Build & Development Settings:**
- Node Version: 18.x (ou 20.x)
- Package Manager: npm

### Passo 3: Deploy

1. Clicar em "Deploy"
2. Aguardar build (3-5 minutos)
3. ✅ Deploy concluído!

## 🗄️ Migração do Banco de Dados

Após o primeiro deploy, você precisa executar as migrations do Prisma:

### Opção A: Via Vercel CLI (Recomendado)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Executar migrations em produção
vercel env pull .env.production
DATABASE_URL="[copiar da Vercel]" npx prisma migrate deploy
```

### Opção B: Manualmente via Prisma Studio

```bash
# Configurar DATABASE_URL local temporariamente
export DATABASE_URL="postgresql://[production-url]"

# Executar migrations
npx prisma migrate deploy

# Popular dados iniciais (opcional)
npm run db:seed
```

### Opção C: Via Script SQL direto

Se preferir, você pode executar o SQL diretamente no Supabase/Neon:

1. Acesse o Prisma Studio: `npx prisma studio`
2. Copie o schema SQL de `prisma/migrations/`
3. Execute no SQL Editor do seu provider

## ⚙️ Configurar Cron Jobs

O LeapScout usa Vercel Cron para scraping automático diário.

### 1. Verificar `vercel.json`

Arquivo já deve existir na raiz do projeto:

```json
{
  "crons": [
    {
      "path": "/api/cron/scrape-leads",
      "schedule": "0 6 * * *"
    }
  ]
}
```

Isso executa scraping todo dia às 6am UTC (3am Brasília).

### 2. Testar Endpoint Manualmente

```bash
curl -X GET https://seu-dominio.vercel.app/api/cron/scrape-leads \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

**Resposta esperada:**
```json
{
  "success": true,
  "leadsCreated": 15,
  "message": "Scraping completed successfully"
}
```

### 3. Monitorar Logs

Vercel Dashboard → Seu Projeto → Logs → Filtrar por "/api/cron"

## 📊 Verificações Pós-Deploy

### Checklist de Funcionalidades

- [ ] **Login funciona**: Acessar `/login` e fazer login
- [ ] **Dashboard carrega**: Ver leads no dashboard
- [ ] **CNPJ enrichment funciona**: Empresas têm CNPJ preenchido
- [ ] **Cache funciona**: Verificar `enrichment_cache` no banco
- [ ] **IA funciona**: Leads têm `suggestedContacts` e `triggers`
- [ ] **Cron job funciona**: Aguardar 6am ou testar manualmente
- [ ] **Export CSV funciona**: Baixar leads em CSV

### Comandos Úteis para Debug

```bash
# Ver logs em tempo real
vercel logs --follow

# Ver variáveis de ambiente
vercel env ls

# Ver builds
vercel ls

# Fazer rollback (se necessário)
vercel rollback
```

## 🔧 Troubleshooting Comum

### Erro: "Prisma Client não foi gerado"

**Solução:**
```bash
# Adicionar postinstall no package.json
"scripts": {
  "postinstall": "prisma generate"
}
```

Deploy novamente.

### Erro: "Database connection failed"

**Causas comuns:**
1. `DATABASE_URL` incorreta
2. Database não aceita conexões externas
3. SSL não configurado

**Solução:**
```bash
# Para PostgreSQL, adicionar ?sslmode=require na URL
DATABASE_URL="postgresql://...?sslmode=require"
```

### Erro: "Table does not exist"

**Causa:** Migrations não foram executadas

**Solução:**
```bash
DATABASE_URL="[production-url]" npx prisma migrate deploy
```

### Cron Job não executa

**Verificar:**
1. `vercel.json` está na raiz do projeto
2. Endpoint `/api/cron/scrape-leads/route.ts` existe
3. `CRON_SECRET` está configurado corretamente
4. Logs da Vercel mostram erros?

**Debug:**
```bash
# Testar endpoint manualmente
curl -X GET https://seu-app.vercel.app/api/cron/scrape-leads \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 🔐 Segurança em Produção

### Configurações Importantes

1. **Gerar novos secrets:**
```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# CRON_SECRET
openssl rand -hex 32
```

2. **Configurar CORS** (se necessário):
```typescript
// middleware.ts
export const config = {
  matcher: ['/api/:path*'],
}
```

3. **Rate Limiting**: Considerar Vercel Edge Config ou Upstash Redis

4. **Monitoring**: Configurar Vercel Analytics e Speed Insights

## 📈 Escalabilidade

### Limites do Plano Free da Vercel

- **Executions**: 100GB-hours/mês
- **Bandwidth**: 100GB/mês
- **Serverless Functions**: 10 segundos timeout
- **Cron Jobs**: Ilimitado (mas com timeout de 10s)

### Quando Escalar?

**Upgrade para Pro ($20/mês) quando:**
- Scraping demora > 10 segundos (timeout)
- Mais de 100GB bandwidth/mês
- Precisar de analytics avançado
- Precisar de mais de 1 cron job

### Alternativas de Database

| Provider | Free Tier | Limite | Latência |
|----------|-----------|--------|----------|
| Vercel Postgres | 256MB | 256MB storage | Baixa (mesma rede) |
| Supabase | 500MB | 500MB + 2GB transfer | Média |
| Neon | 512MB | Serverless, scaling automático | Média |
| Railway | $5 free | Após $5, paga por uso | Alta |

## 🎉 Deploy Completo!

Seu LeapScout está no ar!

**Próximos passos:**
1. Configurar domínio customizado (opcional)
2. Configurar SSL (Vercel faz automaticamente)
3. Adicionar mais empresas ao database de CNPJs
4. Monitorar logs e performance
5. Configurar backups do banco de dados

**Suporte:**
- Vercel Docs: https://vercel.com/docs
- Prisma Docs: https://www.prisma.io/docs
- Next.js Docs: https://nextjs.org/docs

---

**Última atualização:** 2025-01-12
