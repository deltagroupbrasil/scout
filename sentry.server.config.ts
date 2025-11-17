/**
 * Sentry Server-Side Configuration
 *
 * Monitora erros que ocorrem no servidor Next.js (API routes, SSR, etc)
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Configurações de performance
  tracesSampleRate: 1.0,  // 100% em dev, reduzir para 0.1 em prod

  // Environment
  environment: process.env.NODE_ENV,

  // Tags customizadas
  initialScope: {
    tags: {
      service: 'leapscout-api',
      node_version: process.version,
    },
  },

  // Ignorar erros conhecidos e esperados
  ignoreErrors: [
    // Erros de autenticação (esperados)
    'Não autorizado',
    'Invalid credentials',

    // Erros de validação (esperados)
    'Validation error',
    'Invalid input',

    // Timeouts de API externa (esperados ocasionalmente)
    'ETIMEDOUT',
    'ECONNREFUSED',
  ],

  // Filtrar eventos antes de enviar
  beforeSend(event, hint) {
    const error = hint.originalException as any

    // Não enviar erros de rate limiting (são esperados)
    if (error?.message?.includes('Too Many Requests') || error?.message?.includes('429')) {
      return null
    }

    // Não enviar erros de validação do Prisma (são esperados)
    if (error?.name === 'PrismaClientValidationError') {
      return null
    }

    // Adicionar contexto de banco de dados se disponível
    if (error?.meta) {
      event.extra = {
        ...event.extra,
        prisma_meta: error.meta,
      }
    }

    // Remover dados sensíveis
    if (event.request?.data) {
      const sensitiveFields = ['password', 'token', 'apiKey', 'secret']
      for (const field of sensitiveFields) {
        if (event.request.data[field]) {
          event.request.data[field] = '[REDACTED]'
        }
      }
    }

    return event
  },

  // Integrations
  integrations: [
    // Capturar erros não tratados do Node.js
    Sentry.captureConsoleIntegration({
      levels: ['error', 'warn'],
    }),
  ],
})
