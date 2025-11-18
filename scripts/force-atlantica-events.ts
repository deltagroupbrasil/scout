import { eventsDetector } from '../lib/services/events-detector'
import { prisma } from '../lib/prisma'

async function forceDetection() {
  console.log('Forçando detecção de eventos para Atlantica Hotels...\n')

  const company = await prisma.company.findFirst({
    where: { name: { contains: 'Atlantica' } }
  })

  if (!company) {
    console.log('Empresa não encontrada')
    return
  }

  // Resetar eventsDetectedAt para forçar nova detecção
  await prisma.company.update({
    where: { id: company.id },
    data: { eventsDetectedAt: null }
  })

  const socialMedia: any = {}
  if (company.instagramHandle) {
    socialMedia.instagram = `https://instagram.com/${company.instagramHandle}`
    console.log(`📸 Instagram: https://instagram.com/${company.instagramHandle}`)
  }
  if (company.linkedinUrl) {
    socialMedia.linkedin = company.linkedinUrl
    console.log(`💼 LinkedIn: ${company.linkedinUrl}`)
  }

  console.log('\nDetectando eventos...\n')

  const result = await eventsDetector.detectEvents(company.name, socialMedia)

  console.log(`\n✅ ${result.events.length} eventos encontrados\n`)

  result.events.forEach((event, idx) => {
    console.log(`${idx + 1}. [${event.relevance}] ${event.title}`)
    console.log(`   ${event.description}`)
    console.log(`   Fonte: ${event.source}`)
    console.log(`   URL: ${event.sourceUrl || 'N/A'}`)
    console.log('')
  })

  // Salvar eventos
  const now = new Date()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const relevantEvents = result.events.filter(e => e.relevance === 'high' || e.relevance === 'medium')

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

  console.log(`Salvando: ${recentNews.length} notícias, ${upcomingEvents.length} eventos futuros\n`)

  await prisma.company.update({
    where: { id: company.id },
    data: {
      recentNews: recentNews.length > 0 ? JSON.stringify(recentNews) : null,
      upcomingEvents: upcomingEvents.length > 0 ? JSON.stringify(upcomingEvents) : null,
      eventsDetectedAt: new Date()
    }
  })

  console.log('✅ Eventos salvos! Verifique no dashboard.')

  await prisma.$disconnect()
}

forceDetection()
