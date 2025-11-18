/**
 * Teste: Detecção de Eventos com Redes Sociais
 * Testa se o sistema busca eventos no Instagram e outras redes sociais
 */

require('dotenv').config()

import { eventsDetector } from '../lib/services/events-detector'
import { prisma } from '../lib/prisma'

async function testEventsWithSocialMedia() {
  console.log('========================================')
  console.log('TESTE: Detecção de Eventos com Redes Sociais')
  console.log('========================================\n')

  // Buscar uma empresa com Instagram verificado
  const company = await prisma.company.findFirst({
    where: {
      instagramVerified: true,
      instagramHandle: { not: null }
    },
    orderBy: {
      socialMediaUpdatedAt: 'desc'
    }
  })

  if (!company) {
    console.log('❌ Nenhuma empresa com Instagram verificado encontrada!')
    console.log('Buscando qualquer empresa com redes sociais...\n')

    const anyCompany = await prisma.company.findFirst({
      where: {
        OR: [
          { instagramHandle: { not: null } },
          { twitterHandle: { not: null } },
          { linkedinUrl: { not: null } }
        ]
      }
    })

    if (!anyCompany) {
      console.log('❌ Nenhuma empresa com redes sociais encontrada!')
      return
    }

    console.log(`✅ Encontrada: ${anyCompany.name}`)
  } else {
    console.log(`✅ Empresa com Instagram: ${company.name}`)
  }

  const selectedCompany = company || await prisma.company.findFirst({
    where: {
      OR: [
        { instagramHandle: { not: null } },
        { twitterHandle: { not: null } },
        { linkedinUrl: { not: null } }
      ]
    }
  })

  if (!selectedCompany) return

  console.log(`\nEMPRESA: ${selectedCompany.name}`)
  console.log(`Setor: ${selectedCompany.sector || 'N/A'}`)
  console.log('')

  // Preparar redes sociais
  const socialMedia: any = {}

  if (selectedCompany.instagramHandle) {
    socialMedia.instagram = `https://instagram.com/${selectedCompany.instagramHandle}`
    console.log(`📸 Instagram: @${selectedCompany.instagramHandle} ${selectedCompany.instagramVerified ? '✅' : '❌'}`)
  }

  if (selectedCompany.twitterHandle) {
    socialMedia.twitter = `https://twitter.com/${selectedCompany.twitterHandle}`
    console.log(`🐦 Twitter: @${selectedCompany.twitterHandle} ${selectedCompany.twitterVerified ? '✅' : '❌'}`)
  }

  if (selectedCompany.facebookHandle) {
    socialMedia.facebook = `https://facebook.com/${selectedCompany.facebookHandle}`
    console.log(`📘 Facebook: ${selectedCompany.facebookHandle} ${selectedCompany.facebookVerified ? '✅' : '❌'}`)
  }

  if (selectedCompany.linkedinUrl) {
    socialMedia.linkedin = selectedCompany.linkedinUrl
    console.log(`💼 LinkedIn: ${selectedCompany.linkedinUrl}`)
  }

  console.log('\n========================================')
  console.log('DETECTANDO EVENTOS (incluindo redes sociais)...')
  console.log('========================================\n')

  const eventResult = await eventsDetector.detectEvents(selectedCompany.name, socialMedia)

  if (eventResult.events.length === 0) {
    console.log('❌ Nenhum evento detectado!')
    return
  }

  console.log(`\n✅ ${eventResult.events.length} eventos detectados:\n`)
  console.log('========================================\n')

  eventResult.events.forEach((event, idx) => {
    console.log(`${idx + 1}. [${event.relevance.toUpperCase()}] ${event.title}`)
    console.log(`   Tipo: ${event.type}`)
    console.log(`   Descrição: ${event.description}`)
    console.log(`   Data: ${event.date.toLocaleDateString('pt-BR')}`)
    console.log(`   Fonte: ${event.source}`)
    console.log(`   Sentimento: ${event.sentiment}`)
    if (event.sourceUrl) {
      // Destacar se veio de rede social
      const isSocialMedia = event.sourceUrl.includes('instagram.com') ||
                           event.sourceUrl.includes('twitter.com') ||
                           event.sourceUrl.includes('facebook.com') ||
                           event.sourceUrl.includes('linkedin.com')
      console.log(`   URL: ${event.sourceUrl} ${isSocialMedia ? '📱 REDE SOCIAL!' : ''}`)
    }
    console.log('')
  })

  // Análise de fontes
  const socialMediaEvents = eventResult.events.filter(e =>
    e.sourceUrl && (
      e.sourceUrl.includes('instagram.com') ||
      e.sourceUrl.includes('twitter.com') ||
      e.sourceUrl.includes('facebook.com') ||
      e.sourceUrl.includes('linkedin.com')
    )
  )

  console.log('========================================')
  console.log('ANÁLISE DE FONTES:')
  console.log('========================================\n')
  console.log(`Total de eventos: ${eventResult.events.length}`)
  console.log(`Eventos de REDES SOCIAIS: ${socialMediaEvents.length} 📱`)
  console.log(`Eventos de NOTÍCIAS: ${eventResult.events.length - socialMediaEvents.length} 📰`)

  if (socialMediaEvents.length > 0) {
    console.log('\n✅ SUCESSO! Sistema está buscando nas redes sociais!')
    console.log('\nEventos encontrados nas redes sociais:')
    socialMediaEvents.forEach((event, idx) => {
      console.log(`   ${idx + 1}. ${event.title} (${event.source})`)
    })
  } else {
    console.log('\n⚠️  Nenhum evento encontrado nas redes sociais desta empresa.')
    console.log('    Isso pode significar:')
    console.log('    - A empresa não postou recentemente')
    console.log('    - As redes sociais não têm conteúdo relevante para B2B')
    console.log('    - O web search não conseguiu acessar os posts')
  }

  console.log('\n========================================')
  console.log('TESTE CONCLUÍDO!')
  console.log('========================================\n')
}

testEventsWithSocialMedia()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
