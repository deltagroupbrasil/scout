import { prisma } from '../lib/prisma'

async function checkDB() {
  const leads = await prisma.lead.count()
  const companies = await prisma.company.count()

  console.log('📊 Contagem do banco:')
  console.log(`   Leads: ${leads}`)
  console.log(`   Companies: ${companies}`)

  if (companies > 0) {
    const companiesWithData = await prisma.company.findMany({
      select: {
        name: true,
        revenue: true,
        employees: true,
        estimatedRevenue: true,
        estimatedEmployees: true,
        location: true,
      },
      take: 5,
    })

    console.log('\n📋 Primeiras 5 empresas:')
    companiesWithData.forEach((c, i) => {
      console.log(`\n${i + 1}. ${c.name}`)
      console.log(`   Revenue: ${c.revenue || 'N/A'}`)
      console.log(`   Employees: ${c.employees || 'N/A'}`)
      console.log(`   Estimated Revenue: ${c.estimatedRevenue || 'N/A'}`)
      console.log(`   Estimated Employees: ${c.estimatedEmployees || 'N/A'}`)
      console.log(`   Location: ${c.location || 'N/A'}`)
    })
  }

  await prisma.$disconnect()
}

checkDB()
