// Teste da integração Apollo.io
import 'dotenv/config'
import { apolloEnrichment } from '../lib/services/apollo-enrichment'

async function testApollo() {
  console.log('🧪 Testando Apollo.io API\n')

  // Teste 1: Buscar decisores financeiros em empresas conhecidas
  const testCompanies = [
    {
      name: 'Magazine Luiza',
      domain: 'magazineluiza.com.br',
    },
    {
      name: 'Nubank',
      domain: 'nubank.com.br',
    },
    {
      name: 'Ambev',
      domain: 'ambev.com.br',
    },
  ]

  for (const company of testCompanies) {
    console.log(`${'='.repeat(60)}`)
    console.log(`🏢 Empresa: ${company.name}`)
    console.log(`🌐 Domínio: ${company.domain}`)
    console.log(`${'='.repeat(60)}\n`)

    try {
      const contacts = await apolloEnrichment.findFinancialDecisionMakers(
        company.name,
        company.domain
      )

      if (contacts.length > 0) {
        console.log(`✅ Encontrados ${contacts.length} decisores:\n`)

        contacts.forEach((contact, i) => {
          console.log(`${i + 1}. ${contact.name}`)
          console.log(`   Cargo: ${contact.role}`)
          console.log(`   Email: ${contact.email || '❌ Não disponível'}`)
          console.log(`   Telefone: ${contact.phone || '❌ Não disponível'}`)
          console.log(`   LinkedIn: ${contact.linkedin || '❌ Não disponível'}`)
          console.log()
        })
      } else {
        console.log('⚠️ Nenhum decisor encontrado\n')
      }

      // Delay entre empresas
      await sleep(2000)
    } catch (error) {
      console.error('❌ Erro:', error)
      console.log()
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO')
  console.log('='.repeat(60))
  console.log('\n✅ Teste completo!')
  console.log('\n💡 Apollo.io busca:')
  console.log('   - Emails corporativos REAIS (não genéricos)')
  console.log('   - Telefones diretos')
  console.log('   - Cargos e funções atualizados')
  console.log('   - Perfis LinkedIn')
  console.log('\n📝 Próximos passos:')
  console.log('   1. Sistema já está integrado ao lead-orchestrator')
  console.log('   2. Ao criar leads, contatos serão enriquecidos automaticamente')
  console.log('   3. Emails e telefones REAIS substituirão os genéricos')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

testApollo()
  .then(() => {
    console.log('\n🎉 Teste finalizado!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro no teste:', error)
    process.exit(1)
  })
