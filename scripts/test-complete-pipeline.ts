import 'dotenv/config'
import { leadOrchestrator } from '../lib/services/lead-orchestrator'
import { linkedInScraper } from '../lib/services/linkedin-scraper'

async function testCompletePipeline() {
  console.log('=' .repeat(70))
  console.log('TESTE COMPLETO - Pipeline de Descoberta Automatica')
  console.log('=' .repeat(70))
  console.log()

  try {
    // Etapa 1: Scraping do LinkedIn
    console.log('1. Scraping LinkedIn (Controller Sao Paulo)...')
    console.log()

    const jobs = await linkedInScraper.searchJobs(
      'Controller OR CFO OR Controladoria',
      'Sao Paulo, Brazil',
      1
    )

    console.log('Vagas encontradas:', jobs.length)

    if (jobs.length === 0) {
      console.log('Nenhuma vaga encontrada. Verifique as credenciais do Bright Data.')
      return
    }

    // Pegar a primeira vaga para teste
    const testJob = jobs[0]
    console.log()
    console.log('Vaga selecionada para teste:')
    console.log('  Titulo:', testJob.jobTitle)
    console.log('  Empresa:', testJob.companyName)
    console.log('  URL:', testJob.jobUrl)
    console.log()

    // Etapa 2: Processar com Lead Orchestrator (fluxo completo)
    console.log('2. Processando com Lead Orchestrator (Discovery Automatica)...')
    console.log()

    const leadId = await leadOrchestrator.processJobListing(testJob)

    if (leadId) {
      console.log()
      console.log('=' .repeat(70))
      console.log('SUCESSO! Lead criado:', leadId)
      console.log('=' .repeat(70))
      console.log()
      console.log('Verifique no dashboard em: http://localhost:3000/dashboard')
    } else {
      console.log()
      console.log('Falha ao criar lead. Verifique os logs acima.')
    }

  } catch (error) {
    console.error()
    console.error('ERRO durante o teste:')
    console.error(error)
  }
}

testCompletePipeline()
  .then(() => {
    console.log()
    console.log('Teste concluido!')
    process.exit(0)
  })
  .catch(error => {
    console.error('Erro fatal:', error)
    process.exit(1)
  })
