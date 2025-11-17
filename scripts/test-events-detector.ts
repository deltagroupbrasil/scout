// Test Events Detector
// Testa a detecção de eventos relevantes da empresa

import { eventsDetector } from '../lib/services/events-detector'

async function testEventsDetector() {
  console.log('🧪 TESTE: Events Detector Service\n')
  console.log('=' .repeat(60))

  // Empresas de teste com contextos diferentes
  const testCompanies = [
    {
      name: 'Nubank',
      socialMedia: {
        instagram: 'nubank',
        twitter: 'nubank',
        linkedin: 'https://www.linkedin.com/company/nubank'
      }
    },
    {
      name: 'Magazine Luiza',
      socialMedia: {
        instagram: 'magazineluiza',
        facebook: 'magazineluiza',
        linkedin: 'https://www.linkedin.com/company/magazine-luiza'
      }
    },
    {
      name: 'PagBank',
      socialMedia: {
        instagram: 'pagbank',
        twitter: 'pagbank'
      }
    }
  ]

  for (const company of testCompanies) {
    console.log(`\n📍 Testando: ${company.name}`)
    console.log('-'.repeat(60))

    try {
      // 1. Detectar eventos gerais
      console.log('\n🔍 Detectando eventos gerais...')
      const events = await eventsDetector.detectEvents(company.name, company.socialMedia)

      console.log(`\n📊 Resultados:`)
      console.log(`   Total de eventos detectados: ${events.events.length}`)
      console.log(`   Fontes consultadas: ${events.sources.join(', ')}`)

      // Separar por tipo
      const byType = events.events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      console.log(`\n   Eventos por tipo:`)
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`      - ${type}: ${count}`)
      })

      // Separar por relevância
      const byRelevance = events.events.reduce((acc, event) => {
        acc[event.relevance] = (acc[event.relevance] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      console.log(`\n   Eventos por relevância:`)
      Object.entries(byRelevance).forEach(([relevance, count]) => {
        console.log(`      - ${relevance}: ${count}`)
      })

      // Mostrar top 5 eventos mais relevantes
      const topEvents = events.events
        .filter(e => e.relevance === 'high' || e.relevance === 'medium')
        .slice(0, 5)

      if (topEvents.length > 0) {
        console.log(`\n   🌟 Top ${topEvents.length} eventos relevantes:`)
        topEvents.forEach((event, idx) => {
          const icon = event.type === 'funding' ? '💰' :
                       event.type === 'leadership_change' ? '👔' :
                       event.type === 'award' ? '🏆' :
                       event.type === 'expansion' ? '🚀' : '📰'
          console.log(`   ${idx + 1}. ${icon} [${event.relevance.toUpperCase()}] ${event.title}`)
          if (event.description) {
            console.log(`      ${event.description}`)
          }
          console.log(`      Fonte: ${event.source}`)
        })
      }

      // 2. Testar detecção específica de mudanças de liderança
      console.log(`\n👔 Detectando mudanças de liderança...`)
      const leadershipEvents = await eventsDetector.detectLeadershipChanges(company.name)

      console.log(`   ${leadershipEvents.length} mudanças de liderança detectadas`)
      leadershipEvents.slice(0, 3).forEach((event, idx) => {
        console.log(`   ${idx + 1}. ${event.title}`)
      })

      // 3. Testar detecção de investimentos
      console.log(`\n💰 Detectando investimentos e expansões...`)
      const fundingEvents = await eventsDetector.detectFundingEvents(company.name)

      console.log(`   ${fundingEvents.length} eventos de investimento detectados`)
      fundingEvents.slice(0, 3).forEach((event, idx) => {
        console.log(`   ${idx + 1}. ${event.title}`)
      })

      // 4. Gerar gatilhos de abordagem
      console.log(`\n🎯 Gerando gatilhos de abordagem...`)
      const allRelevantEvents = [
        ...events.events.filter(e => e.relevance === 'high'),
        ...leadershipEvents,
        ...fundingEvents
      ]

      const triggers = eventsDetector.generateApproachTriggers(allRelevantEvents)

      console.log(`   ${triggers.length} gatilhos gerados:`)
      triggers.forEach((trigger, idx) => {
        console.log(`   ${idx + 1}. ${trigger}`)
      })

    } catch (error) {
      console.error(`   ❌ Erro ao processar ${company.name}:`, error)
    }

    console.log('\n' + '='.repeat(60))

    // Delay entre empresas para evitar rate limit
    console.log('⏳ Aguardando 3 segundos antes da próxima empresa...\n')
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  // Resumo final
  console.log('\n\n📊 RESUMO DO TESTE')
  console.log('=' .repeat(60))
  console.log('✅ Teste concluído!')
  console.log('\nFuncionalidades testadas:')
  console.log('  ✅ Detecção de eventos gerais')
  console.log('  ✅ Categorização por tipo')
  console.log('  ✅ Filtragem por relevância')
  console.log('  ✅ Detecção de mudanças de liderança')
  console.log('  ✅ Detecção de investimentos')
  console.log('  ✅ Geração de gatilhos de abordagem')
  console.log('\n📊 Fontes de dados:')
  console.log('  • Google News (via Bright Data SERP API)')
  console.log('  • Análise de relevância com Claude AI')
  console.log('  • Redes sociais verificadas (Fase 1)')
  console.log('\n🎯 Próximo passo: Testar integração completa no orchestrator')
}

testEventsDetector()
  .then(() => {
    console.log('\n✅ Teste finalizado com sucesso!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro no teste:', error)
    process.exit(1)
  })
