import { prisma } from '../lib/prisma'

async function checkDatabaseStatus() {
  console.log('📊 DIAGNÓSTICO COMPLETO DO PROBLEMA\n')

  // Contar empresas e leads
  const companies = await prisma.company.findMany({
    include: {
      _count: {
        select: { leads: true }
      },
      leads: {
        select: {
          id: true,
          jobTitle: true,
          relatedJobs: true,
          createdAt: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  const totalCompanies = companies.length
  const companiesWithLeads = companies.filter(c => c._count.leads > 0).length
  const companiesWithoutLeads = totalCompanies - companiesWithLeads
  const totalLeads = companies.reduce((sum, c) => sum + c._count.leads, 0)

  console.log(`Total de empresas: ${totalCompanies}`)
  console.log(`Empresas COM leads: ${companiesWithLeads}`)
  console.log(`Empresas SEM leads: ${companiesWithoutLeads}`)
  console.log(`Total de leads: ${totalLeads}\n`)

  console.log('📋 ANÁLISE POR EMPRESA:')
  console.log('='.repeat(100))

  for (const company of companies) {
    const ageHours = Math.floor((Date.now() - new Date(company.createdAt).getTime()) / 1000 / 60 / 60)

    let status = '❌ SEM LEAD'
    if (company._count.leads > 0) {
      const lead = company.leads[0]
      const relatedJobsCount = lead.relatedJobs ? JSON.parse(lead.relatedJobs as string).length : 0
      status = `✅ ${company._count.leads} lead(s), ${relatedJobsCount} vagas relacionadas`
    }

    console.log(
      `${company.name.padEnd(40)} | ${status.padEnd(30)} | Idade: ${ageHours}h`
    )
  }

  console.log('\n\n🔍 CONCLUSÃO:')
  console.log('='.repeat(100))

  if (companiesWithoutLeads > 0) {
    console.log(`⚠️  ${companiesWithoutLeads} empresas foram criadas mas NÃO TÊM LEADS!`)
    console.log('   Isso pode acontecer quando:')
    console.log('   1. A empresa foi criada mas o lead falhou na criação')
    console.log('   2. Processo foi interrompido antes de criar o lead')
    console.log('   3. Erro durante enrichment')
  }

  if (companiesWithLeads > 0) {
    console.log(`✅ ${companiesWithLeads} empresas têm leads associados`)
    console.log(`   Quando você clica "Buscar", empresas existentes são ATUALIZADAS, não duplicadas.`)
    console.log(`   Por isso você vê apenas 1 novo lead - as outras empresas já existem!`)
  }

  await prisma.$disconnect()
}

checkDatabaseStatus().catch(console.error)
