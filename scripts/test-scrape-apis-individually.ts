/**
 * Teste individual de cada API de scraping para identificar qual está travando
 */

import { linkedInPublicScraper } from '../lib/services/public-scraper'
import { serpApi } from '../lib/services/serp-api'
import { linkedInPuppeteerScraper } from '../lib/services/linkedin-puppeteer-scraper'
import { indeedScraper } from '../lib/services/indeed-scraper'

async function testEachAPI() {
  console.log('🧪 Testando cada API individualmente para identificar timeouts\n')

  // 1. LinkedIn Public API
  console.log('1️⃣ Testando LinkedIn Public API...')
  try {
    const start1 = Date.now()
    const jobs1 = await linkedInPublicScraper.scrapeJobs('Controller Financeiro', 'São Paulo')
    const time1 = ((Date.now() - start1) / 1000).toFixed(2)
    console.log(`✅ LinkedIn Public: ${jobs1.length} vagas em ${time1}s\n`)
  } catch (err) {
    console.error(`❌ LinkedIn Public FALHOU:`, err, '\n')
  }

  // 2. SERP API (Google Search)
  console.log('2️⃣ Testando SERP API (Bright Data)...')
  try {
    const start2 = Date.now()
    const jobs2 = await serpApi.searchJobs('Controller Financeiro', 'linkedin.com/jobs')
    const time2 = ((Date.now() - start2) / 1000).toFixed(2)
    console.log(`✅ SERP API: ${jobs2.length} vagas em ${time2}s\n`)
  } catch (err) {
    console.error(`❌ SERP API FALHOU:`, err, '\n')
  }

  // 3. Puppeteer (só funciona em produção)
  console.log('3️⃣ Testando Puppeteer LinkedIn (browser real)...')
  const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
  if (isProduction) {
    try {
      const start3 = Date.now()
      const jobs3 = await linkedInPuppeteerScraper.scrapeJobs('Controller Financeiro', 'São Paulo')
      const time3 = ((Date.now() - start3) / 1000).toFixed(2)
      console.log(`✅ Puppeteer: ${jobs3.length} vagas em ${time3}s\n`)
    } catch (err) {
      console.error(`❌ Puppeteer FALHOU:`, err, '\n')
    }
  } else {
    console.log(`⏭️  Puppeteer pulado (só funciona em produção Vercel)\n`)
  }

  // 4. Indeed (Web Unlocker)
  console.log('4️⃣ Testando Indeed (Web Unlocker)...')
  try {
    const start4 = Date.now()
    const jobs4 = await indeedScraper.scrapeJobs('Controller Financeiro', 'São Paulo')
    const time4 = ((Date.now() - start4) / 1000).toFixed(2)
    console.log(`✅ Indeed: ${jobs4.length} vagas em ${time4}s\n`)
  } catch (err) {
    console.error(`❌ Indeed FALHOU:`, err, '\n')
  }

  console.log('🏁 Teste completo!')
}

testEachAPI().catch(console.error)
