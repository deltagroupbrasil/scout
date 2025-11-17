/**
 * Sentry Client-Side Configuration
 *
 * Monitora erros que ocorrem no navegador do usuário
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Configurações de performance
  tracesSampleRate: 1.0,  // 100% em dev, reduzir para 0.1 em prod

  // Configurações de session replay (opcional)
  replaysSessionSampleRate: 0.1,  // 10% das sessões
  replaysOnErrorSampleRate: 1.0,  // 100% quando há erro

  // Environment
  environment: process.env.NODE_ENV,

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Ignorar erros comuns do browser
  ignoreErrors: [
    // Erros de rede
    'Network request failed',
    'Failed to fetch',
    'NetworkError',

    // Erros de extensões do browser
    'Extension context invalidated',
    'chrome-extension://',

    // Erros de timeout
    'timeout',
    'aborted',
  ],

  // Filtrar breadcrumbs sensíveis
  beforeBreadcrumb(breadcrumb) {
    // Não enviar dados de formulários
    if (breadcrumb.category === 'ui.input') {
      return null
    }
    return breadcrumb
  },

  // Filtrar eventos sensíveis
  beforeSend(event, hint) {
    // Não enviar erros de desenvolvimento local
    if (event.request?.url?.includes('localhost')) {
      return null
    }

    // Remover dados sensíveis de headers
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }

    return event
  },
})
