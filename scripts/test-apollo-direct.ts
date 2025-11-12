// Teste direto da API Apollo com empresas conhecidas e domínios reais
import 'dotenv/config' // Carregar variáveis de ambiente
import { apolloEnrichment } from '../lib/services/apollo-enrichment'

async function testApolloDirect() {
  console.log('🧪 Testando Apollo.io com domínios corporativos REAIS\n')

  // Empresas brasileiras conhecidas com domínios reais
  const testCompanies = [
    { name: 'PagBank', domain: 'pagbank.com.br' },
    { name: 'Embraer', domain: 'embraer.com' },
    { name: 'Porto', domain: 'portoseguro.com.br' },
    { name: 'Raízen', domain: 'raizen.com.br' },
    { name: 'Siemens', domain: 'siemens.com.br' },
  ]

  for (const company of testCompanies) {
    console.log(`${'='.repeat(60)}`)
    console.log(`🏢 ${company.name}`)
    console.log(`🌐 ${company.domain}`)
    console.log(`${'='.repeat(60)}\n`)

    try {
      const contacts = await apolloEnrichment.findFinancialDecisionMakers(
        company.name,
        company.domain
      )

      if (contacts.length > 0) {
        console.log(`✅ Encontrados ${contacts.length} decisores:\n`)
        contacts.forEach((c, i) => {
          console.log(`${i + 1}. ${c.name}`)
          console.log(`   Cargo: ${c.role}`)
          console.log(`   📧 ${c.email || 'N/A'}`)
          console.log(`   📱 ${c.phone || 'N/A'}`)
          console.log(`   🔗 ${c.linkedin || 'N/A'}`)
          console.log()
        })
      } else {
        console.log('⚠️  Nenhum decisor encontrado\n')
      }

      // Delay entre requests
      await sleep(2000)
    } catch (error) {
      console.error('❌ Erro:', error)
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

testApolloDirect()
  .then(() => {
    console.log('\n✅ Teste finalizado!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
