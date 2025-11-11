import 'dotenv/config'
import { leadOrchestrator } from '../lib/services/lead-orchestrator'
import { gupyScraper } from '../lib/services/gupy-scraper'
import { cathoScraper } from '../lib/services/catho-scraper'

async function populateWithMockData() {
  console.log('🚀 Populando sistema com dados mock...\n')

  // 1. Buscar vagas do Gupy (mock)
  console.log('1️⃣ Buscando vagas no Gupy...')
  const gupyJobs = await gupyScraper.scrapeJobs('Controller Controladoria')
  console.log(`   ✅ ${gupyJobs.length} vagas encontradas no Gupy\n`)

  // 2. Buscar vagas do Catho (mock)
  console.log('2️⃣ Buscando vagas no Catho...')
  const cathoJobs = await cathoScraper.scrapeJobs('Controller Financeiro')
  console.log(`   ✅ ${cathoJobs.length} vagas encontradas no Catho\n`)

  // 3. Processar todas as vagas
  const allJobs = [...gupyJobs, ...cathoJobs]
  console.log(`📊 Total de vagas para processar: ${allJobs.length}\n`)

  console.log('🔄 Processando vagas (isso pode demorar alguns minutos)...\n')

  let successCount = 0
  let skippedCount = 0

  for (const job of allJobs) {
    console.log(`⏳ Processando: ${job.company} - ${job.title}`)

    try {
      const leadId = await leadOrchestrator.processJobListing(job)

      if (leadId) {
        successCount++
        console.log(`   ✅ Lead criado com sucesso!\n`)
      } else {
        skippedCount++
        console.log(`   ⚠️  Lead já existe ou houve erro\n`)
      }

      // Delay entre requisições para não sobrecarregar APIs
      await new Promise(resolve => setTimeout(resolve, 2000))
    } catch (error) {
      console.error(`   ❌ Erro:`, error instanceof Error ? error.message : error)
      skippedCount++
    }
  }

  console.log('\n' + '═'.repeat(60))
  console.log('✨ Processamento concluído!')
  console.log('═'.repeat(60))
  console.log(`✅ Leads criados: ${successCount}`)
  console.log(`⚠️  Ignorados/Erro: ${skippedCount}`)
  console.log(`📊 Total processado: ${allJobs.length}`)
  console.log('\n💡 Acesse http://localhost:3000 para ver os novos leads!')
}

populateWithMockData()
