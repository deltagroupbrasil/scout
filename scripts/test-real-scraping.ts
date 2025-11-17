import 'dotenv/config'
import { gupyScraper } from '../lib/services/gupy-scraper'
import { cathoScraper } from '../lib/services/catho-scraper'
import { indeedScraper } from '../lib/services/indeed-scraper'

async function testRealScraping() {
  console.log('🧪 TESTE DE SCRAPING REAL COM BRIGHT DATA\n')
  console.log('=' .repeat(60))

  // Teste 1: Gupy
  console.log('\n1️⃣ Testando GUPY com Bright Data Web Unlocker...')
  console.log('Query: "Controller Financeiro"')

  try {
    const gupyJobs = await gupyScraper.scrapeJobs('Controller Financeiro')
    console.log(`✅ Gupy retornou: ${gupyJobs.length} vagas`)

    if (gupyJobs.length > 0) {
      console.log('\n📋 Primeiras 3 vagas do Gupy:')
      gupyJobs.slice(0, 3).forEach((job, idx) => {
        console.log(`\n   ${idx + 1}. ${job.jobTitle}`)
        console.log(`      Empresa: ${job.companyName}`)
        console.log(`      URL: ${job.jobUrl}`)
      })
    }
  } catch (error) {
    console.error('❌ Erro no Gupy:', error)
  }

  // Teste 2: Catho
  console.log('\n\n2️⃣ Testando CATHO com Bright Data Web Unlocker...')
  console.log('Query: "Gerente Controladoria"')

  try {
    const cathoJobs = await cathoScraper.scrapeJobs('Gerente Controladoria')
    console.log(`✅ Catho retornou: ${cathoJobs.length} vagas`)

    if (cathoJobs.length > 0) {
      console.log('\n📋 Primeiras 3 vagas do Catho:')
      cathoJobs.slice(0, 3).forEach((job, idx) => {
        console.log(`\n   ${idx + 1}. ${job.jobTitle}`)
        console.log(`      Empresa: ${job.companyName}`)
        console.log(`      URL: ${job.jobUrl}`)
      })
    }
  } catch (error) {
    console.error('❌ Erro no Catho:', error)
  }

  // Teste 3: Indeed
  console.log('\n\n3️⃣ Testando INDEED com Bright Data Web Unlocker...')
  console.log('Query: "CFO"')

  try {
    const indeedJobs = await indeedScraper.scrapeJobs('CFO', 'São Paulo')
    console.log(`✅ Indeed retornou: ${indeedJobs.length} vagas`)

    if (indeedJobs.length > 0) {
      console.log('\n📋 Primeiras 3 vagas do Indeed:')
      indeedJobs.slice(0, 3).forEach((job, idx) => {
        console.log(`\n   ${idx + 1}. ${job.jobTitle}`)
        console.log(`      Empresa: ${job.companyName}`)
        console.log(`      URL: ${job.jobUrl}`)
      })
    }
  } catch (error) {
    console.error('❌ Erro no Indeed:', error)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ Teste de scraping real concluído!\n')
}

testRealScraping()
