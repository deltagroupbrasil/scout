/**
 * Script de teste do LinkedIn Scraper com Puppeteer Bright Data
 *
 * Testa a conexão e scraping real de vagas do LinkedIn
 *
 * Uso: npx tsx scripts/test-linkedin-scraper.ts
 */

import dotenv from 'dotenv'

// Carregar variáveis de ambiente ANTES de importar serviços
dotenv.config()

import { linkedInScraper } from '@/lib/services/linkedin-scraper'

async function testLinkedInScraper() {
  console.log('🧪 TESTE: LinkedIn Scraper com Bright Data Puppeteer\n')
  console.log('=' .repeat(60))

  // Debug: verificar se variável foi carregada
  console.log('\n🔧 Debug - Variável de ambiente:')
  console.log(`   BRIGHT_DATA_PUPPETEER_URL existe: ${!!process.env.BRIGHT_DATA_PUPPETEER_URL}`)
  if (process.env.BRIGHT_DATA_PUPPETEER_URL) {
    const masked = process.env.BRIGHT_DATA_PUPPETEER_URL.substring(0, 30) + '...'
    console.log(`   Valor (mascarado): ${masked}`)
  }
  console.log('')

  try {
    // Configuração de teste
    const query = 'Controller OR Controladoria OR CFO'
    const location = 'São Paulo, Brazil'
    const daysAgo = 7 // Últimos 7 dias

    console.log('\n📋 Parâmetros de busca:')
    console.log(`   Query: ${query}`)
    console.log(`   Localização: ${location}`)
    console.log(`   Período: Últimos ${daysAgo} dias`)
    console.log('\n' + '='.repeat(60))

    // Teste 1: Buscar vagas
    console.log('\n🔍 TESTE 1: Buscando vagas no LinkedIn...\n')
    const startTime = Date.now()

    const jobs = await linkedInScraper.searchJobs(query, location, daysAgo)

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log('\n' + '='.repeat(60))
    console.log(`\n✅ Busca concluída em ${elapsedTime}s`)
    console.log(`📊 Total de vagas encontradas: ${jobs.length}\n`)

    // Exibir primeiras 5 vagas
    if (jobs.length > 0) {
      console.log('📝 Primeiras vagas encontradas:\n')
      jobs.slice(0, 5).forEach((job, index) => {
        console.log(`${index + 1}. ${job.jobTitle}`)
        console.log(`   Empresa: ${job.companyName}`)
        console.log(`   Localização: ${job.location}`)
        console.log(`   Data: ${job.postedDate}`)
        console.log(`   URL: ${job.jobUrl}`)
        console.log('')
      })

      // Teste 2: Extrair detalhes de uma vaga (primeira da lista)
      if (jobs.length > 0 && jobs[0].jobUrl) {
        console.log('='.repeat(60))
        console.log('\n🔍 TESTE 2: Extraindo detalhes da primeira vaga...\n')

        const jobDetails = await linkedInScraper.getJobDetails(jobs[0].jobUrl)

        if (jobDetails) {
          console.log('✅ Detalhes extraídos com sucesso:\n')
          console.log(`Título: ${jobDetails.jobTitle}`)
          console.log(`Empresa: ${jobDetails.companyName}`)
          console.log(`Localização: ${jobDetails.location}`)
          console.log(`Candidatos: ${jobDetails.applicants}`)
          console.log(`Descrição (primeiros 200 chars):`)
          console.log(`${jobDetails.description.substring(0, 200)}...`)
        } else {
          console.log('❌ Falha ao extrair detalhes da vaga')
        }
      }
    } else {
      console.log('⚠️  Nenhuma vaga encontrada. Possíveis razões:')
      console.log('   - LinkedIn pode estar bloqueando (mesmo com Bright Data)')
      console.log('   - Seletores CSS podem ter mudado')
      console.log('   - Parâmetros de busca muito restritivos')
    }

    console.log('\n' + '='.repeat(60))
    console.log('\n✨ Teste concluído!\n')

  } catch (error) {
    console.error('\n❌ ERRO durante o teste:', error)
    if (error instanceof Error) {
      console.error('Mensagem:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

// Executar teste
testLinkedInScraper()
  .then(() => {
    console.log('👍 Script finalizado com sucesso')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script falhou:', error)
    process.exit(1)
  })
