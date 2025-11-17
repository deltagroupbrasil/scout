import { prisma } from '../lib/prisma'

async function debugLeadsCount() {
  try {
    console.log('🔍 Verificando contagem de leads...\n')

    // Total de leads
    const totalLeads = await prisma.lead.count()
    console.log(`📊 Total de leads no banco: ${totalLeads}`)

    // Total de empresas únicas
    const uniqueCompanies = await prisma.lead.findMany({
      distinct: ['companyId'],
      select: { companyId: true }
    })
    console.log(`🏢 Total de empresas únicas: ${uniqueCompanies.length}`)

    // Leads por status
    const leadsByStatus = await prisma.lead.groupBy({
      by: ['status'],
      _count: true
    })
    console.log('\n📋 Leads por status:')
    leadsByStatus.forEach(group => {
      console.log(`   ${group.status}: ${group._count}`)
    })

    // Buscar todos os leads com ordenação (mesma lógica da API)
    const allLeads = await prisma.lead.findMany({
      include: {
        company: true
      },
      orderBy: [
        { isNew: 'desc' },
        { priorityScore: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    console.log(`\n📝 Leads ordenados (total: ${allLeads.length}):`)
    allLeads.forEach((lead, idx) => {
      console.log(`   ${idx + 1}. ${lead.company.name} - ${lead.jobTitle}`)
      console.log(`      Status: ${lead.status} | isNew: ${lead.isNew} | Priority: ${lead.priorityScore}`)
    })

    // Verificar se há algum lead sem empresa
    const leadsWithoutCompany = await prisma.lead.count({
      where: {
        company: null
      }
    })
    console.log(`\n⚠️  Leads sem empresa: ${leadsWithoutCompany}`)

    // Verificar filtros padrão (últimos 30 dias)
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const leadsLast30Days = await prisma.lead.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    })
    console.log(`\n📅 Leads dos últimos 30 dias: ${leadsLast30Days}`)

    // Simular exatamente a query da API com filtro padrão de 30d
    const apiQuery = await prisma.lead.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        company: true,
        _count: {
          select: { notes: true }
        }
      },
      orderBy: [
        { isNew: 'desc' },
        { priorityScore: 'desc' },
        { createdAt: 'desc' }
      ],
      skip: 0,
      take: 20
    })

    console.log(`\n🔄 Simulação da API (filtro 30d, pageSize=20):`)
    console.log(`   Retornados: ${apiQuery.length} leads`)
    apiQuery.forEach((lead, idx) => {
      console.log(`   ${idx + 1}. ${lead.company.name}`)
    })

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugLeadsCount()
