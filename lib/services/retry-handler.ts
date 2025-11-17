/**
 * Retry Handler Service
 *
 * Implementa retry logic com exponential backoff e circuit breaker
 * para todas as chamadas de API externas.
 *
 * Funcionalidades:
 * - Exponential backoff (1s, 2s, 4s, 8s, 16s...)
 * - Circuit breaker (para após N falhas consecutivas)
 * - Rate limiting por serviço
 * - Logs detalhados de tentativas
 */

import pRetry, { AbortError } from 'p-retry'
import PQueue from 'p-queue'

export interface RetryOptions {
  retries?: number              // Número de tentativas (padrão: 3)
  minTimeout?: number           // Timeout mínimo em ms (padrão: 1000)
  maxTimeout?: number           // Timeout máximo em ms (padrão: 10000)
  factor?: number               // Fator de multiplicação (padrão: 2)
  onFailedAttempt?: (error: pRetry.FailedAttemptError) => void
}

export interface CircuitBreakerState {
  failures: number
  lastFailureTime: number
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
}

/**
 * Circuit Breaker para cada serviço externo
 */
class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED'
  }

  private readonly maxFailures = 5
  private readonly resetTimeout = 60000 // 1 minuto

  /**
   * Verifica se circuit breaker permite chamada
   */
  canProceed(): boolean {
    // Se está OPEN, verificar se pode tentar novamente (HALF_OPEN)
    if (this.state.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.state.lastFailureTime
      if (timeSinceLastFailure >= this.resetTimeout) {
        console.log('    Circuit Breaker: HALF_OPEN (tentando recuperar)')
        this.state.state = 'HALF_OPEN'
        return true
      }
      return false
    }

    return true
  }

  /**
   * Registra sucesso na chamada
   */
  recordSuccess() {
    if (this.state.state === 'HALF_OPEN') {
      console.log('    Circuit Breaker: CLOSED (recuperado)')
    }
    this.state.failures = 0
    this.state.state = 'CLOSED'
  }

  /**
   * Registra falha na chamada
   */
  recordFailure() {
    this.state.failures++
    this.state.lastFailureTime = Date.now()

    if (this.state.failures >= this.maxFailures) {
      console.log(`    Circuit Breaker: OPEN (${this.state.failures} falhas consecutivas)`)
      this.state.state = 'OPEN'
    }
  }

  /**
   * Retorna estado atual
   */
  getState(): CircuitBreakerState {
    return { ...this.state }
  }

  /**
   * Reseta circuit breaker manualmente
   */
  reset() {
    this.state = {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED'
    }
  }
}

/**
 * Retry Handler Service
 */
export class RetryHandlerService {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map()
  private queues: Map<string, PQueue> = new Map()

  /**
   * Executa função com retry automático
   */
  async withRetry<T>(
    serviceName: string,
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      retries = 3,
      minTimeout = 1000,
      maxTimeout = 10000,
      factor = 2,
      onFailedAttempt
    } = options

    // Obter circuit breaker do serviço
    const circuitBreaker = this.getCircuitBreaker(serviceName)

    // Verificar se circuit breaker permite chamada
    if (!circuitBreaker.canProceed()) {
      const state = circuitBreaker.getState()
      throw new Error(
        `Circuit breaker OPEN para ${serviceName} (${state.failures} falhas). ` +
        `Tente novamente em ${Math.ceil((60000 - (Date.now() - state.lastFailureTime)) / 1000)}s`
      )
    }

    try {
      const result = await pRetry(
        async (attemptNumber) => {
          try {
            console.log(`    [${serviceName}] Tentativa ${attemptNumber}/${retries + 1}`)
            const result = await fn()
            console.log(`    [${serviceName}] Sucesso na tentativa ${attemptNumber}`)
            return result
          } catch (error: any) {
            // Verificar se é erro não retryable
            if (this.isNonRetryableError(error)) {
              console.log(`   ⛔ [${serviceName}] Erro não retryable:`, error.message)
              throw new AbortError(error.message)
            }

            // Log da falha
            console.log(`    [${serviceName}] Falha na tentativa ${attemptNumber}:`, error.message)

            throw error
          }
        },
        {
          retries,
          minTimeout,
          maxTimeout,
          factor,
          onFailedAttempt: (error) => {
            console.log(`     [${serviceName}] Retry ${error.attemptNumber}/${retries + 1} - aguardando ${error.retriesLeft} tentativas restantes`)
            if (onFailedAttempt) {
              onFailedAttempt(error)
            }
          }
        }
      )

      // Sucesso: resetar circuit breaker
      circuitBreaker.recordSuccess()
      return result

    } catch (error: any) {
      // Falha após todas as tentativas: incrementar circuit breaker
      circuitBreaker.recordFailure()

      console.error(`   💥 [${serviceName}] Todas as tentativas falharam`)
      throw error
    }
  }

  /**
   * Executa com rate limiting (queue)
   */
  async withRateLimit<T>(
    serviceName: string,
    fn: () => Promise<T>,
    options: { concurrency?: number; interval?: number; intervalCap?: number } = {}
  ): Promise<T> {
    const queue = this.getQueue(serviceName, options)
    return queue.add(fn)
  }

  /**
   * Executa com retry + rate limiting
   */
  async withRetryAndRateLimit<T>(
    serviceName: string,
    fn: () => Promise<T>,
    retryOptions: RetryOptions = {},
    queueOptions: { concurrency?: number; interval?: number; intervalCap?: number } = {}
  ): Promise<T> {
    const queue = this.getQueue(serviceName, queueOptions)

    return queue.add(() =>
      this.withRetry(serviceName, fn, retryOptions)
    )
  }

  /**
   * Verifica se erro não deve ser retryado
   */
  private isNonRetryableError(error: any): boolean {
    // Erros 4xx (exceto 429 Too Many Requests) não devem ser retryados
    if (error.response?.status) {
      const status = error.response.status
      return status >= 400 && status < 500 && status !== 429
    }

    // Erros de validação
    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      return true
    }

    // Erros de autenticação
    if (error.message?.includes('unauthorized') || error.message?.includes('forbidden')) {
      return true
    }

    return false
  }

  /**
   * Obter ou criar circuit breaker para serviço
   */
  private getCircuitBreaker(serviceName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker())
    }
    return this.circuitBreakers.get(serviceName)!
  }

  /**
   * Obter ou criar queue para serviço
   */
  private getQueue(
    serviceName: string,
    options: { concurrency?: number; interval?: number; intervalCap?: number } = {}
  ): PQueue {
    if (!this.queues.has(serviceName)) {
      const queue = new PQueue({
        concurrency: options.concurrency || 5,
        interval: options.interval || 1000,        // 1 segundo
        intervalCap: options.intervalCap || 10,    // 10 requests por segundo
      })
      this.queues.set(serviceName, queue)
    }
    return this.queues.get(serviceName)!
  }

  /**
   * Obter status de todos os circuit breakers
   */
  getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
    const status: Record<string, CircuitBreakerState> = {}
    for (const [serviceName, breaker] of this.circuitBreakers) {
      status[serviceName] = breaker.getState()
    }
    return status
  }

  /**
   * Resetar circuit breaker específico
   */
  resetCircuitBreaker(serviceName: string) {
    const breaker = this.circuitBreakers.get(serviceName)
    if (breaker) {
      breaker.reset()
      console.log(` Circuit Breaker resetado: ${serviceName}`)
    }
  }

  /**
   * Resetar todos os circuit breakers
   */
  resetAllCircuitBreakers() {
    for (const [serviceName, breaker] of this.circuitBreakers) {
      breaker.reset()
    }
    console.log(' Todos os Circuit Breakers resetados')
  }

  /**
   * Obter estatísticas das queues
   */
  getQueueStats(): Record<string, { size: number; pending: number }> {
    const stats: Record<string, { size: number; pending: number }> = {}
    for (const [serviceName, queue] of this.queues) {
      stats[serviceName] = {
        size: queue.size,
        pending: queue.pending
      }
    }
    return stats
  }
}

// Singleton export
export const retryHandler = new RetryHandlerService()

/**
 * Helper functions para uso direto
 */

// Bright Data
export const retryBrightData = <T>(fn: () => Promise<T>) =>
  retryHandler.withRetryAndRateLimit(
    'bright-data',
    fn,
    { retries: 3, minTimeout: 2000, maxTimeout: 10000 },
    { concurrency: 5, interval: 1000, intervalCap: 15 }  // 15 req/s (limite Bright Data)
  )

// Claude AI
export const retryClaudeAI = <T>(fn: () => Promise<T>) =>
  retryHandler.withRetryAndRateLimit(
    'claude-ai',
    fn,
    { retries: 2, minTimeout: 1000, maxTimeout: 5000 },
    { concurrency: 3, interval: 1000, intervalCap: 5 }  // 5 req/s
  )

// Nova Vida TI
export const retryNovaVidaTI = <T>(fn: () => Promise<T>) =>
  retryHandler.withRetryAndRateLimit(
    'nova-vida-ti',
    fn,
    { retries: 3, minTimeout: 2000, maxTimeout: 8000 },
    { concurrency: 2, interval: 1000, intervalCap: 3 }  // 3 req/s (conservador)
  )

// Brasil API
export const retryBrasilAPI = <T>(fn: () => Promise<T>) =>
  retryHandler.withRetryAndRateLimit(
    'brasil-api',
    fn,
    { retries: 5, minTimeout: 1000, maxTimeout: 15000 },
    { concurrency: 3, interval: 1000, intervalCap: 5 }  // 5 req/s
  )

// Hunter.io
export const retryHunterIO = <T>(fn: () => Promise<T>) =>
  retryHandler.withRetryAndRateLimit(
    'hunter-io',
    fn,
    { retries: 2, minTimeout: 1000, maxTimeout: 5000 },
    { concurrency: 2, interval: 1000, intervalCap: 2 }  // 2 req/s (plano free)
  )
