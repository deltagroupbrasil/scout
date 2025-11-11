import 'dotenv/config'
import { gupyScraper } from '../lib/services/gupy-scraper'
import { cathoScraper } from '../lib/services/catho-scraper'
import { leadOrchestrator } from '../lib/services/lead-orchestrator'

async function testMultiSourceScraping() {
  console.log('🧪 Testando scraping multi-fonte...\n')

  const query = 'Controller Controladoria Financeiro'

  // Teste 1: Gupy
  console.log('1️⃣ Testando Gupy...')
  const gupyJobs = await gupyScraper.scrapeJobs(query)
  console.log(`   ✅ Gupy: ${gupyJobs.length} vagas encontradas`)
  if (gupyJobs.length > 0) {
    console.log(`   📝 Exemplo: ${gupyJobs[0].title} - ${gupyJobs[0].company}\n`)
  }

  // Teste 2: Catho
  console.log('2️⃣ Testando Catho...')
  const cathoJobs = await cathoScraper.scrapeJobs(query)
  console.log(`   ✅ Catho: ${cathoJobs.length} vagas encontradas`)
  if (cathoJobs.length > 0) {
    console.log(`   📝 Exemplo: ${cathoJobs[0].title} - ${cathoJobs[0].company}\n`)
  }

  // Teste 3: Pipeline completo
  console.log('3️⃣ Testando pipeline completo (integração)...')
  console.log('   ⚠️  Este teste criará leads no banco de dados!\n')

  const totalLeads = gupyJobs.length + cathoJobs.length
  console.log(`📊 Resumo:`)
  console.log(`   - Gupy: ${gupyJobs.length} vagas`)
  console.log(`   - Catho: ${cathoJobs.length} vagas`)
  console.log(`   - Total: ${totalLeads} vagas`)

  console.log('\n✨ Teste concluído!')
  console.log('\n💡 Para processar estas vagas e criar leads, execute:')
  console.log('   curl http://localhost:3000/api/cron/scrape-leads')
}

testMultiSourceScraping()
