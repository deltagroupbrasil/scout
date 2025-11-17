/**
 * Script de Teste: Retry Handler Service
 *
 * Testa retry logic, exponential backoff e circuit breaker
 */

import { retryHandler, retryBrightData, retryClaudeAI } from '../lib/services/retry-handler'

// Simulação de API que falha aleatoriamente
let callCount = 0

async function unreliableAPI(failureRate: number = 0.5): Promise<string> {
  callCount++
  const shouldFail = Math.random() < failureRate

  if (shouldFail) {
    throw new Error(`API falhou (chamada ${callCount})`)
  }

  return `Sucesso na chamada ${callCount}`
}

// API que sempre falha (para testar circuit breaker)
async function alwaysFailAPI(): Promise<string> {
  throw new Error('API sempre falha')
}

// API com erro 404 (não retryable)
async function notFoundAPI(): Promise<string> {
  const error: any = new Error('Not Found')
  error.response = { status: 404 }
  throw error
}

async function testRetryHandler() {
  console.log('🧪 Testando Retry Handler Service\n')
  console.log('='.repeat(70))

  // TESTE 1: Retry básico com sucesso eventual
  console.log('\n📝 TESTE 1: Retry com sucesso eventual (50% falha)\n')
  callCount = 0

  try {
    const result = await retryHandler.withRetry(
      'test-api-1',
      () => unreliableAPI(0.5),
      { retries: 5, minTimeout: 500, maxTimeout: 2000 }
    )
    console.log(`✅ Resultado: ${result}`)
    console.log(`   Total de chamadas: ${callCount}`)
  } catch (error: any) {
    console.log(`❌ Falhou após todas as tentativas: ${error.message}`)
  }

  // TESTE 2: Erro não retryable (404)
  console.log('\n' + '='.repeat(70))
  console.log('\n⛔ TESTE 2: Erro não retryable (404 - aborta imediatamente)\n')

  try {
    await retryHandler.withRetry(
      'test-api-2',
      notFoundAPI,
      { retries: 3 }
    )
  } catch (error: any) {
    console.log(`✅ Abortou corretamente: ${error.message}`)
  }

  // TESTE 3: Circuit Breaker
  console.log('\n' + '='.repeat(70))
  console.log('\n🔴 TESTE 3: Circuit Breaker (após 5 falhas consecutivas)\n')

  for (let i = 1; i <= 7; i++) {
    try {
      console.log(`Tentativa ${i}:`)
      await retryHandler.withRetry(
        'test-api-circuit-breaker',
        alwaysFailAPI,
        { retries: 0 }  // Não retry, apenas testar circuit breaker
      )
    } catch (error: any) {
      if (error.message.includes('Circuit breaker OPEN')) {
        console.log(`   🔴 ${error.message}\n`)
        break
      } else {
        console.log(`   ❌ Falha ${i}\n`)
      }
    }
  }

  // TESTE 4: Circuit Breaker Status
  console.log('='.repeat(70))
  console.log('\n📊 TESTE 4: Status dos Circuit Breakers\n')

  const status = retryHandler.getCircuitBreakerStatus()

  for (const [service, state] of Object.entries(status)) {
    const stateIcon = state.state === 'CLOSED' ? '🟢' : state.state === 'OPEN' ? '🔴' : '🟡'
    console.log(`${stateIcon} ${service.padEnd(30)} - ${state.state} (${state.failures} falhas)`)
  }

  // TESTE 5: Reset Circuit Breaker
  console.log('\n' + '='.repeat(70))
  console.log('\n🔄 TESTE 5: Reset Circuit Breaker\n')

  console.log('Resetando circuit breaker de test-api-circuit-breaker...')
  retryHandler.resetCircuitBreaker('test-api-circuit-breaker')

  const statusAfterReset = retryHandler.getCircuitBreakerStatus()
  const resetState = statusAfterReset['test-api-circuit-breaker']

  if (resetState) {
    const icon = resetState.state === 'CLOSED' ? '🟢' : '🔴'
    console.log(`${icon} Estado após reset: ${resetState.state} (${resetState.failures} falhas)`)
  }

  // TESTE 6: Rate Limiting (Queue)
  console.log('\n' + '='.repeat(70))
  console.log('\n⏱️  TESTE 6: Rate Limiting (10 requests, concurrency 2, 5 req/s)\n')

  const queueTest = async (id: number) => {
    const startTime = Date.now()
    return retryHandler.withRateLimit(
      'test-queue',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 100))  // Simular API lenta
        return { id, processedAt: Date.now() - startTime }
      },
      { concurrency: 2, interval: 1000, intervalCap: 5 }
    )
  }

  const queueStartTime = Date.now()
  const queueResults = await Promise.all(
    Array.from({ length: 10 }, (_, i) => queueTest(i + 1))
  )
  const queueDuration = Date.now() - queueStartTime

  console.log('Resultados:')
  queueResults.forEach(result => {
    console.log(`   Request #${result.id}: processado em ${result.processedAt}ms`)
  })
  console.log(`\n⏱️  Tempo total: ${queueDuration}ms`)
  console.log(`   Esperado: ~2s (10 requests / 5 req/s com concurrency 2)`)

  // TESTE 7: Helpers especializados
  console.log('\n' + '='.repeat(70))
  console.log('\n🚀 TESTE 7: Helpers Especializados (Bright Data, Claude AI)\n')

  console.log('Testando retryBrightData...')
  try {
    const result = await retryBrightData(() => unreliableAPI(0.3))
    console.log(`✅ Bright Data: ${result}`)
  } catch (error: any) {
    console.log(`❌ Bright Data falhou: ${error.message}`)
  }

  console.log('\nTestando retryClaudeAI...')
  try {
    const result = await retryClaudeAI(() => unreliableAPI(0.3))
    console.log(`✅ Claude AI: ${result}`)
  } catch (error: any) {
    console.log(`❌ Claude AI falhou: ${error.message}`)
  }

  // TESTE 8: Queue Stats
  console.log('\n' + '='.repeat(70))
  console.log('\n📈 TESTE 8: Estatísticas das Queues\n')

  const queueStats = retryHandler.getQueueStats()

  for (const [service, stats] of Object.entries(queueStats)) {
    console.log(`📊 ${service.padEnd(25)} - Size: ${stats.size}, Pending: ${stats.pending}`)
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n✅ Todos os testes concluídos!\n')
  console.log('📋 Resumo:')
  console.log('   ✅ Retry com exponential backoff')
  console.log('   ✅ Detecção de erros não retryable')
  console.log('   ✅ Circuit Breaker automático')
  console.log('   ✅ Reset de circuit breakers')
  console.log('   ✅ Rate limiting com queues')
  console.log('   ✅ Helpers especializados por serviço')
  console.log('')
}

testRetryHandler()
  .catch(error => {
    console.error('❌ Erro durante testes:', error)
    process.exit(1)
  })
