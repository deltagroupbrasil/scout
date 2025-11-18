/**
 * Teste: Forçar detecção de eventos para empresa existente
 */

require('dotenv').config()

import { eventsDetector } from '../lib/services/events-detector'
import { prisma } from '../lib/prisma'

async function testEventsForExistingCompany() {
  console.log('========================================')
  console.log('TESTE: Detecção de Eventos (Magazine Luiza)')
  console.log('========================================\n')

  const companyName = 'Magazine Luiza'

  // 1. Detectar eventos
  console.log('Detectando eventos...\n')
  const eventResult = await eventsDetector.detectEvents(companyName, {})

  if (eventResult.events.length === 0) {
    console.log('Nenhum evento detectado!')
    return
  }

  console.log(`\n${eventResult.events.length} eventos detectados:`)
  console.log('========================================\n')

  eventResult.events.forEach((event, idx) => {
    console.log(`${idx + 1}. [${event.relevance.toUpperCase()}] ${event.title}`)
    console.log(`   Tipo: ${event.type}`)
    console.log(`   Descrição: ${event.description}`)
    console.log(`   Data: ${event.date.toLocaleDateString('pt-BR')}`)
    console.log(`   Fonte: ${event.source}`)
    console.log(`   Sentimento: ${event.sentiment}`)
    if (event.sourceUrl) {
      console.log(`   URL: ${event.sourceUrl}`)
    }
    console.log('')
  })

  // 2. Salvar no banco de dados
  console.log('========================================')
  console.log('Salvando eventos no banco de dados...\n')

  // Buscar empresa Magazine Luiza
  const company = await prisma.company.findFirst({
    where: { name: companyName }
  })

  if (!company) {
    console.log('Empresa não encontrada no banco de dados!')
    return
  }

  // Filtrar eventos relevantes
  const relevantEvents = eventResult.events.filter(e =>
    e.relevance === 'high' || e.relevance === 'medium'
  )

  // Separar notícias recentes e eventos futuros
  const now = new Date()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  // NOTÍCIAS RECENTES: Eventos PASSADOS dos últimos 60 dias
  const recentNews = relevantEvents
    .filter(e => {
      const eventDate = new Date(e.date)
      return eventDate >= sixtyDaysAgo && eventDate <= now
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map(e => ({
      type: e.type,
      title: e.title,
      description: e.description,
      date: e.date.toISOString(),
      source: e.source,
      url: e.sourceUrl,
      sentiment: e.sentiment
    }))

  // EVENTOS FUTUROS: Conferências, lançamentos agendados (data > hoje)
  const upcomingEvents = relevantEvents
    .filter(e => {
      const eventDate = new Date(e.date)
      return eventDate > now
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3)
    .map(e => ({
      type: e.type,
      title: e.title,
      description: e.description,
      date: e.date.toISOString(),
      source: e.source,
    }))

  // Atualizar empresa
  await prisma.company.update({
    where: { id: company.id },
    data: {
      recentNews: recentNews.length > 0 ? JSON.stringify(recentNews) : null,
      upcomingEvents: upcomingEvents.length > 0 ? JSON.stringify(upcomingEvents) : null,
      eventsDetectedAt: new Date(),
    },
  })

  console.log(`Notícias recentes salvas: ${recentNews.length}`)
  console.log(`Eventos futuros salvos: ${upcomingEvents.length}`)

  console.log('\n========================================')
  console.log('TESTE CONCLUÍDO!')
  console.log('========================================\n')
}

testEventsForExistingCompany()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
