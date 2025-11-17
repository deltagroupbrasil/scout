/**
 * Error Tracking Utilities
 *
 * Helpers para capturar e reportar erros ao Sentry
 * com contexto adicional específico do LeapScout
 */

import * as Sentry from '@sentry/nextjs'

export interface ErrorContext {
  leadId?: string
  companyId?: string
  userId?: string
  scrapeLogId?: string
  serviceName?: string
  apiEndpoint?: string
  [key: string]: any
}

/**
 * Captura erro genérico com contexto
 */
export function captureError(
  error: Error | string,
  context?: ErrorContext,
  level: Sentry.SeverityLevel = 'error'
) {
  const errorObj = typeof error === 'string' ? new Error(error) : error

  Sentry.withScope((scope) => {
    // Adicionar contexto
    if (context) {
      // Tags (para filtrar no Sentry)
      if (context.serviceName) {
        scope.setTag('service', context.serviceName)
      }
      if (context.apiEndpoint) {
        scope.setTag('endpoint', context.apiEndpoint)
      }

      // Contextos (dados adicionais)
      if (context.leadId || context.companyId || context.userId) {
        scope.setContext('business', {
          leadId: context.leadId,
          companyId: context.companyId,
          userId: context.userId,
        })
      }

      // Extra data
      const { leadId, companyId, userId, serviceName, apiEndpoint, ...extra } = context
      if (Object.keys(extra).length > 0) {
        scope.setExtras(extra)
      }
    }

    // Set level
    scope.setLevel(level)

    // Capturar exception
    Sentry.captureException(errorObj)
  })

  // Log no console também (útil em dev)
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error Tracking]', errorObj, context)
  }
}

/**
 * Captura erro de scraping (com contexto específico)
 */
export function captureScrapingError(
  error: Error,
  source: string,
  query: string,
  additionalContext?: Record<string, any>
) {
  captureError(error, {
    serviceName: 'scraping',
    source,
    query,
    ...additionalContext,
  })
}

/**
 * Captura erro de enrichment (com contexto específico)
 */
export function captureEnrichmentError(
  error: Error,
  provider: string,
  companyId?: string,
  leadId?: string,
  additionalContext?: Record<string, any>
) {
  captureError(error, {
    serviceName: 'enrichment',
    provider,
    companyId,
    leadId,
    ...additionalContext,
  })
}

/**
 * Captura erro de API externa
 */
export function captureAPIError(
  error: Error,
  apiName: string,
  endpoint: string,
  statusCode?: number,
  responseBody?: any
) {
  captureError(error, {
    serviceName: 'external-api',
    apiName,
    apiEndpoint: endpoint,
    statusCode,
    responseBody: responseBody ? JSON.stringify(responseBody).substring(0, 500) : undefined,
  })
}

/**
 * Captura erro de autenticação
 */
export function captureAuthError(
  error: Error,
  email?: string,
  attemptType: 'login' | 'register' | 'reset-password' = 'login'
) {
  captureError(error, {
    serviceName: 'authentication',
    attemptType,
    email: email ? email.replace(/(.{2}).*@/, '$1***@') : undefined,  // Mascarar email
  }, 'warning')
}

/**
 * Captura erro de database
 */
export function captureDatabaseError(
  error: Error,
  operation: 'create' | 'read' | 'update' | 'delete',
  model: string,
  recordId?: string
) {
  captureError(error, {
    serviceName: 'database',
    operation,
    model,
    recordId,
  })
}

/**
 * Captura erro de performance (query lenta, etc)
 */
export function capturePerformanceIssue(
  message: string,
  duration: number,
  threshold: number,
  operation: string,
  context?: Record<string, any>
) {
  if (duration > threshold) {
    Sentry.withScope((scope) => {
      scope.setLevel('warning')
      scope.setTag('type', 'performance')
      scope.setContext('performance', {
        operation,
        duration,
        threshold,
        exceeded: duration - threshold,
      })

      if (context) {
        scope.setExtras(context)
      }

      Sentry.captureMessage(`Slow operation: ${message}`, 'warning')
    })
  }
}

/**
 * Adiciona breadcrumb customizado
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Adiciona breadcrumb de scraping
 */
export function addScrapingBreadcrumb(
  source: string,
  action: 'start' | 'success' | 'error',
  jobsFound?: number
) {
  addBreadcrumb(
    `Scraping ${source}: ${action}`,
    'scraping',
    { source, action, jobsFound },
    action === 'error' ? 'error' : 'info'
  )
}

/**
 * Adiciona breadcrumb de enrichment
 */
export function addEnrichmentBreadcrumb(
  provider: string,
  companyName: string,
  action: 'start' | 'success' | 'error'
) {
  addBreadcrumb(
    `Enrichment ${provider} for ${companyName}: ${action}`,
    'enrichment',
    { provider, companyName, action },
    action === 'error' ? 'error' : 'info'
  )
}

/**
 * Wrapper para async functions com error tracking automático
 */
export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args)
    } catch (error) {
      captureError(error as Error, context)
      throw error
    }
  }) as T
}

/**
 * Set user context (para tracking de usuário)
 */
export function setUserContext(user: {
  id: string
  email: string
  name?: string
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  })
}

/**
 * Clear user context (logout)
 */
export function clearUserContext() {
  Sentry.setUser(null)
}

/**
 * Flush events (útil antes de terminar processo)
 */
export async function flushErrorTracking(timeout = 2000): Promise<boolean> {
  return Sentry.flush(timeout)
}
