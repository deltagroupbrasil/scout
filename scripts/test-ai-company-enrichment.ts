// Teste de Enriquecimento de Empresas com IA
// Testa busca de notícias, eventos, Instagram e insights via Claude AI

import { aiCompanyEnrichment } from '../lib/services/ai-company-enrichment'

async function testAIEnrichment() {
  console.log('🧪 Testando Enriquecimento de Empresas com IA\n')

  // Empresas brasileiras para teste
  const testCompanies = [
    {
      name: 'Magazine Luiza',
      sector: 'Varejo',
      website: 'https://www.magazineluiza.com.br',
    },
    {
      name: 'Nubank',
      sector: 'Fintech',
      website: 'https://www.nubank.com.br',
    },
    {
      name: 'Ambev',
      sector: 'Bebidas',
      website: 'https://www.ambev.com.br',
    },
  ]

  for (const company of testCompanies) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`🏢 Enriquecendo: ${company.name}`)
    console.log(`   Setor: ${company.sector}`)
    console.log(`   Website: ${company.website}`)
    console.log(`${'='.repeat(60)}`)

    try {
      const enriched = await aiCompanyEnrichment.enrichCompany(
        company.name,
        company.sector,
        company.website
      )

      // Resultado
      console.log('\n✅ Resultado do Enriquecimento:')
      console.log(`\n💰 Faturamento Estimado: ${enriched.estimatedRevenue || 'N/A'}`)
      console.log(`👥 Funcionários Estimados: ${enriched.estimatedEmployees || 'N/A'}`)
      console.log(`📊 Posição no Mercado: ${enriched.industryPosition || 'N/A'}`)

      if (enriched.socialMedia.instagram) {
        console.log(`\n📱 Instagram:`)
        console.log(`   Handle: ${enriched.socialMedia.instagram.handle}`)
        console.log(`   Seguidores: ${enriched.socialMedia.instagram.followers || 'N/A'}`)
        console.log(`   Último post: ${enriched.socialMedia.instagram.lastPost || 'N/A'}`)
      }

      if (enriched.socialMedia.linkedin) {
        console.log(`\n🔗 LinkedIn:`)
        console.log(`   URL: ${enriched.socialMedia.linkedin.url}`)
        console.log(`   Seguidores: ${enriched.socialMedia.linkedin.followers || 'N/A'}`)
      }

      if (enriched.recentNews.length > 0) {
        console.log(`\n📰 Notícias Recentes (${enriched.recentNews.length}):`)
        enriched.recentNews.slice(0, 3).forEach((news, i) => {
          console.log(`   ${i + 1}. ${news.title}`)
          console.log(`      Data: ${news.date} | Fonte: ${news.source}`)
          if (news.url) {
            console.log(`      URL: ${news.url}`)
          }
        })
      } else {
        console.log(`\n📰 Notícias: Nenhuma encontrada`)
      }

      if (enriched.upcomingEvents.length > 0) {
        console.log(`\n📅 Eventos (${enriched.upcomingEvents.length}):`)
        enriched.upcomingEvents.forEach((event, i) => {
          console.log(`   ${i + 1}. ${event.name}`)
          console.log(`      Data: ${event.date} | Tipo: ${event.type}`)
        })
      } else {
        console.log(`\n📅 Eventos: Nenhum encontrado`)
      }

      if (enriched.keyInsights.length > 0) {
        console.log(`\n💡 Insights Chave (${enriched.keyInsights.length}):`)
        enriched.keyInsights.forEach((insight, i) => {
          console.log(`   ${i + 1}. ${insight}`)
        })
      }

      // Delay entre requisições
      await sleep(5000)
    } catch (error) {
      console.error('\n❌ Erro ao enriquecer:', error)
    }
  }

  // Resumo
  console.log('\n\n' + '='.repeat(60))
  console.log('📊 RESUMO DOS TESTES')
  console.log('='.repeat(60))
  console.log(`\n✅ Testes completos!`)
  console.log(`\n💡 Interpretação:`)
  console.log(`   - A IA busca informações públicas disponíveis`)
  console.log(`   - Notícias e eventos podem variar conforme disponibilidade`)
  console.log(`   - Instagram e LinkedIn são estimados quando não confirmados`)
  console.log(`   - Faturamento e funcionários são estimativas baseadas no porte`)
  console.log(`\n📝 Próximos passos:`)
  console.log(`   1. Os dados são salvos automaticamente ao criar empresas`)
  console.log(`   2. Re-enriquecimento acontece a cada 7 dias`)
  console.log(`   3. Dashboard exibirá notícias, eventos e insights`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Executar teste
testAIEnrichment()
  .then(() => {
    console.log('\n🎉 Teste finalizado com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no teste:', error)
    process.exit(1)
  })
