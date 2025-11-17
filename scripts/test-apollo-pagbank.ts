// Teste Apollo com PagBank
import 'dotenv/config'
import { apolloEnrichment } from '../lib/services/apollo-enrichment'

async function test() {
  console.log('🧪 Testando Apollo com PagBank\n')

  const contacts = await apolloEnrichment.findFinancialDecisionMakers('PagBank', 'pagbank.com')

  console.log('\n📊 RESULTADO:')
  console.log('='.repeat(60))
  console.log(`Total: ${contacts.length} contatos com emails REAIS\n`)

  contacts.forEach((contact, i) => {
    console.log(`${i + 1}. ${contact.name}`)
    console.log(`   Cargo: ${contact.role}`)
    console.log(`   📧 Email: ${contact.email || 'N/A'}`)
    console.log(`   📱 Telefone: ${contact.phone || 'N/A'}`)
    console.log(`   🔗 LinkedIn: ${contact.linkedin || 'N/A'}`)
    console.log()
  })

  console.log('✅ Teste concluído!')
  console.log('\n💰 Créditos gastos: ' + contacts.length)
  console.log('💡 Plano Free: 50 unlocks/mês')
}

test().then(() => process.exit(0)).catch(console.error)
