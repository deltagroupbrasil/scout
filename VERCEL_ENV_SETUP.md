# Configuração de Variáveis de Ambiente no Vercel

## ⚠️ IMPORTANTE: Adicione estas variáveis no Vercel

Acesse: https://vercel.com/seu-projeto/settings/environment-variables

### 1️⃣ Variáveis OBRIGATÓRIAS (sem isso o login NÃO funciona)

```bash
# NextAuth - Autenticação
NEXTAUTH_URL=https://leapscout.vercel.app
NEXTAUTH_SECRET=gere-um-secret-seguro-com-32-caracteres-minimo

# Database (já deve estar configurada pela integração Neon)
DATABASE_URL=postgresql://neondb_owner:npg_PL4yEHAcdvQ5@ep-calm-meadow-ady4ssjy-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### 2️⃣ Variáveis OPCIONAIS (para funcionalidades completas)

```bash
# Cron Jobs (scraping automático)
CRON_SECRET=gere-outro-secret-diferente-para-cron

# Claude AI (insights e detecção de eventos)
CLAUDE_API_KEY=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

# Bright Data - Scraping
BRIGHT_DATA_PUPPETEER_URL=wss://brd-customer-hl_95e68184-zone-scraping_browser1:y120tdyyqei9@brd.superproxy.io:9222
BRIGHT_DATA_UNLOCKER_KEY=eaa8204358199b680e57a721be02c161468cc57ad08a550e7aa219f1cbbc42e3
BRIGHT_DATA_SERP_KEY=eaa8204358199b680e57a721be02c161468cc57ad08a550e7aa219f1cbbc42e3
BRIGHT_DATA_WEB_UNLOCKER_URL=https://api.brightdata.com/request
BRIGHT_DATA_SERP_API_URL=https://api.brightdata.com/request

# Hunter.io (busca de emails)
HUNTER_IO_API_KEY=4519a60ee0fc5bd046325b1da934145875d0ddad

# Apollo.io (enriquecimento de contatos)
APOLLO_API_KEY=vzSDiook4Vsnwp1acn09cg

# Nova Vida TI (consultas CNPJ)
NOVA_VIDA_TI_USUARIO=regis@delta-mining.com
NOVA_VIDA_TI_SENHA=F2/!!iY%,w
NOVA_VIDA_TI_CLIENTE=DELTACOMPUTACAO
```

---

## 🔐 Como gerar NEXTAUTH_SECRET

Execute localmente:
```bash
openssl rand -base64 32
```

Ou use este site: https://generate-secret.vercel.app/32

---

## 📝 Passo a Passo no Vercel

1. Acesse: https://vercel.com/seu-projeto/settings/environment-variables
2. Para cada variável:
   - Clique em **"Add New"**
   - **Key**: Nome da variável (ex: `NEXTAUTH_SECRET`)
   - **Value**: Valor da variável
   - **Environments**: Selecione **Production**
3. Clique em **"Save"**
4. Depois de adicionar todas, faça um **Redeploy**:
   - Vá em **Deployments**
   - Clique nos 3 pontinhos do último deploy
   - Clique em **"Redeploy"**

---

## ✅ Ordem de Prioridade

**ADICIONE AGORA (para login funcionar):**
1. `NEXTAUTH_URL`
2. `NEXTAUTH_SECRET`
3. `DATABASE_URL` (já deve estar pela integração Neon)

**Adicione depois (para scraping funcionar):**
4. `CLAUDE_API_KEY`
5. `BRIGHT_DATA_*`
6. `HUNTER_IO_API_KEY`
7. `CRON_SECRET`

---

## 🔍 Como verificar se está funcionando

Após adicionar as variáveis e fazer redeploy:
1. Acesse: https://leapscout.vercel.app/login
2. Email: `admin@leapscout.com`
3. Senha: `LeapScout2025!`

Se o login funcionar, você verá o dashboard!
