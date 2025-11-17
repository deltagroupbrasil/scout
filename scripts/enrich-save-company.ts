import { PrismaClient } from '@prisma/client'
import { aiCompanyEnrichment } from '../lib/services/ai-company-enrichment'

const prisma = new PrismaClient()

async function enrichSaveCompany() {
  const leadId = '8e819db0-c4c8-49ef-940d-310b0221648f'

  console.log('🔍 Buscando lead...\n')

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { company: true }
  })

  if (!lead) {
    console.log('❌ Lead não encontrado')
    return
  }

  console.log('✅ Lead encontrado:', lead.company.name)
  console.log('Website atual:', lead.company.website)
  console.log('\n🤖 Buscando dados REAIS com Claude Sonnet 4.5...\n')

  const enrichedData = await aiCompanyEnrichment.enrichCompany({
    companyName: lead.company.name,
    website: lead.company.website || undefined,
    location: lead.location || undefined
  })

  console.log('\n📊 DADOS ENCONTRADOS:')
  console.log('=====================================')
  console.log('CNPJ:', enrichedData.cnpj || 'Não encontrado')
  console.log('Faturamento:', enrichedData.revenue || 'Não encontrado')
  console.log('Funcionários:', enrichedData.employees || 'Não encontrado')
  console.log('Website:', enrichedData.website || lead.company.website)
  console.log('LinkedIn:', enrichedData.linkedin || 'Não encontrado')
  console.log('Instagram:', enrichedData.instagram || 'Não encontrado')

  if (enrichedData.news && enrichedData.news.length > 0) {
    console.log('\n📰 NOTÍCIAS RECENTES:')
    enrichedData.news.forEach((item, i) => {
      console.log(`${i + 1}. ${item.title}`)
      console.log(`   Data: ${item.date}`)
      console.log(`   URL: ${item.url}`)
    })
  }

  console.log('\n💾 Atualizando dados no banco...')

  // Atualizar company
  await prisma.company.update({
    where: { id: lead.companyId },
    data: {
      cnpj: enrichedData.cnpj || lead.company.cnpj,
      estimatedRevenue: enrichedData.revenue || lead.company.estimatedRevenue,
      estimatedEmployees: enrichedData.employees || lead.company.estimatedEmployees,
      website: enrichedData.website || lead.company.website,
      linkedin: enrichedData.linkedin,
      instagram: enrichedData.instagram,
      updatedAt: new Date()
    }
  })

  console.log('✅ Dados atualizados com sucesso!')

  // Mostrar dados finais
  const updatedLead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { company: true }
  })

  console.log('\n✨ DADOS FINAIS DA EMPRESA:')
  console.log('=====================================')
  console.log('Nome:', updatedLead!.company.name)
  console.log('CNPJ:', updatedLead!.company.cnpj)
  console.log('Faturamento:', updatedLead!.company.estimatedRevenue)
  console.log('Funcionários:', updatedLead!.company.estimatedEmployees)
  console.log('Website:', updatedLead!.company.website)
  console.log('LinkedIn:', updatedLead!.company.linkedin)
  console.log('Instagram:', updatedLead!.company.instagram)
}

enrichSaveCompany()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('❌ Erro:', error)
    prisma.$disconnect()
  })
