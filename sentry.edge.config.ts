/**
 * Sentry Edge Runtime Configuration
 *
 * Monitora erros que ocorrem em Edge Functions (middleware, edge routes)
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Configurações de performance
  tracesSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Tags
  initialScope: {
    tags: {
      runtime: 'edge',
    },
  },
})
