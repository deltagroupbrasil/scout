/**
 * Teste rápido com 3 empresas
 */

import { leadOrchestrator } from '@/lib/services/lead-orchestrator'

async function test() {
  console.log('🚀 Iniciando teste com 3 empresas...')

  const result = await leadOrchestrator.scrapeAndProcessLeads({
    query: 'Controller São Paulo',
    maxCompanies: 3
  })

  console.log('\n✅ RESULTADO:')
  console.log(`   Total jobs: ${result.totalJobs}`)
  console.log(`   Leads salvos: ${result.savedLeads}`)
  console.log(`   Empresas processadas: ${result.companiesProcessed}`)
  console.log(`   Erros: ${result.errors.length}`)

  if (result.errors.length > 0) {
    console.log('\n❌ Erros:')
    result.errors.forEach((error, idx) => {
      console.log(`   ${idx + 1}. ${error}`)
    })
  }
}

test()
  .then(() => {
    console.log('\n✅ Teste concluído')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
