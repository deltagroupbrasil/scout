import { prisma } from "../lib/prisma"

async function checkLeads() {
  try {
    const leadCount = await prisma.lead.count()
    const companyCount = await prisma.company.count()
    
    console.log(`📊 DADOS NO BANCO:`)
    console.log(`   - Leads: ${leadCount}`)
    console.log(`   - Companies: ${companyCount}`)
    
    const recentLeads = await prisma.lead.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { company: true }
    })
    
    console.log(`\n📝 Últimos 5 leads:`)
    recentLeads.forEach((lead, i) => {
      console.log(`   ${i+1}. ${lead.company.name} - ${lead.jobTitle}`)
      console.log(`      Criado: ${lead.createdAt}`)
    })
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkLeads()
