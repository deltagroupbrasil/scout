import { describe, it, expect, vi, beforeEach } from 'vitest'
import { retryHandler } from '@/lib/services/retry-handler'

describe('RetryHandlerService', () => {
  beforeEach(() => {
    // Reset circuit breakers antes de cada teste
    retryHandler.resetAllCircuitBreakers()
  })

  describe('withRetry', () => {
    it('deve executar função com sucesso na primeira tentativa', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')

      const result = await retryHandler.withRetry('test-service', mockFn, {
        retries: 3,
      })

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('deve fazer retry em caso de falha temporária', async () => {
      let callCount = 0
      const mockFn = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount < 3) {
          return Promise.reject(new Error('Temporary failure'))
        }
        return Promise.resolve('success')
      })

      const result = await retryHandler.withRetry('test-service', mockFn, {
        retries: 3,
        minTimeout: 10,
        maxTimeout: 50,
      })

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(3)
    })

    it('deve lançar erro após esgotar todas as tentativas', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Permanent failure'))

      await expect(
        retryHandler.withRetry('test-service', mockFn, {
          retries: 2,
          minTimeout: 10,
        })
      ).rejects.toThrow('Permanent failure')

      expect(mockFn).toHaveBeenCalledTimes(3)  // 1 tentativa inicial + 2 retries
    })

    it('deve abortar imediatamente em erros não retryable (4xx)', async () => {
      const error: any = new Error('Not Found')
      error.response = { status: 404 }
      const mockFn = vi.fn().mockRejectedValue(error)

      await expect(
        retryHandler.withRetry('test-service', mockFn, {
          retries: 3,
        })
      ).rejects.toThrow('Not Found')

      expect(mockFn).toHaveBeenCalledTimes(1)  // Sem retry
    })

    it('deve fazer retry em erros 429 (Too Many Requests)', async () => {
      let callCount = 0
      const mockFn = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount < 2) {
          const error: any = new Error('Too Many Requests')
          error.response = { status: 429 }
          return Promise.reject(error)
        }
        return Promise.resolve('success')
      })

      const result = await retryHandler.withRetry('test-service', mockFn, {
        retries: 3,
        minTimeout: 10,
      })

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalledTimes(2)
    })
  })

  describe('Circuit Breaker', () => {
    it('deve abrir circuit breaker após 5 falhas consecutivas', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Service down'))

      // Fazer 5 chamadas que falham
      for (let i = 0; i < 5; i++) {
        try {
          await retryHandler.withRetry('test-cb', mockFn, { retries: 0 })
        } catch {
          // Esperado
        }
      }

      // 6ª chamada deve ser bloqueada pelo circuit breaker
      await expect(
        retryHandler.withRetry('test-cb', mockFn, { retries: 0 })
      ).rejects.toThrow('Circuit breaker OPEN')

      // Circuit breaker deve ter bloqueado, então mockFn não deve ser chamado
      expect(mockFn).toHaveBeenCalledTimes(5)  // Apenas as 5 primeiras
    })

    it('deve resetar circuit breaker após sucesso', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValue('success')

      // Primeira chamada falha
      try {
        await retryHandler.withRetry('test-reset', mockFn, { retries: 0 })
      } catch {
        // Esperado
      }

      // Segunda chamada tem sucesso e reseta circuit breaker
      await retryHandler.withRetry('test-reset', mockFn, { retries: 0 })

      const status = retryHandler.getCircuitBreakerStatus()
      expect(status['test-reset'].failures).toBe(0)
      expect(status['test-reset'].state).toBe('CLOSED')
    })

    it('deve permitir reset manual de circuit breaker', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Error'))

      // Criar algumas falhas
      for (let i = 0; i < 3; i++) {
        try {
          await retryHandler.withRetry('test-manual-reset', mockFn, { retries: 0 })
        } catch {
          // Esperado
        }
      }

      // Resetar manualmente
      retryHandler.resetCircuitBreaker('test-manual-reset')

      const status = retryHandler.getCircuitBreakerStatus()
      expect(status['test-manual-reset'].failures).toBe(0)
      expect(status['test-manual-reset'].state).toBe('CLOSED')
    })
  })

  describe('withRateLimit', () => {
    it('deve respeitar concurrency limit', async () => {
      let concurrent = 0
      let maxConcurrent = 0

      const mockFn = async () => {
        concurrent++
        maxConcurrent = Math.max(maxConcurrent, concurrent)
        await new Promise(resolve => setTimeout(resolve, 50))
        concurrent--
        return 'success'
      }

      // Executar 10 requests com concurrency 2
      const promises = Array.from({ length: 10 }, () =>
        retryHandler.withRateLimit('test-rate-limit', mockFn, {
          concurrency: 2,
        })
      )

      await Promise.all(promises)

      // Máximo de 2 executando simultaneamente
      expect(maxConcurrent).toBeLessThanOrEqual(2)
    })
  })

  describe('getCircuitBreakerStatus', () => {
    it('deve retornar status de todos os circuit breakers', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')

      await retryHandler.withRetry('service-1', mockFn)
      await retryHandler.withRetry('service-2', mockFn)

      const status = retryHandler.getCircuitBreakerStatus()

      expect(status).toHaveProperty('service-1')
      expect(status).toHaveProperty('service-2')
      expect(status['service-1'].state).toBe('CLOSED')
      expect(status['service-2'].state).toBe('CLOSED')
    })
  })

  describe('getQueueStats', () => {
    it('deve retornar estatísticas das queues', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')

      await retryHandler.withRateLimit('queue-1', mockFn)

      const stats = retryHandler.getQueueStats()

      expect(stats).toHaveProperty('queue-1')
      expect(stats['queue-1']).toHaveProperty('size')
      expect(stats['queue-1']).toHaveProperty('pending')
    })
  })
})
