/**
 * Script de Manutenção de Cache
 *
 * Executa tarefas de manutenção do cache de enriquecimento:
 * - Limpar entradas expiradas
 * - Refresh de entradas próximas a expirar
 * - Exibir estatísticas
 *
 * USO:
 * npx tsx scripts/maintain-cache.ts [opção]
 *
 * Opções:
 * --cleanup     Limpar entradas expiradas
 * --stats       Mostrar estatísticas
 * --refresh     Refresh de entradas expirando em breve
 */

import { enrichmentCache } from '../lib/services/enrichment-cache'
import { prisma } from '../lib/prisma'

const args = process.argv.slice(2)
const cleanup = args.includes('--cleanup')
const stats = args.includes('--stats')
const refresh = args.includes('--refresh')

async function main() {
  console.log('🔧 Manutenção de Cache de Enriquecimento\n')
  console.log('='.repeat(70))

  // STATS
  if (stats || args.length === 0) {
    console.log('\n📊 Estatísticas do Cache\n')

    const cacheStats = await enrichmentCache.getStats()
    const hitRate = await enrichmentCache.calculateHitRate(7)
    const hitRate30d = await enrichmentCache.calculateHitRate(30)

    console.log(`Total de entradas: ${cacheStats.total}`)
    console.log(`  ✅ Válidas: ${cacheStats.valid}`)
    console.log(`  ⏰ Expiradas: ${cacheStats.expired}`)
    console.log(`  ❌ Erros: ${cacheStats.errors}`)
    console.log('')
    console.log(`Hit Rate:`)
    console.log(`  📈 Últimos 7 dias: ${hitRate}%`)
    console.log(`  📈 Últimos 30 dias: ${hitRate30d}%`)

    // Economia estimada
    const costPerQuery = 0.06  // Nova Vida TI
    const savedQueries = cacheStats.valid
    const savedCost = savedQueries * costPerQuery

    console.log('')
    console.log(`💰 Economia Estimada:`)
    console.log(`  Queries economizadas: ${savedQueries}`)
    console.log(`  Custo economizado: R$ ${savedCost.toFixed(2)}`)
  }

  // CLEANUP
  if (cleanup) {
    console.log('\n🧹 Limpando Entradas Expiradas...\n')

    const count = await enrichmentCache.cleanupExpired()

    console.log(`✅ ${count} entrada(s) removida(s)`)
  }

  // REFRESH
  if (refresh) {
    console.log('\n🔄 Verificando Entradas Próximas a Expirar...\n')

    const expiring = await enrichmentCache.getExpiringSoon(3)  // 3 dias

    console.log(`⚠️  ${expiring.length} entrada(s) expirando em breve:`)

    if (expiring.length > 0) {
      console.log('')
      for (const cnpj of expiring.slice(0, 10)) {  // Mostrar primeiras 10
        const cached = await enrichmentCache.getByCNPJ(cnpj)
        if (cached) {
          const daysLeft = Math.ceil(
            (cached.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
          console.log(`  📌 ${cnpj} - ${cached.razaoSocial || 'N/A'} (${daysLeft} dias)`)
        }
      }

      if (expiring.length > 10) {
        console.log(`  ... e mais ${expiring.length - 10}`)
      }

      console.log('')
      console.log('💡 Para refresh automático, execute:')
      console.log('   npx tsx scripts/refresh-cache.ts')
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('')

  // Recomendações
  if (!cleanup && !refresh && args.length > 0) {
    console.log('ℹ️  Opções disponíveis:')
    console.log('  --stats      Estatísticas do cache')
    console.log('  --cleanup    Limpar expirados')
    console.log('  --refresh    Ver entradas expirando')
    console.log('')
  }
}

main()
  .catch(error => {
    console.error('❌ Erro:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
