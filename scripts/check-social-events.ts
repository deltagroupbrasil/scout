import { prisma } from '../lib/prisma'

async function check() {
  const companies = await prisma.company.findMany({
    where: {
      instagramHandle: { not: null },
      eventsDetectedAt: { not: null }
    },
    select: {
      name: true,
      instagramHandle: true,
      eventsDetectedAt: true,
      recentNews: true
    }
  })

  console.log(`Empresas com Instagram e eventos: ${companies.length}\n`)
  companies.forEach(c => {
    console.log(`${c.name}`)
    console.log(`  Instagram: @${c.instagramHandle}`)
    console.log(`  Eventos detectados: ${c.eventsDetectedAt}`)
    console.log(`  Tem notícias: ${c.recentNews ? 'SIM' : 'NÃO'}`)
    console.log('')
  })

  await prisma.$disconnect()
}

check()
