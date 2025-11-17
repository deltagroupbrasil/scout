import { prisma } from '../lib/prisma'

async function checkLead() {
  const leadId = '8e819db0-c4c8-49ef-940d-310b0221648f'

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { company: true }
  })

  if (!lead) {
    console.log('❌ Lead não encontrado')
    await prisma.$disconnect()
    return
  }

  console.log('✅ Lead encontrado:')
  console.log('-------------------')
  console.log('ID:', lead.id)
  console.log('Empresa:', lead.company.name)
  console.log('Status:', lead.status)
  console.log('isNew:', lead.isNew)
  console.log('priorityScore:', lead.priorityScore)
  console.log('createdAt:', lead.createdAt.toISOString())
  console.log('updatedAt:', lead.updatedAt.toISOString())
  console.log('assignedToId:', lead.assignedToId || 'null')
  console.log('-------------------')

  // Verificar quantos leads com isNew=true existem
  const newLeadsCount = await prisma.lead.count({
    where: {
      isNew: true,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    }
  })

  console.log(`\nLeads com isNew=true (30 dias): ${newLeadsCount}`)

  // Verificar se esse lead apareceria na query do dashboard
  const dashboardQuery = await prisma.lead.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    },
    orderBy: [
      { isNew: 'desc' },
      { createdAt: 'desc' }
    ],
    take: 20
  })

  const leadIndex = dashboardQuery.findIndex(l => l.id === leadId)

  if (leadIndex >= 0) {
    console.log(`\n✅ Lead APARECE no dashboard (posição ${leadIndex + 1} de 20)`)
  } else {
    console.log('\n❌ Lead NÃO aparece nos primeiros 20 do dashboard')
    console.log(`Total de leads nos últimos 30 dias: ${await prisma.lead.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    })}`)
  }

  await prisma.$disconnect()
}

checkLead().catch(console.error)
