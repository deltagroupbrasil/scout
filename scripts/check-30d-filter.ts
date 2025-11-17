import { prisma } from '../lib/prisma'

async function check30DFilter() {
  try {
    console.log('🔍 Verificando filtro de 30 dias...\n')

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    console.log(`📅 Data atual: ${now.toISOString()}`)
    console.log(`📅 30 dias atrás: ${thirtyDaysAgo.toISOString()}\n`)

    // Total de leads
    const totalLeads = await prisma.lead.count()
    console.log(`📊 Total de leads no banco: ${totalLeads}`)

    // Leads nos últimos 30 dias
    const leadsLast30Days = await prisma.lead.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        company: true
      },
      orderBy: [
        { isNew: 'desc' },
        { priorityScore: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    console.log(`📅 Leads dos últimos 30 dias: ${leadsLast30Days.length}\n`)

    // Listar todos com data de criação
    console.log('📝 Lista de leads (últimos 30 dias):')
    leadsLast30Days.forEach((lead, idx) => {
      const daysAgo = Math.floor((now.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      console.log(`   ${idx + 1}. ${lead.company.name} - ${lead.jobTitle}`)
      console.log(`      Criado: ${lead.createdAt.toISOString()} (${daysAgo} dias atrás)`)
    })

    // Leads fora dos 30 dias
    const leadsOlderThan30Days = await prisma.lead.findMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      },
      include: {
        company: true
      }
    })

    if (leadsOlderThan30Days.length > 0) {
      console.log(`\n⚠️  Leads mais antigos que 30 dias: ${leadsOlderThan30Days.length}`)
      leadsOlderThan30Days.forEach((lead, idx) => {
        const daysAgo = Math.floor((now.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        console.log(`   ${idx + 1}. ${lead.company.name} - ${lead.jobTitle}`)
        console.log(`      Criado: ${lead.createdAt.toISOString()} (${daysAgo} dias atrás)`)
      })
    } else {
      console.log('\n✅ Todos os leads estão dentro dos últimos 30 dias!')
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

check30DFilter()
