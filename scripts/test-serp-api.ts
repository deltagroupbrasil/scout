/**
 * Script de teste da SERP API (Bright Data)
 *
 * Testa busca de vagas via Google Search
 *
 * Uso: npx tsx scripts/test-serp-api.ts
 */

import dotenv from 'dotenv'

// Carregar variáveis de ambiente ANTES de importar serviços
dotenv.config()

import { serpApi } from '@/lib/services/serp-api'

async function testSerpApi() {
  console.log('🧪 TESTE: SERP API - Busca de Vagas via Google\n')
  console.log('=' .repeat(70))

  try {
    // Teste 1: Busca simples em uma fonte específica
    console.log('\n🔍 TESTE 1: Busca no LinkedIn via Google\n')
    console.log('-'.repeat(70))

    const linkedInJobs = await serpApi.searchJobs(
      'Controller Controladoria São Paulo',
      'linkedin.com/jobs',
      10
    )

    console.log(`\n📊 Resultados LinkedIn: ${linkedInJobs.length} vagas`)

    if (linkedInJobs.length > 0) {
      console.log('\n📝 Primeiras 3 vagas:\n')
      linkedInJobs.slice(0, 3).forEach((job, i) => {
        console.log(`${i + 1}. ${job.jobTitle}`)
        console.log(`   Empresa: ${job.companyName}`)
        console.log(`   Local: ${job.location}`)
        console.log(`   URL: ${job.jobUrl}`)
        console.log('')
      })
    }

    // Teste 2: Busca multi-fonte
    console.log('=' .repeat(70))
    console.log('\n🔍 TESTE 2: Busca Multi-Fonte (LinkedIn, Gupy, Catho, etc.)\n')
    console.log('-'.repeat(70))

    const startTime = Date.now()

    const allJobs = await serpApi.searchMultipleSources(
      'Controller OR Controladoria OR CFO',
      'São Paulo'
    )

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log(`\n📊 Total de vagas encontradas: ${allJobs.length}`)
    console.log(`⏱️  Tempo de busca: ${elapsed}s`)

    if (allJobs.length > 0) {
      console.log('\n📝 Amostra de vagas de diferentes fontes:\n')

      // Agrupar por fonte
      const bySource: { [key: string]: any[] } = {}
      allJobs.forEach(job => {
        const source = new URL(job.jobUrl).hostname
        if (!bySource[source]) {
          bySource[source] = []
        }
        bySource[source].push(job)
      })

      // Mostrar 2 vagas de cada fonte
      Object.entries(bySource).forEach(([source, jobs]) => {
        console.log(`\n📍 ${source} (${jobs.length} vagas):`)
        jobs.slice(0, 2).forEach(job => {
          console.log(`   • ${job.jobTitle} - ${job.companyName}`)
        })
      })
    }

    // Teste 3: Busca de informações da empresa
    console.log('\n' + '='.repeat(70))
    console.log('\n🔍 TESTE 3: Buscar informações de empresa específica\n')
    console.log('-'.repeat(70))

    const companyInfo = await serpApi.searchCompanyInfo('Ambev')

    if (companyInfo && companyInfo.organic_results) {
      console.log(`\n✅ Encontradas ${companyInfo.organic_results.length} informações sobre Ambev`)
      console.log('\nPrimeiros resultados:')
      companyInfo.organic_results.slice(0, 3).forEach((result: any, i: number) => {
        console.log(`\n${i + 1}. ${result.title}`)
        console.log(`   ${result.snippet?.substring(0, 150)}...`)
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
testSerpApi()
  .then(() => {
    console.log('👍 Script finalizado com sucesso')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script falhou:', error)
    process.exit(1)
  })
