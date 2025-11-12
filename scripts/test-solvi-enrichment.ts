// Script de diagnóstico - Testar enriquecimento completo da Solvi
import 'dotenv/config'
import { cnpjFinder } from '../lib/services/cnpj-finder'
import { companyEnrichment } from '../lib/services/company-enrichment'
import { websiteFinder } from '../lib/services/website-finder'
import { linkedInCompanyScraper } from '../lib/services/linkedin-company-scraper'
import { googlePeopleFinder } from '../lib/services/google-people-finder'

async function testSolviEnrichment() {
  console.log('\n' + '='.repeat(80))
  console.log('🔬 DIAGNÓSTICO COMPLETO: SOLVI')
  console.log('='.repeat(80) + '\n')

  const companyName = 'Solvi'
  const linkedinUrl = 'https://www.linkedin.com/company/solvi-participacoes-s-a-/'

  // ==========================================================================
  // ETAPA 1: CNPJ
  // ==========================================================================
  console.log('\n📍 ETAPA 1: Buscar CNPJ')
  console.log('-'.repeat(80))

  const cnpj = await cnpjFinder.findCNPJByName(companyName)

  if (cnpj) {
    console.log(`✅ CNPJ encontrado: ${cnpj}`)

    // Buscar dados na Receita Federal
    console.log(`\n🔍 Buscando dados na Receita Federal...`)
    const cnpjData = await companyEnrichment.getCompanyByCNPJ(cnpj)

    if (cnpjData) {
      console.log(`✅ Dados encontrados:`)
      console.log(`   Nome: ${cnpjData.name}`)
      console.log(`   CNPJ: ${cnpjData.cnpj}`)
      console.log(`   Faturamento: ${cnpjData.revenue ? `R$ ${(cnpjData.revenue / 1_000_000).toFixed(1)}M` : 'N/A'}`)
      console.log(`   Funcionários: ${cnpjData.employees || 'N/A'}`)
      console.log(`   Setor: ${cnpjData.sector || 'N/A'}`)
      console.log(`   Website: ${cnpjData.website || 'N/A'}`)
    } else {
      console.log(`❌ Nenhum dado retornado pela Brasil API`)
    }
  } else {
    console.log(`❌ CNPJ não encontrado no database local`)
  }

  // ==========================================================================
  // ETAPA 2: WEBSITE DISCOVERY
  // ==========================================================================
  console.log('\n\n📍 ETAPA 2: Website Discovery')
  console.log('-'.repeat(80))

  const websiteResult = await websiteFinder.findWebsite(
    companyName,
    linkedinUrl,
    undefined
  )

  console.log(`Website: ${websiteResult.website || 'N/A'}`)
  console.log(`Domínio: ${websiteResult.domain || 'N/A'}`)
  console.log(`Confiança: ${websiteResult.confidence}`)
  console.log(`Fonte: ${websiteResult.source}`)

  // ==========================================================================
  // ETAPA 3: LINKEDIN COMPANY SCRAPING
  // ==========================================================================
  console.log('\n\n📍 ETAPA 3: LinkedIn Company Scraping')
  console.log('-'.repeat(80))

  try {
    const linkedInData = await linkedInCompanyScraper.scrapeCompanyPage(linkedinUrl)

    console.log(`✅ Scraping bem-sucedido:`)
    console.log(`   Seguidores: ${linkedInData.followers?.toLocaleString() || 'N/A'}`)
    console.log(`   Funcionários: ${linkedInData.employees || 'N/A'} (${linkedInData.employeesCount || 'N/A'})`)
    console.log(`   Indústria: ${linkedInData.industry || 'N/A'}`)
    console.log(`   Sede: ${linkedInData.headquarters || 'N/A'}`)
    console.log(`   Website: ${linkedInData.website || 'N/A'}`)
  } catch (error: any) {
    console.log(`❌ Erro no scraping LinkedIn:`)
    console.log(`   ${error.message}`)
  }

  // ==========================================================================
  // ETAPA 4: GOOGLE PEOPLE FINDER
  // ==========================================================================
  console.log('\n\n📍 ETAPA 4: Google People Finder')
  console.log('-'.repeat(80))

  const website = websiteResult.website || 'https://www.solvi.com'
  const roles = ['CFO', 'Finance Director', 'Diretor Financeiro', 'Controller', 'Gerente Financeiro']

  console.log(`Buscando pessoas para: ${companyName}`)
  console.log(`Website: ${website}`)
  console.log(`Cargos: ${roles.join(', ')}\n`)

  const realPeople = await googlePeopleFinder.findRealPeople(
    companyName,
    website,
    roles
  )

  if (realPeople.length > 0) {
    console.log(`\n✅ ${realPeople.length} pessoas encontradas:\n`)

    realPeople.forEach((person, i) => {
      console.log(`${i + 1}. ${person.name}`)
      console.log(`   Cargo: ${person.role}`)
      console.log(`   Email: ${person.email || '❌'}`)
      console.log(`   Phone: ${person.phone || '❌'}`)
      console.log(`   LinkedIn: ${person.linkedinUrl || '❌'}`)
      console.log(`   Confiança: ${person.confidence}`)
      console.log(`   Fonte: ${person.source}`)
      console.log()
    })
  } else {
    console.log(`❌ Nenhuma pessoa encontrada`)
    console.log(`\n💡 Possíveis razões:`)
    console.log(`   1. Bright Data APIs não configuradas ou com erro`)
    console.log(`   2. Website incorreto ou sem página de equipe`)
    console.log(`   3. Google não retornou resultados relevantes`)
  }

  // ==========================================================================
  // RESUMO
  // ==========================================================================
  console.log('\n\n' + '='.repeat(80))
  console.log('📊 RESUMO DO DIAGNÓSTICO')
  console.log('='.repeat(80) + '\n')

  console.log(`CNPJ encontrado: ${cnpj ? '✅' : '❌'}`)
  console.log(`Website descoberto: ${websiteResult.website ? '✅' : '❌'}`)
  console.log(`Pessoas REAIS encontradas: ${realPeople.length > 0 ? `✅ (${realPeople.length})` : '❌'}`)

  console.log('\n💡 PRÓXIMOS PASSOS:')
  if (!cnpj) {
    console.log(`   1. Adicionar CNPJ da Solvi no database local (lib/services/cnpj-finder.ts)`)
  }
  if (!websiteResult.website) {
    console.log(`   2. Verificar se Claude AI está configurado para Website Discovery`)
  }
  if (realPeople.length === 0) {
    console.log(`   3. Verificar credenciais Bright Data (SERP_API_URL, WEB_UNLOCKER_URL)`)
    console.log(`   4. Testar manualmente: buscar "CFO Solvi" no Google`)
  }

  console.log('\n')
}

testSolviEnrichment()
  .then(() => {
    console.log('✅ Diagnóstico concluído!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Erro:', error)
    process.exit(1)
  })
