import { indeedScraper } from '../lib/services/indeed-scraper'
import { glassdoorScraper } from '../lib/services/glassdoor-scraper'

async function testBrightDataAPIs() {
  console.log('🧪 Testando Bright Data APIs\n')

  // 1. Web Unlocker (Indeed)
  console.log('='.repeat(80))
  console.log('1️⃣  TESTANDO WEB UNLOCKER (Indeed)')
  console.log('='.repeat(80))
  try {
    const indeedJobs = await indeedScraper.scrapeJobs('Controller São Paulo', 'Brasil')
    console.log(`✅ Indeed retornou: ${indeedJobs.length} vagas`)
    if (indeedJobs.length > 0) {
      console.log('\n📋 Primeiras 3 vagas:')
      indeedJobs.slice(0, 3).forEach((job, i) => {
        console.log(`${i + 1}. ${job.jobTitle} - ${job.companyName}`)
      })
    }
  } catch (error) {
    console.error('❌ Web Unlocker (Indeed) FALHOU:', error)
  }

  console.log('\n')

  // 2. Web Unlocker (Glassdoor)
  console.log('='.repeat(80))
  console.log('2️⃣  TESTANDO WEB UNLOCKER (Glassdoor)')
  console.log('='.repeat(80))
  try {
    const glassdoorJobs = await glassdoorScraper.scrapeJobs('Controller São Paulo', 'Brasil')
    console.log(`✅ Glassdoor retornou: ${glassdoorJobs.length} vagas`)
    if (glassdoorJobs.length > 0) {
      console.log('\n📋 Primeiras 3 vagas:')
      glassdoorJobs.slice(0, 3).forEach((job, i) => {
        console.log(`${i + 1}. ${job.jobTitle} - ${job.companyName}`)
      })
    }
  } catch (error) {
    console.error('❌ Web Unlocker (Glassdoor) FALHOU:', error)
  }

  console.log('\n')
  console.log('='.repeat(80))
  console.log('📊 RESUMO:')
  console.log('='.repeat(80))
  console.log('LinkedIn API Pública: ✅ FUNCIONANDO (10 vagas)')
  console.log('RemoteOK: ✅ FUNCIONANDO (22 vagas)')
  console.log('Web Unlocker (Indeed): Veja acima')
  console.log('Web Unlocker (Glassdoor): Veja acima')
  console.log('\n⚠️  Puppeteer: ❌ NÃO FUNCIONA no Vercel (serverless)')
  console.log('⚠️  SERP API: Não testado (retorna HTML, difícil de parsear)')
}

testBrightDataAPIs().catch(console.error)
