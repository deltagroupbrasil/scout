/**
 * Script de teste do Web Unlocker (Bright Data)
 *
 * Testa scraping de sites brasileiros: Gupy, Catho, InfoJobs
 *
 * Uso: npx tsx scripts/test-web-unlocker.ts
 */

import dotenv from 'dotenv'

// Carregar variáveis de ambiente ANTES de importar serviços
dotenv.config()

import { webUnlocker } from '@/lib/services/web-unlocker'

async function testWebUnlocker() {
  console.log('🧪 TESTE: Web Unlocker - Scraping Sites Brasileiros\n')
  console.log('=' .repeat(70))

  try {
    const query = 'Controller Controladoria CFO'
    const location = 'São Paulo'

    // Teste 1: Buscar em todas as fontes
    console.log('\n🔍 TESTE 1: Busca em todas as plataformas brasileiras\n')
    console.log(`Query: ${query}`)
    console.log(`Localização: ${location}\n`)
    console.log('-'.repeat(70))

    const startTime = Date.now()

    const allJobs = await webUnlocker.scrapeAllBrazilianSources(query, location)

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('\n' + '='.repeat(70))
    console.log(`\n📊 Resumo:`)
    console.log(`   Total de vagas: ${allJobs.length}`)
    console.log(`   Tempo: ${elapsed}s`)

    if (allJobs.length > 0) {
      console.log('\n📝 Primeiras 10 vagas encontradas:\n')

      allJobs.slice(0, 10).forEach((job, i) => {
        const source = new URL(job.jobUrl).hostname
        console.log(`${i + 1}. ${job.jobTitle}`)
        console.log(`   Empresa: ${job.companyName}`)
        console.log(`   Local: ${job.location}`)
        console.log(`   Fonte: ${source}`)
        console.log(`   URL: ${job.jobUrl}`)
        console.log('')
      })

      // Estatísticas por fonte
      console.log('📊 Vagas por fonte:\n')
      const bySource: { [key: string]: number } = {}

      allJobs.forEach(job => {
        const source = new URL(job.jobUrl).hostname
        bySource[source] = (bySource[source] || 0) + 1
      })

      Object.entries(bySource)
        .sort((a, b) => b[1] - a[1])
        .forEach(([source, count]) => {
          console.log(`   ${source}: ${count} vagas`)
        })
    } else {
      console.log('\n⚠️  Nenhuma vaga encontrada.')
      console.log('\nPossíveis razões:')
      console.log('   - Seletores CSS mudaram nos sites')
      console.log('   - Sites bloquearam requisições')
      console.log('   - Query não retornou resultados')
    }

    // Teste 2: Testar fonte individual (Gupy)
    console.log('\n' + '='.repeat(70))
    console.log('\n🔍 TESTE 2: Busca específica no Gupy\n')
    console.log('-'.repeat(70))

    const gupyJobs = await webUnlocker.scrapeGupyJobs('Controller')

    console.log(`\n📊 Gupy: ${gupyJobs.length} vagas`)

    if (gupyJobs.length > 0) {
      console.log('\nPrimeiras 3 vagas:\n')
      gupyJobs.slice(0, 3).forEach((job, i) => {
        console.log(`${i + 1}. ${job.jobTitle} - ${job.companyName}`)
      })
    }

    console.log('\n' + '='.repeat(70))
    console.log('\n✨ Testes concluídos!\n')

  } catch (error) {
    console.error('\n❌ ERRO durante os testes:', error)
    if (error instanceof Error) {
      console.error('Mensagem:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

// Executar testes
testWebUnlocker()
  .then(() => {
    console.log('👍 Script finalizado com sucesso')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script falhou:', error)
    process.exit(1)
  })
