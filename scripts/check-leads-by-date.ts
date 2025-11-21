import { prisma } from '../lib/prisma'

async function checkLeadsByDate() {
  try {
    const leads = await prisma.lead.findMany({
      select: {
        id: true,
        createdAt: true,
        company: { select: { name: true } },
        jobTitle: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    console.log('📅 ÚLTIMOS LEADS CRIADOS (20 mais recentes):\n')

    const groupedByDate: Record<string, any[]> = {}

    leads.forEach(lead => {
      const date = new Date(lead.createdAt).toLocaleDateString('pt-BR')
      if (!groupedByDate[date]) {
        groupedByDate[date] = []
      }
      groupedByDate[date].push(lead)
    })

    Object.entries(groupedByDate).forEach(([date, dateLeads]) => {
      console.log(`📆 ${date} - ${dateLeads.length} leads`)
      dateLeads.slice(0, 5).forEach(lead => {
        const time = new Date(lead.createdAt).toLocaleTimeString('pt-BR')
        console.log(`   ${time} - ${lead.company.name} - ${lead.jobTitle.substring(0, 60)}`)
      })
      if (dateLeads.length > 5) {
        console.log(`   ... e mais ${dateLeads.length - 5} leads`)
      }
      console.log('')
    })

    // Verificar se há um padrão de horário (ex: 6h da manhã = cron)
    const morningLeads = leads.filter(lead => {
      const hour = new Date(lead.createdAt).getHours()
      return hour >= 6 && hour <= 7
    })

    console.log(`\n🕐 Leads criados entre 6h-7h (horário do cron): ${morningLeads.length}/${leads.length}`)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkLeadsByDate()
