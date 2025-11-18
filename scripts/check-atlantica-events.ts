import { prisma } from '../lib/prisma'

async function check() {
  const company = await prisma.company.findFirst({
    where: { name: { contains: 'Atlantica' } }
  })

  if (!company) {
    console.log('Empresa não encontrada')
    return
  }

  console.log('ATLANTICA HOTELS:')
  console.log('================\n')
  console.log(`Nome: ${company.name}`)
  console.log(`Instagram: @${company.instagramHandle}`)
  console.log(`Instagram verificado: ${company.instagramVerified}`)
  console.log(`Eventos detectados em: ${company.eventsDetectedAt}`)
  console.log('')
  console.log(`Recent News: ${company.recentNews ? 'SIM' : 'NÃO'}`)
  console.log(`Upcoming Events: ${company.upcomingEvents ? 'SIM' : 'NÃO'}`)
  console.log('')

  if (company.recentNews) {
    console.log('RECENT NEWS:')
    console.log(company.recentNews.substring(0, 500))
  }

  if (company.upcomingEvents) {
    console.log('\nUPCOMING EVENTS:')
    console.log(company.upcomingEvents.substring(0, 500))
  }

  await prisma.$disconnect()
}

check()
