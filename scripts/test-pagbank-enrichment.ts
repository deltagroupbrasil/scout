// Teste específico do enrichment do PagBank
import 'dotenv/config'
import { aiCompanyEnrichment } from '../lib/services/ai-company-enrichment'

async function testPagBankEnrichment() {
  console.log('🧪 TESTE DE ENRICHMENT - PAGBANK\n')
  console.log('='.repeat(70))
  console.log('📊 Este teste vai buscar dados REAIS do PagBank via Claude AI\n')
  console.log('='.repeat(70))

  try {
    const enrichment = await aiCompanyEnrichment.enrichCompany(
      'PagBank',
      'Serviços Financeiros',
      'https://pagbank.com.br'
    )

    console.log('\n📊 DADOS RETORNADOS PELA IA:')
    console.log('='.repeat(70))
    console.log(JSON.stringify(enrichment, null, 2))

    console.log('\n' + '='.repeat(70))
    console.log('📈 VALIDAÇÃO DOS DADOS:')
    console.log('='.repeat(70))

    // Validar CNPJ
    if (enrichment.cnpj && enrichment.cnpj !== 'Não disponível') {
      console.log(`✅ CNPJ encontrado: ${enrichment.cnpj}`)
    } else {
      console.log(`❌ CNPJ não encontrado ou inválido`)
    }

    // Validar Revenue
    if (enrichment.estimatedRevenue && enrichment.estimatedRevenue !== 'Não disponível') {
      console.log(`✅ Faturamento encontrado: ${enrichment.estimatedRevenue}`)
    } else {
      console.log(`❌ Faturamento não informado`)
    }

    // Validar Employees
    if (enrichment.estimatedEmployees && enrichment.estimatedEmployees !== 'Não disponível') {
      console.log(`✅ Funcionários encontrado: ${enrichment.estimatedEmployees}`)
    } else {
      console.log(`❌ Funcionários não informado`)
    }

    // Validar Localização
    if (enrichment.location) {
      console.log(`✅ Localização: ${enrichment.location}`)
    } else {
      console.log(`❌ Localização não informada`)
    }

    // Validar Notícias
    if (enrichment.recentNews && enrichment.recentNews.length > 0) {
      console.log(`✅ Notícias: ${enrichment.recentNews.length} encontradas`)
      enrichment.recentNews.forEach((news, i) => {
        console.log(`   ${i + 1}. ${news.title} (${news.date})`)
      })
    } else {
      console.log(`⚠️  Nenhuma notícia encontrada`)
    }

    // Validar Instagram
    if (enrichment.socialMedia.instagram?.handle) {
      console.log(`✅ Instagram: ${enrichment.socialMedia.instagram.handle}`)
      if (enrichment.socialMedia.instagram.followers) {
        console.log(`   Seguidores: ${enrichment.socialMedia.instagram.followers}`)
      }
    } else {
      console.log(`⚠️  Instagram não encontrado`)
    }

    // Validar LinkedIn
    if (enrichment.socialMedia.linkedin?.url) {
      console.log(`✅ LinkedIn: ${enrichment.socialMedia.linkedin.url}`)
      if (enrichment.socialMedia.linkedin.followers) {
        console.log(`   Seguidores: ${enrichment.socialMedia.linkedin.followers}`)
      }
    } else {
      console.log(`⚠️  LinkedIn não encontrado`)
    }

    // Insights
    if (enrichment.keyInsights && enrichment.keyInsights.length > 0) {
      console.log(`✅ Insights: ${enrichment.keyInsights.length} encontrados`)
      enrichment.keyInsights.forEach((insight, i) => {
        console.log(`   ${i + 1}. ${insight}`)
      })
    }

    console.log('\n' + '='.repeat(70))
    console.log('📝 RESUMO:')
    console.log('='.repeat(70))

    const score = [
      enrichment.cnpj && enrichment.cnpj !== 'Não disponível',
      enrichment.estimatedRevenue && enrichment.estimatedRevenue !== 'Não disponível',
      enrichment.estimatedEmployees && enrichment.estimatedEmployees !== 'Não disponível',
      enrichment.location,
      enrichment.recentNews.length > 0,
      enrichment.socialMedia.instagram?.handle,
      enrichment.socialMedia.linkedin?.url,
      enrichment.keyInsights.length > 0,
    ].filter(Boolean).length

    console.log(`\n📊 Score de Qualidade: ${score}/8`)
    console.log(`\n${score >= 6 ? '✅ EXCELENTE' : score >= 4 ? '⚠️  BOM' : '❌ PRECISA MELHORAR'}`)

    if (score < 6) {
      console.log('\n💡 DICA: O prompt da IA pode precisar de ajustes')
      console.log('   - Verificar se a IA tem acesso à web search')
      console.log('   - Ajustar prompt para ser mais específico')
      console.log('   - Testar com model: claude-3-5-sonnet (mais potente)')
    }
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error)
  }
}

testPagBankEnrichment()
  .then(() => {
    console.log('\n✅ Teste finalizado!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro fatal:', error)
    process.exit(1)
  })
