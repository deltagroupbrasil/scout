import { prisma } from '../lib/prisma'

async function removeDuplicateLeads() {
  try {
    console.log('🔍 Buscando leads duplicados...\n')

    // Buscar todos os leads
    const allLeads = await prisma.lead.findMany({
      include: {
        company: true
      },
      orderBy: {
        createdAt: 'asc' // Manter o mais antigo
      }
    })

    console.log(`📊 Total de leads: ${allLeads.length}`)

    // Agrupar por companyId + jobTitle
    const leadsByKey = new Map<string, typeof allLeads>()

    for (const lead of allLeads) {
      const key = `${lead.companyId}-${lead.jobTitle.toLowerCase().trim()}`

      if (!leadsByKey.has(key)) {
        leadsByKey.set(key, [])
      }
      leadsByKey.get(key)!.push(lead)
    }

    // Encontrar duplicatas
    const duplicates: Array<{
      company: string
      jobTitle: string
      leads: typeof allLeads
    }> = []

    for (const [key, leads] of leadsByKey.entries()) {
      if (leads.length > 1) {
        duplicates.push({
          company: leads[0].company.name,
          jobTitle: leads[0].jobTitle,
          leads
        })
      }
    }

    if (duplicates.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada!')
      return
    }

    console.log(`\n⚠️  Encontradas ${duplicates.length} duplicatas:\n`)

    for (const dup of duplicates) {
      console.log(`🏢 ${dup.company} - ${dup.jobTitle}`)
      console.log(`   Total de duplicatas: ${dup.leads.length}`)

      // Manter o primeiro (mais antigo) e remover os demais
      const toKeep = dup.leads[0]
      const toDelete = dup.leads.slice(1)

      console.log(`   ✅ Mantendo: ID ${toKeep.id} (criado em ${toKeep.createdAt.toISOString()})`)

      for (const lead of toDelete) {
        console.log(`   ❌ Removendo: ID ${lead.id} (criado em ${lead.createdAt.toISOString()})`)
        await prisma.lead.delete({
          where: { id: lead.id }
        })
      }
      console.log()
    }

    // Contar novamente
    const finalCount = await prisma.lead.count()
    console.log(`\n✅ Duplicatas removidas com sucesso!`)
    console.log(`📊 Total de leads após limpeza: ${finalCount}`)

    // Verificar empresas únicas
    const uniqueCompanies = await prisma.lead.findMany({
      distinct: ['companyId'],
      select: { companyId: true }
    })
    console.log(`🏢 Total de empresas únicas: ${uniqueCompanies.length}`)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

removeDuplicateLeads()
