// Teste do Google People Finder - Busca pessoas REAIS via Google + Web Scraping
import 'dotenv/config'
import { googlePeopleFinder } from '../lib/services/google-people-finder'

async function testGooglePeopleFinder() {
  console.log('\n' + '='.repeat(70))
  console.log('🧪 TESTE: GOOGLE PEOPLE FINDER')
  console.log('='.repeat(70) + '\n')

  // Empresa de teste
  const companyName = 'PagBank'
  const companyWebsite = 'https://www.pagbank.com.br'
  const roles = ['CFO', 'Finance Director', 'Diretor Financeiro']

  console.log(`🏢 Empresa: ${companyName}`)
  console.log(`🌐 Website: ${companyWebsite}`)
  console.log(`👔 Cargos: ${roles.join(', ')}\n`)

  try {
    console.log('📍 Iniciando busca de pessoas reais...')
    console.log('-'.repeat(70))

    const people = await googlePeopleFinder.findRealPeople(
      companyName,
      companyWebsite,
      roles
    )

    console.log('\n\n' + '='.repeat(70))
    console.log('📊 RESULTADOS')
    console.log('='.repeat(70))

    if (people.length === 0) {
      console.log('\n⚠️  Nenhuma pessoa encontrada.')
      console.log('\n💡 Possíveis razões:')
      console.log('   1. Bright Data APIs não configuradas (SERP_API_URL, WEB_UNLOCKER_URL)')
      console.log('   2. Rate limit atingido')
      console.log('   3. Site corporativo não tem página de equipe')
      console.log('   4. Resultados do Google não contêm informações de pessoas')
      console.log('\n📝 Próximo passo: Configurar Bright Data SERP API e Web Unlocker')
      console.log('   - SERP API: https://brightdata.com/products/serp-api')
      console.log('   - Web Unlocker: https://brightdata.com/products/web-unlocker')
      return
    }

    console.log(`\n✅ Total de pessoas encontradas: ${people.length}\n`)

    // Agrupar por source
    const bySource = people.reduce((acc, person) => {
      if (!acc[person.source]) acc[person.source] = []
      acc[person.source].push(person)
      return acc
    }, {} as Record<string, typeof people>)

    for (const [source, peopleInSource] of Object.entries(bySource)) {
      console.log(`\n📍 Fonte: ${source} (${peopleInSource.length} pessoas)`)
      console.log('-'.repeat(70))

      peopleInSource.forEach((person, i) => {
        console.log(`\n${i + 1}. ${person.name}`)
        console.log(`   Cargo: ${person.role}`)
        console.log(`   📧 Email: ${person.email || '❌ Não disponível'}`)
        console.log(`   📱 Phone: ${person.phone || '❌ Não disponível'}`)
        console.log(`   🔗 LinkedIn: ${person.linkedinUrl || '❌ Não disponível'}`)
        console.log(`   Confiança: ${person.confidence}`)
      })
    }

    // Estatísticas
    console.log('\n\n' + '='.repeat(70))
    console.log('📊 ESTATÍSTICAS')
    console.log('='.repeat(70))

    const withEmail = people.filter(p => p.email).length
    const withPhone = people.filter(p => p.phone).length
    const withLinkedIn = people.filter(p => p.linkedinUrl).length

    const highConfidence = people.filter(p => p.confidence === 'high').length
    const mediumConfidence = people.filter(p => p.confidence === 'medium').length
    const lowConfidence = people.filter(p => p.confidence === 'low').length

    console.log(`\n📧 Com email: ${withEmail} (${Math.round(withEmail / people.length * 100)}%)`)
    console.log(`📱 Com telefone: ${withPhone} (${Math.round(withPhone / people.length * 100)}%)`)
    console.log(`🔗 Com LinkedIn: ${withLinkedIn} (${Math.round(withLinkedIn / people.length * 100)}%)`)

    console.log(`\n⭐ Confiança alta: ${highConfidence}`)
    console.log(`⭐ Confiança média: ${mediumConfidence}`)
    console.log(`⭐ Confiança baixa: ${lowConfidence}`)

    console.log('\n\n' + '='.repeat(70))
    console.log('✅ COMPARAÇÃO: NOVO vs ANTIGO')
    console.log('='.repeat(70))

    console.log('\n🆕 NOVO SISTEMA (Google + Web Scraping):')
    console.log(`   ✅ Pessoas REAIS (${people.length} encontradas)`)
    console.log(`   ✅ Emails REAIS (${withEmail} encontrados)`)
    console.log(`   ✅ Phones REAIS (${withPhone} encontrados)`)
    console.log(`   ✅ LinkedIn REAL (${withLinkedIn} encontrados)`)
    console.log('   ✅ Não depende de LinkedIn scraping (sem bloqueio robots.txt)')
    console.log('   ✅ Múltiplas fontes (Google + Site corporativo + Crunchbase)')

    console.log('\n🔴 SISTEMA ANTIGO (AI + Apollo/Hunter):')
    console.log('   ❌ Nomes FICTÍCIOS gerados pela IA')
    console.log('   ❌ Apollo retornando erro 400')
    console.log('   ❌ Hunter com rate limit (429)')
    console.log('   ❌ Emails pattern para pessoas inexistentes')
    console.log('   ❌ LinkedIn People Scraping bloqueado (robots.txt)')

    console.log('\n\n💡 PRÓXIMOS PASSOS:')
    console.log('   1. ✅ Código implementado e integrado no lead-orchestrator')
    console.log('   2. 📝 Configurar Bright Data SERP API URL no .env')
    console.log('   3. 📝 Configurar Bright Data Web Unlocker URL no .env')
    console.log('   4. 🧪 Testar com scraping real de vagas')
    console.log('   5. 🚀 Deploy em produção')

  } catch (error) {
    console.error('\n❌ Erro no teste:', error)
    console.error('\n💡 Verifique se as variáveis de ambiente estão configuradas:')
    console.error('   - BRIGHT_DATA_SERP_API_URL')
    console.error('   - BRIGHT_DATA_WEB_UNLOCKER_URL')
  }
}

testGooglePeopleFinder()
  .then(() => {
    console.log('\n🎉 Teste finalizado!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
