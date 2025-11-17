import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { retryHandler } from '@/lib/services/retry-handler'

/**
 * GET /api/system/status
 *
 * Retorna status do sistema:
 * - Circuit breakers de cada serviço
 * - Queue stats (pending, size)
 * - Saúde geral do sistema
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Obter status dos circuit breakers
    const circuitBreakers = retryHandler.getCircuitBreakerStatus()

    // Obter stats das queues
    const queueStats = retryHandler.getQueueStats()

    // Calcular saúde geral
    const openCircuits = Object.values(circuitBreakers).filter(
      (state) => state.state === 'OPEN'
    ).length

    const totalCircuits = Object.keys(circuitBreakers).length
    const health = openCircuits === 0 ? 'healthy' : openCircuits === totalCircuits ? 'down' : 'degraded'

    return NextResponse.json({
      health,
      timestamp: new Date().toISOString(),
      circuitBreakers: Object.entries(circuitBreakers).map(([service, state]) => ({
        service,
        state: state.state,
        failures: state.failures,
        lastFailureTime: state.lastFailureTime ? new Date(state.lastFailureTime).toISOString() : null
      })),
      queues: Object.entries(queueStats).map(([service, stats]) => ({
        service,
        size: stats.size,
        pending: stats.pending
      })),
      summary: {
        totalServices: totalCircuits,
        healthyServices: totalCircuits - openCircuits,
        degradedServices: openCircuits
      }
    })
  } catch (error) {
    console.error('Erro ao obter status do sistema:', error)
    return NextResponse.json(
      { error: 'Erro ao obter status do sistema' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/system/status/reset
 *
 * Reseta circuit breakers (admin only)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { service } = await request.json()

    if (service) {
      // Resetar serviço específico
      retryHandler.resetCircuitBreaker(service)
    } else {
      // Resetar todos
      retryHandler.resetAllCircuitBreakers()
    }

    return NextResponse.json({
      success: true,
      message: service
        ? `Circuit breaker resetado: ${service}`
        : 'Todos os circuit breakers resetados'
    })
  } catch (error) {
    console.error('Erro ao resetar circuit breakers:', error)
    return NextResponse.json(
      { error: 'Erro ao resetar circuit breakers' },
      { status: 500 }
    )
  }
}
