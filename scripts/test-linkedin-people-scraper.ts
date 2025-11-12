// Teste do LinkedIn People Scraper - Busca pessoas REAIS
import 'dotenv/config'
import { linkedInPeopleScraper } from '../lib/services/linkedin-people-scraper'

async function testLinkedInPeopleScraper() {
  console.log('\n' + '='.repeat(70))
  console.log('🧪 TESTE: LINKEDIN PEOPLE SCRAPER')
  console.log('='.repeat(70) + '\n')

  // Empresa de teste
  const companyName = 'PagBank'
  const roles = ['CFO', 'Finance Director', 'Diretor Financeiro']

  console.log(`🏢 Empresa: ${companyName}`)
  console.log(`👔 Cargos: ${roles.join(', ')}\n`)

  try {
    // ETAPA 1: Buscar pessoas por cargo
    console.log('📍 ETAPA 1: Buscar pessoas na empresa por cargo')
    console.log('-'.repeat(70))

    const people = await linkedInPeopleScraper.searchPeopleByRole(
      companyName,
      roles
    )

    console.log(`\n✅ Encontradas ${people.length} pessoas:`)
    people.forEach((person, i) => {
      console.log(`\n${i + 1}. ${person.name}`)
      console.log(`   Cargo: ${person.role}`)
      console.log(`   LinkedIn: ${person.linkedinUrl}`)
      console.log(`   Localização: ${person.location || 'N/A'}`)
    })

    if (people.length === 0) {
      console.log('\n⚠️  Nenhuma pessoa encontrada. Isso pode acontecer se:')
      console.log('   - LinkedIn está bloqueando scraping (rate limit)')
      console.log('   - Seletores HTML mudaram')
      console.log('   - Bright Data precisa de autenticação')
      return
    }

    // ETAPA 2: Fazer scraping detalhado do primeiro perfil
    console.log('\n\n📍 ETAPA 2: Scraping detalhado do perfil')
    console.log('-'.repeat(70))

    const firstPerson = people[0]
    console.log(`\n🔍 Extraindo dados de: ${firstPerson.name}`)

    const profileDetails = await linkedInPeopleScraper.scrapePersonProfile(firstPerson.linkedinUrl)

    if (profileDetails) {
      console.log(`\n✅ Dados extraídos:`)
      console.log(`   Nome: ${profileDetails.name}`)
      console.log(`   Cargo: ${profileDetails.role}`)
      console.log(`   LinkedIn: ${profileDetails.linkedinUrl}`)
      console.log(`   📧 Email: ${profileDetails.email || '❌ Não disponível publicamente'}`)
      console.log(`   📱 Phone: ${profileDetails.phone || '❌ Não disponível publicamente'}`)
      console.log(`   📍 Location: ${profileDetails.location || 'N/A'}`)
      console.log(`   💼 Headline: ${profileDetails.headline || 'N/A'}`)

      if (profileDetails.experience && profileDetails.experience.length > 0) {
        console.log(`\n   📊 Experiência:`)
        profileDetails.experience.slice(0, 3).forEach((exp, i) => {
          console.log(`      ${i + 1}. ${exp.title} @ ${exp.company}`)
          if (exp.duration) console.log(`         ${exp.duration}`)
        })
      }
    } else {
      console.log(`\n❌ Não foi possível extrair dados do perfil`)
    }

    // RESUMO
    console.log('\n\n' + '='.repeat(70))
    console.log('📊 RESUMO DO TESTE')
    console.log('='.repeat(70))

    const withEmail = people.filter(p => profileDetails?.email).length
    const withPhone = people.filter(p => profileDetails?.phone).length

    console.log(`\n✅ Pessoas encontradas: ${people.length}`)
    console.log(`📧 Com email público: ${withEmail}`)
    console.log(`📱 Com telefone público: ${withPhone}`)

    console.log(`\n💡 Próximos passos:`)
    console.log(`   1. Integrar no lead-orchestrator para buscar pessoas REAIS`)
    console.log(`   2. Combinar com Hunter.io/Apollo para emails não públicos`)
    console.log(`   3. Usar LinkedIn URL + nome para buscar email em outras fontes`)

    console.log(`\n⚠️  IMPORTANTE:`)
    console.log(`   - Emails raramente estão públicos no LinkedIn`)
    console.log(`   - Precisamos usar nome + empresa + cargo para buscar em Apollo/Hunter`)
    console.log(`   - LinkedIn URL é valioso para outras ferramentas de enriquecimento`)

  } catch (error) {
    console.error('\n❌ Erro no teste:', error)
  }
}

testLinkedInPeopleScraper()
  .then(() => {
    console.log('\n🎉 Teste finalizado!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
