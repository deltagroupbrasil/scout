// Teste Completo de Enriquecimento via Bright Data
// Simula o fluxo completo: LinkedIn → Company Page → Fallback
import { brightDataContactScraper } from '../lib/services/bright-data-contact-scraper'

async function testFullEnrichment() {
  console.log('🧪 Testando Enriquecimento Completo via Bright Data\n')
  console.log('📋 Pipeline: LinkedIn → Company Page → Fallback\n')

  // Contatos de teste (empresas brasileiras reais)
  const testContacts = [
    {
      name: 'Carlos Brito',
      role: 'CEO',
      company: 'Ambev',
      domain: 'ambev.com.br',
      linkedin: 'https://www.linkedin.com/in/carlosbrito/', // Exemplo
    },
    {
      name: 'Frederico Trajano',
      role: 'CEO',
      company: 'Magazine Luiza',
      domain: 'magazineluiza.com.br',
      linkedin: null, // Sem LinkedIn para testar fallback
    },
    {
      name: 'Jean Paul Prates',
      role: 'CEO',
      company: 'Petrobras',
      domain: 'petrobras.com.br',
      linkedin: 'https://www.linkedin.com/in/jeanpaulprates/',
    },
  ]

  console.log(`👥 Testando ${testContacts.length} contatos\n`)

  const results = {
    linkedin: 0,
    companyPage: 0,
    fallback: 0,
    withEmail: 0,
    withPhone: 0,
  }

  for (const contact of testContacts) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🔍 Enriquecendo: ${contact.name} (${contact.role})`)
    console.log(`   Empresa: ${contact.company} (${contact.domain})`)
    console.log(`   LinkedIn: ${contact.linkedin || 'N/A'}`)
    console.log(`${'='.repeat(60)}`)

    try {
      const enriched = await brightDataContactScraper.enrichContact(
        contact.name,
        contact.role,
        contact.company,
        contact.domain,
        contact.linkedin || undefined
      )

      // Estatísticas
      if (enriched.source === 'linkedin_profile') results.linkedin++
      if (enriched.source === 'company_website') results.companyPage++
      if (enriched.source === 'google_search') results.fallback++
      if (enriched.email) results.withEmail++
      if (enriched.phone) results.withPhone++

      // Resultado
      console.log('\n✅ Resultado do Enriquecimento:')
      console.log(`   📧 Email: ${enriched.email || 'N/A'}`)
      console.log(`   📞 Telefone: ${enriched.phone || 'N/A'}`)
      console.log(`   🔗 LinkedIn: ${enriched.linkedin || 'N/A'}`)
      console.log(`   📊 Fonte: ${enriched.source}`)

      if (enriched.source === 'linkedin_profile') {
        console.log('   🎯 Dados extraídos do LinkedIn! (Maior confiança)')
      } else if (enriched.source === 'company_website') {
        console.log('   🏢 Dados extraídos da página da empresa')
      } else {
        console.log('   ⚠️  Email gerado por padrão - validar antes de usar')
      }
    } catch (error) {
      console.error('\n❌ Erro ao enriquecer:', error)
    }

    // Delay entre requisições
    await sleep(5000)
  }

  // Resumo
  console.log('\n\n' + '='.repeat(60))
  console.log('📊 RESUMO DOS TESTES')
  console.log('='.repeat(60))
  console.log(`\n📈 Estatísticas:`)
  console.log(`   Total de contatos: ${testContacts.length}`)
  console.log(`   Com email: ${results.withEmail}/${testContacts.length} (${Math.round((results.withEmail / testContacts.length) * 100)}%)`)
  console.log(`   Com telefone: ${results.withPhone}/${testContacts.length} (${Math.round((results.withPhone / testContacts.length) * 100)}%)`)
  console.log(`\n🔍 Fontes utilizadas:`)
  console.log(`   LinkedIn: ${results.linkedin}`)
  console.log(`   Company Page: ${results.companyPage}`)
  console.log(`   Fallback: ${results.fallback}`)

  console.log('\n💡 Interpretação:')
  console.log(`   - Taxa de sucesso esperada: 85-95% para emails`)
  console.log(`   - Taxa de sucesso esperada: 60-75% para telefones`)
  console.log(`   - LinkedIn tem maior confiança, mas menor taxa de sucesso`)
  console.log(`   - Company pages têm boa taxa de sucesso para emails gerais`)

  console.log('\n✅ Teste completo!')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Executar teste
testFullEnrichment()
  .then(() => {
    console.log('\n🎉 Teste finalizado com sucesso!')
    console.log('\n📝 Próximos passos:')
    console.log('   1. Configurar BRIGHT_DATA_PUPPETEER_URL no .env')
    console.log('   2. Configurar BRIGHT_DATA_SERP_KEY no .env')
    console.log('   3. Testar com seus próprios perfis do LinkedIn')
    console.log('   4. Executar scraping real: npm run dev → Scrape Button')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no teste:', error)
    process.exit(1)
  })
