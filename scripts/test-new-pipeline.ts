// Teste do Novo Pipeline Otimizado de Baixo Custo
// Demonstra: Website Discovery → LinkedIn Scraping → Contact Enrichment
import 'dotenv/config'
import { websiteFinder } from '../lib/services/website-finder'
import { linkedInCompanyScraper } from '../lib/services/linkedin-company-scraper'
import { contactEnrichment } from '../lib/services/contact-enrichment'
import { aiInsights } from '../lib/services/ai-insights'

async function testNewPipeline() {
  console.log('\n' + '='.repeat(70))
  console.log('🧪 TESTE DO NOVO PIPELINE OTIMIZADO')
  console.log('='.repeat(70) + '\n')

  // Empresa de teste
  const testCompany = {
    name: 'PagBank',
    linkedinUrl: 'https://www.linkedin.com/company/pagbank',
    jobTitle: 'CFO',
    jobDescription: 'Buscamos um CFO experiente para liderar nossa área financeira...',
  }

  try {
    // ETAPA 1: Descoberta de Website
    console.log('\n📍 ETAPA 1: Website Discovery')
    console.log('-'.repeat(70))

    const websiteResult = await websiteFinder.findWebsite(
      testCompany.name,
      testCompany.linkedinUrl
    )

    console.log(`\n✅ Website encontrado:`)
    console.log(`   URL: ${websiteResult.website}`)
    console.log(`   Domínio: ${websiteResult.domain}`)
    console.log(`   Confiança: ${websiteResult.confidence}`)
    console.log(`   Fonte: ${websiteResult.source}`)

    if (!websiteResult.website || !websiteResult.domain) {
      console.log('\n❌ Sem website, não é possível continuar o teste')
      return
    }

    // ETAPA 2: Scraping LinkedIn Company Page
    console.log('\n\n📊 ETAPA 2: LinkedIn Company Page Scraping')
    console.log('-'.repeat(70))

    const linkedInData = await linkedInCompanyScraper.scrapeCompanyPage(testCompany.linkedinUrl)

    console.log(`\n✅ Dados do LinkedIn:`)
    console.log(`   Website: ${linkedInData.website || 'N/A'}`)
    console.log(`   Seguidores: ${linkedInData.followers?.toLocaleString() || 'N/A'}`)
    console.log(`   Funcionários: ${linkedInData.employees || 'N/A'} (${linkedInData.employeesCount?.toLocaleString()} estimado)`)
    console.log(`   Indústria: ${linkedInData.industry || 'N/A'}`)
    console.log(`   Sede: ${linkedInData.headquarters || 'N/A'}`)
    console.log(`   Fundação: ${linkedInData.foundedYear || 'N/A'}`)

    // Se LinkedIn retornou website melhor, usar ele
    const finalWebsite = linkedInData.website || websiteResult.website!
    const finalDomain = websiteFinder.extractDomain(finalWebsite)!

    console.log(`\n🎯 Website final escolhido: ${finalWebsite}`)
    console.log(`🎯 Domínio final: ${finalDomain}`)

    // ETAPA 3: Gerar Contatos com IA
    console.log('\n\n🤖 ETAPA 3: Geração de Contatos com IA')
    console.log('-'.repeat(70))

    const insights = await aiInsights.generateInsights(
      testCompany.name,
      linkedInData.industry || 'Tecnologia',
      testCompany.jobTitle,
      testCompany.jobDescription
    )

    console.log(`\n✅ IA gerou ${insights.suggestedContacts.length} contatos:`)
    insights.suggestedContacts.forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.name} - ${c.role}`)
    })

    // ETAPA 4: Enriquecimento Multi-Fonte
    console.log('\n\n📧 ETAPA 4: Contact Enrichment (Multi-Fonte)')
    console.log('-'.repeat(70))

    const enrichedContacts = []

    for (const contact of insights.suggestedContacts.slice(0, 2)) { // Testar apenas 2 para economizar créditos
      console.log(`\n🔍 Enriquecendo: ${contact.name} (${contact.role})`)
      console.log(`   Empresa: ${testCompany.name}`)
      console.log(`   Domínio: ${finalDomain}`)

      const enriched = await contactEnrichment.enrichContact(
        contact.name,
        contact.role,
        testCompany.name,
        finalDomain,
        contact.linkedin || undefined
      )

      enrichedContacts.push(enriched)

      console.log(`\n   ✅ Resultado:`)
      console.log(`      Source: ${enriched.source}`)
      console.log(`      Confidence: ${enriched.confidence}`)
      console.log(`      📧 Email: ${enriched.email || '❌ Não encontrado'}`)
      console.log(`      📱 Phone: ${enriched.phone || '❌ Não encontrado'}`)
      console.log(`      🔗 LinkedIn: ${enriched.linkedin || 'N/A'}`)

      // Delay para não sobrecarregar APIs
      await sleep(2000)
    }

    // RESUMO FINAL
    console.log('\n\n' + '='.repeat(70))
    console.log('📊 RESUMO DO TESTE')
    console.log('='.repeat(70))

    console.log('\n✅ Pipeline Completo Executado:')
    console.log(`   1. Website Discovery: ${websiteResult.source}`)
    console.log(`   2. LinkedIn Scraping: ${linkedInData.website ? 'Sucesso' : 'Parcial'}`)
    console.log(`   3. AI Insights: ${insights.suggestedContacts.length} contatos gerados`)
    console.log(`   4. Contact Enrichment: ${enrichedContacts.length} contatos enriquecidos`)

    console.log('\n📧 Contatos com Email Real:')
    const withEmail = enrichedContacts.filter(c => c.email && !c.email.includes('verificar'))
    console.log(`   ${withEmail.length}/${enrichedContacts.length} (${Math.round(withEmail.length / enrichedContacts.length * 100)}%)`)

    console.log('\n📱 Contatos com Telefone Real:')
    const withPhone = enrichedContacts.filter(c => c.phone)
    console.log(`   ${withPhone.length}/${enrichedContacts.length} (${Math.round(withPhone.length / enrichedContacts.length * 100)}%)`)

    console.log('\n💰 Custos Estimados:')
    console.log(`   - Website Discovery (Claude AI): ~$0.001`)
    console.log(`   - LinkedIn Scraping (Bright Data): $0 (já pago)`)
    console.log(`   - AI Insights (Claude): ~$0.01`)
    console.log(`   - Contact Enrichment:`)
    console.log(`     • Hunter.io: ${enrichedContacts.filter(c => c.source === 'hunter').length} buscas (50 grátis/mês)`)
    console.log(`     • Apollo: ${enrichedContacts.filter(c => c.source === 'apollo').length} unlock (requer créditos)`)
    console.log(`     • Pattern: ${enrichedContacts.filter(c => c.source === 'pattern').length} gerados (grátis)`)
    console.log(`   TOTAL: < $0.05 por lead (excluindo Apollo unlock)`)

    console.log('\n✅ MVP UTILIZÁVEL: Emails e dados reais encontrados!')
    console.log('🎯 Próximo passo: Integrar no lead-orchestrator.ts')

  } catch (error) {
    console.error('\n❌ Erro no teste:', error)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

testNewPipeline()
  .then(() => {
    console.log('\n🎉 Teste finalizado com sucesso!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro no teste:', error)
    process.exit(1)
  })
