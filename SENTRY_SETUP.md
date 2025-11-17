# Configuração do Sentry - Error Tracking

Este guia explica como configurar o Sentry para monitoramento de erros em produção.

## 🎯 Por Que Sentry?

- ✅ **Monitoramento em tempo real**: Erros reportados instantaneamente
- ✅ **Stack traces completos**: Contexto completo do erro
- ✅ **Breadcrumbs**: Passos que levaram ao erro
- ✅ **Session Replay**: Ver o que o usuário fez antes do erro
- ✅ **Performance Monitoring**: Identificar queries lentas
- ✅ **Alerts**: Notificações via email/Slack quando erros ocorrem
- ✅ **Free Tier**: 5.000 errors/mês grátis

---

## 📋 Passo 1: Criar Conta Sentry

1. Acesse [sentry.io](https://sentry.io)
2. Crie conta gratuita (GitHub/Google)
3. Crie nova organização: "LeapScout" (ou seu nome)
4. Crie novo projeto:
   - **Platform**: Next.js
   - **Name**: leapscout-prod
   - **Alert Frequency**: Default

---

## 📋 Passo 2: Obter DSN

Após criar o projeto, você verá o **DSN** (Data Source Name):

```
https://xxxxxxxxxxxxxxxxxxxxx@o123456.ingest.sentry.io/7891011
```

Este DSN é a chave de conexão entre sua aplicação e o Sentry.

---

## 📋 Passo 3: Configurar Variáveis de Ambiente

### Desenvolvimento (.env.local)

```env
# Sentry (opcional em dev, mas recomendado para testar)
SENTRY_DSN="https://xxxxx@o123456.ingest.sentry.io/7891011"
NEXT_PUBLIC_SENTRY_DSN="https://xxxxx@o123456.ingest.sentry.io/7891011"

# Auth Token (para upload de source maps - opcional em dev)
SENTRY_AUTH_TOKEN=""
SENTRY_ORG="leapscout"
SENTRY_PROJECT="leapscout-prod"
```

### Produção (Vercel/Railway)

No painel de deploy, adicione:

```env
SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/7891011
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@o123456.ingest.sentry.io/7891011
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxx
SENTRY_ORG=leapscout
SENTRY_PROJECT=leapscout-prod
```

**Como obter Auth Token:**
1. Vá em [sentry.io/settings/account/api/auth-tokens/](https://sentry.io/settings/account/api/auth-tokens/)
2. Crie novo token com permissões:
   - `project:read`
   - `project:releases`
   - `org:read`
3. Copie o token (começa com `sntrys_`)

---

## 📋 Passo 4: Verificar Configuração

Os arquivos de configuração já foram criados:
- ✅ `sentry.client.config.ts` (erros do browser)
- ✅ `sentry.server.config.ts` (erros do servidor/API)
- ✅ `sentry.edge.config.ts` (erros de Edge Runtime)
- ✅ `lib/error-tracking.ts` (helpers customizados)

---

## 🧪 Passo 5: Testar

### Teste 1: Error no Cliente

Crie uma página de teste (`app/test-sentry/page.tsx`):

```typescript
'use client'

export default function TestSentry() {
  const throwError = () => {
    throw new Error('Teste de erro do cliente!')
  }

  return (
    <div className="p-8">
      <button
        onClick={throwError}
        className="px-4 py-2 bg-red-500 text-white rounded"
      >
        Disparar Erro de Teste
      </button>
    </div>
  )
}
```

Acesse `http://localhost:3000/test-sentry` e clique no botão.

Verifique no Sentry: [sentry.io/organizations/leapscout/issues/](https://sentry.io/organizations/leapscout/issues/)

### Teste 2: Error no Servidor

Crie API route de teste (`app/api/test-sentry/route.ts`):

```typescript
import { NextResponse } from 'next/server'
import { captureError } from '@/lib/error-tracking'

export async function GET() {
  try {
    throw new Error('Teste de erro do servidor!')
  } catch (error) {
    captureError(error as Error, {
      apiEndpoint: '/api/test-sentry',
      testMode: true,
    })
    return NextResponse.json({ error: 'Erro capturado!' }, { status: 500 })
  }
}
```

Acesse `http://localhost:3000/api/test-sentry`.

### Teste 3: Error com Contexto

```typescript
import { captureScrapingError } from '@/lib/error-tracking'

try {
  // Simular erro de scraping
  throw new Error('Timeout ao fazer scraping do LinkedIn')
} catch (error) {
  captureScrapingError(
    error as Error,
    'linkedin',
    'CFO São Paulo',
    {
      timeout: 30000,
      jobsFound: 0,
      attemptNumber: 3,
    }
  )
}
```

---

## 📊 Passo 6: Configurar Alerts

1. Vá em **Alerts** → **Create Alert Rule**
2. Configure:
   - **When**: An issue is first seen
   - **If**: Event type: Error
   - **Then**: Send notification via Email/Slack

Alertas recomendados:
- ✅ **First Error**: Quando um erro novo aparece
- ✅ **Spike**: Quando erros aumentam 100% em 1h
- ✅ **Critical**: Quando erro afeta >10 usuários/min

---

## 📈 Passo 7: Performance Monitoring (Opcional)

Para monitorar performance de queries e API calls:

```typescript
import * as Sentry from '@sentry/nextjs'

const transaction = Sentry.startTransaction({
  name: 'scraping-linkedin-jobs',
  op: 'scraping',
})

try {
  // Operação lenta
  const jobs = await linkedInScraper.scrapeJobs(query)

  transaction.setStatus('ok')
} catch (error) {
  transaction.setStatus('internal_error')
  throw error
} finally {
  transaction.finish()
}
```

---

## 🔍 Passo 8: Source Maps (Produção)

Source maps permitem ver o código original (não minificado) no Sentry.

### Automaticamente (Recomendado)

O Sentry SDK faz upload automático se `SENTRY_AUTH_TOKEN` estiver configurado.

### Manualmente (caso necessário)

```bash
npm install -g @sentry/cli

sentry-cli releases new 1.0.0
sentry-cli releases files 1.0.0 upload-sourcemaps .next/static
sentry-cli releases finalize 1.0.0
```

---

## 🎯 Helpers Disponíveis

### Erro Genérico

```typescript
import { captureError } from '@/lib/error-tracking'

captureError(error, {
  leadId: 'lead-123',
  companyId: 'company-456',
  operation: 'create-lead',
})
```

### Erro de Scraping

```typescript
import { captureScrapingError } from '@/lib/error-tracking'

captureScrapingError(error, 'linkedin', 'CFO São Paulo', {
  jobsFound: 0,
  timeout: 30000,
})
```

### Erro de Enrichment

```typescript
import { captureEnrichmentError } from '@/lib/error-tracking'

captureEnrichmentError(error, 'apollo-api', companyId, leadId, {
  creditsRemaining: 50,
})
```

### Erro de API Externa

```typescript
import { captureAPIError } from '@/lib/error-tracking'

captureAPIError(
  error,
  'bright-data',
  'https://api.brightdata.com/...',
  429,
  { message: 'Too Many Requests' }
)
```

### Performance Issue

```typescript
import { capturePerformanceIssue } from '@/lib/error-tracking'

const startTime = Date.now()
const result = await prisma.lead.findMany()
const duration = Date.now() - startTime

capturePerformanceIssue(
  'Query de leads muito lenta',
  duration,
  1000,  // threshold: 1 segundo
  'database-query',
  { query: 'findMany leads', resultCount: result.length }
)
```

### Breadcrumbs

```typescript
import { addScrapingBreadcrumb, addEnrichmentBreadcrumb } from '@/lib/error-tracking'

addScrapingBreadcrumb('linkedin', 'start')
// ... scraping
addScrapingBreadcrumb('linkedin', 'success', 15)

addEnrichmentBreadcrumb('nova-vida-ti', 'Petrobras', 'start')
// ... enrichment
addEnrichmentBreadcrumb('nova-vida-ti', 'Petrobras', 'success')
```

### User Context

```typescript
import { setUserContext, clearUserContext } from '@/lib/error-tracking'

// Após login
setUserContext({
  id: session.user.id,
  email: session.user.email,
  name: session.user.name,
})

// Após logout
clearUserContext()
```

---

## 📋 Checklist de Configuração

- [ ] Conta Sentry criada
- [ ] Projeto Next.js criado no Sentry
- [ ] DSN copiado
- [ ] Variáveis de ambiente configuradas
- [ ] Testes de erro (cliente + servidor) realizados
- [ ] Alerts configurados
- [ ] Auth token gerado (para source maps)
- [ ] Source maps upload testado
- [ ] Integração Slack/Email configurada (opcional)

---

## 🚀 Deploy

### Vercel

Adicione as variáveis de ambiente no dashboard da Vercel:

```bash
vercel env add SENTRY_DSN production
vercel env add NEXT_PUBLIC_SENTRY_DSN production
vercel env add SENTRY_AUTH_TOKEN production
```

### Railway

No dashboard Railway, adicione em **Variables**:
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`

---

## 🐛 Troubleshooting

### Erros não aparecem no Sentry

1. Verificar DSN está correto
2. Verificar `beforeSend` não está filtrando demais
3. Verificar console do navegador (erros de conexão?)
4. Testar em produção (dev pode estar filtrado)

### Source maps não funcionam

1. Verificar `SENTRY_AUTH_TOKEN` está configurado
2. Verificar permissões do token
3. Executar build com `NODE_ENV=production`
4. Verificar upload manual:
   ```bash
   npx @sentry/wizard --integration nextjs
   ```

### Muitos erros sendo enviados

1. Ajustar `beforeSend` para filtrar mais
2. Reduzir `tracesSampleRate` para 0.1 (10%)
3. Adicionar mais itens em `ignoreErrors`

---

## 📚 Recursos

- [Sentry Docs - Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Error Tracking Best Practices](https://docs.sentry.io/product/best-practices/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)

---

**Configuração completa! 🎉**

Agora você tem monitoramento profissional de erros em produção.
