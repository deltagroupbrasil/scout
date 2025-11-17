// Teste do pipeline completo: LinkedIn → Google People Finder → Apollo → Save Lead
import 'dotenv/config'
import { leadOrchestrator } from '../lib/services/lead-orchestrator'

async function testFullPipeline() {
  console.log('🧪 TESTE DO PIPELINE COMPLETO\n')
  console.log('='.repeat(70))
  console.log('📊 Este teste vai:\n')
  console.log('  1. Simular uma vaga do LinkedIn')
  console.log('  2. Buscar empresa e enriquecer dados')
  console.log('  3. Buscar decisores via Google + Apollo')
  console.log('  4. Salvar lead no banco de dados\n')
  console.log('='.repeat(70))

  // Simular vaga do LinkedIn (PagBank - sabemos que Apollo tem dados)
  const mockJob = {
    jobTitle: 'Controller Pleno',
    companyName: 'PagBank',
    description: `
      Estamos buscando um Controller Pleno para integrar nosso time de Controladoria.

      Responsabilidades:
      - Análise de demonstrações financeiras
      - Gestão de processos contábeis
      - Suporte ao planejamento financeiro
      - Controles internos e compliance

      Requisitos:
      - Formação em Ciências Contábeis
      - Experiência mínima de 5 anos
      - Conhecimento em IFRS
      - Excel avançado
    `,
    jobUrl: 'https://www.linkedin.com/jobs/view/controller-pagbank-123456',
    postedDate: new Date().toISOString(),
    applicants: 45,
    location: 'São Paulo, SP'
  }

  console.log('\n📋 Vaga de Teste:')
  console.log(`   Cargo: ${mockJob.jobTitle}`)
  console.log(`   Empresa: ${mockJob.companyName}`)
  console.log(`   URL: ${mockJob.jobUrl}`)
  console.log(`   Candidatos: ${mockJob.applicants}`)
  console.log(`   Data: ${new Date(mockJob.postedDate).toLocaleDateString()}`)

  console.log('\n🚀 Iniciando processamento...\n')
  console.log('='.repeat(70))

  try {
    const leadId = await leadOrchestrator.processJobListing(mockJob)

    if (leadId) {
      console.log('\n' + '='.repeat(70))
      console.log('🎉 SUCESSO!')
      console.log('='.repeat(70))
      console.log(`\n✅ Lead criado com ID: ${leadId}`)
      console.log('\n📊 Para ver o lead:')
      console.log(`   1. Dashboard: http://localhost:3000/dashboard`)
      console.log(`   2. Detalhes: http://localhost:3000/dashboard/leads/${leadId}`)
      console.log(`   3. Prisma Studio: npx prisma studio`)
      console.log('\n💡 Comandos úteis:')
      console.log(`   - Ver lead: npx prisma studio`)
      console.log(`   - Verificar contatos: SELECT suggestedContacts FROM leads WHERE id="${leadId}"`)
    } else {
      console.log('\n❌ Falha ao criar lead')
      console.log('   Verifique os logs acima para detalhes')
    }
  } catch (error) {
    console.error('\n❌ ERRO NO PIPELINE:')
    console.error(error)
  }

  console.log('\n' + '='.repeat(70))
  console.log('📈 ANÁLISE DO TESTE')
  console.log('='.repeat(70))
  console.log('\nESTRATÉGIAS TESTADAS:')
  console.log('  1. Google Search (Bright Data) - Busca "CFO PagBank email"')
  console.log('  2. Website Scraping (Bright Data) - Busca página "Equipe"')
  console.log('  3. Diretórios (Bright Data) - Busca Crunchbase, etc')
  console.log('  4. Apollo.io - Busca decisores verificados')
  console.log('\nRESULTADO ESPERADO:')
  console.log('  ✅ Apollo deve encontrar: Artur Schunck (CFO)')
  console.log('  ✅ Email: aschunck@pagseguro.com')
  console.log('  ✅ Lead salvo com contatos REAIS')
}

testFullPipeline()
  .then(() => {
    console.log('\n✅ Teste completo finalizado!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro fatal:', error)
    process.exit(1)
  })
