import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { priorityScore } from '../lib/services/priority-score'

const prisma = new PrismaClient()

async function recalculateScores() {
  console.log('🔢 Recalculando scores de prioridade...\n')

  const leads = await prisma.lead.findMany({
    include: {
      company: true,
    },
  })

  console.log(`📊 Encontrados ${leads.length} leads\n`)

  for (const lead of leads) {
    const score = priorityScore.calculateScore(lead as any)
    const label = priorityScore.getScoreLabel(score)

    await prisma.lead.update({
      where: { id: lead.id },
      data: { priorityScore: score },
    })

    console.log(
      `✅ ${lead.company.name} - ${lead.jobTitle}: ${score}/100 (${label})`
    )
  }

  console.log('\n✨ Recálculo concluído!')
  await prisma.$disconnect()
}

recalculateScores()
