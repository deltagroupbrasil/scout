import { prisma } from '../lib/prisma'

async function testNewOrdering() {
  try {
    console.log('🔍 Testando nova ordenação...\n')

    // Buscar com a nova ordenação
    const leads = await prisma.lead.findMany({
      include: {
        company: true
      },
      orderBy: [
        { priorityScore: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 20
    })

    console.log(`📊 Top 20 leads com nova ordenação:\n`)

    leads.forEach((lead, idx) => {
      console.log(`${idx + 1}. ${lead.company.name} - ${lead.jobTitle}`)
      console.log(`   Priority: ${lead.priorityScore} | isNew: ${lead.isNew} | Status: ${lead.status}`)
    })

    // Verificar se Save Co. está entre os top 20
    const saveCoInTop20 = leads.some(l => l.company.name === 'Save Co.')
    console.log(`\n${saveCoInTop20 ? '✅' : '❌'} Save Co. está entre os top 20? ${saveCoInTop20}`)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testNewOrdering()
