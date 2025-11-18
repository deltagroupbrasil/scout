/**
 * Teste: Gatilhos de Abordagem Contextualizados
 * Testa a geração de triggers com base em eventos e notícias reais
 */

require('dotenv').config()

import { approachTriggersGenerator } from '../lib/services/approach-triggers-generator'
import { prisma } from '../lib/prisma'

async function testContextualTriggers() {
  console.log('========================================')
  console.log('TESTE: Gatilhos Contextualizados')
  console.log('========================================\n')

  // Buscar uma empresa com eventos detectados
  const company = await prisma.company.findFirst({
    where: {
      recentNews: { not: null },
      eventsDetectedAt: { not: null }
    },
    orderBy: {
      eventsDetectedAt: 'desc'
    }
  })

  if (!company) {
    console.log('❌ Nenhuma empresa com eventos detectados encontrada!')
    console.log('Execute primeiro: npx tsx scripts/test-events-for-existing-company.ts')
    return
  }

  console.log(`Empresa: ${company.name}`)
  console.log(`Setor: ${company.sector || 'N/A'}`)
  console.log(`Revenue: ${company.revenue ? `R$ ${(company.revenue / 1_000_000).toFixed(0)}M` : 'N/A'}`)
  console.log(`Funcionários: ${company.employees?.toLocaleString('pt-BR') || 'N/A'}`)
  console.log(`Eventos detectados: ${company.eventsDetectedAt ? new Date(company.eventsDetectedAt).toLocaleString('pt-BR') : 'N/A'}`)
  console.log('')

  // Parse eventos
  let recentNews: any[] = []
  let upcomingEvents: any[] = []

  try {
    if (company.recentNews) {
      recentNews = JSON.parse(company.recentNews)
      console.log(`📰 ${recentNews.length} notícias recentes:`)
      recentNews.slice(0, 3).forEach((news, idx) => {
        console.log(`   ${idx + 1}. [${news.type}] ${news.title}`)
      })
      console.log('')
    }

    if (company.upcomingEvents) {
      upcomingEvents = JSON.parse(company.upcomingEvents)
      console.log(`📅 ${upcomingEvents.length} eventos futuros:`)
      upcomingEvents.forEach((event, idx) => {
        console.log(`   ${idx + 1}. [${event.type}] ${event.title}`)
      })
      console.log('')
    }
  } catch (e) {
    console.error('Erro ao parsear eventos:', e)
  }

  console.log('========================================')
  console.log('GERANDO GATILHOS CONTEXTUALIZADOS...')
  console.log('========================================\n')

  // Cenário 1: Vaga de CFO
  console.log('📋 CENÁRIO 1: Vaga de CFO')
  const triggersScenario1 = await approachTriggersGenerator.generateContextualTriggers({
    companyName: company.name,
    sector: company.sector || undefined,
    revenue: company.revenue || undefined,
    employees: company.employees || undefined,
    jobTitle: 'CFO (Chief Financial Officer)',
    recentNews: recentNews.length > 0 ? recentNews : undefined,
    upcomingEvents: upcomingEvents.length > 0 ? upcomingEvents : undefined,
  })

  console.log(`\n✅ ${triggersScenario1.length} gatilhos gerados:\n`)
  triggersScenario1.forEach((trigger, idx) => {
    console.log(`${idx + 1}. ${trigger}`)
  })

  console.log('\n----------------------------------------\n')

  // Cenário 2: Vaga de Controller
  console.log('📋 CENÁRIO 2: Vaga de Controller Sênior')
  const triggersScenario2 = await approachTriggersGenerator.generateContextualTriggers({
    companyName: company.name,
    sector: company.sector || undefined,
    revenue: company.revenue || undefined,
    employees: company.employees || undefined,
    jobTitle: 'Controller Sênior',
    recentNews: recentNews.length > 0 ? recentNews : undefined,
    upcomingEvents: upcomingEvents.length > 0 ? upcomingEvents : undefined,
  })

  console.log(`\n✅ ${triggersScenario2.length} gatilhos gerados:\n`)
  triggersScenario2.forEach((trigger, idx) => {
    console.log(`${idx + 1}. ${trigger}`)
  })

  console.log('\n========================================')
  console.log('TESTE CONCLUÍDO!')
  console.log('========================================\n')

  // Comparação com triggers genéricos
  console.log('💡 COMPARAÇÃO:')
  console.log('\n❌ Triggers GENÉRICOS (antes):')
  console.log('   1. Vaga de alta liderança indica possível reestruturação financeira')
  console.log('   2. Faturamento alto - perfil ideal para Controladoria avançada')
  console.log('   3. Vaga recente publicada - timing perfeito para abordagem')
  console.log('')
  console.log('✅ Triggers CONTEXTUALIZADOS (agora):')
  console.log(`   (veja acima os gatilhos gerados para ${company.name})`)
  console.log('')
}

testContextualTriggers()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
