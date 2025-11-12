// Script para enriquecer leads existentes com contatos REAIS do Apollo.io
import 'dotenv/config' // Carregar variáveis de ambiente
import { prisma } from '../lib/prisma'
import { apolloEnrichment } from '../lib/services/apollo-enrichment'

async function enrichLeadsWithApollo() {
  console.log('🚀 Iniciando enriquecimento de leads com Apollo.io\n')

  // Buscar todos os leads com suas empresas
  const leads = await prisma.lead.findMany({
    include: {
      company: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  console.log(`📊 Total de leads: ${leads.length}`)
  console.log(`🏢 Empresas únicas: ${new Set(leads.map(l => l.company.name)).size}\n`)

  let enrichedCount = 0
  let failedCount = 0
  const processedCompanies = new Set<string>()

  for (const lead of leads) {
    const company = lead.company

    // Pular se já processamos esta empresa
    if (processedCompanies.has(company.id)) {
      console.log(`⏭️  ${company.name} - já processada`)
      continue
    }

    processedCompanies.add(company.id)

    console.log(`\n${'='.repeat(60)}`)
    console.log(`🏢 Empresa: ${company.name}`)
    console.log(`🌐 Website: ${company.website || 'Não disponível'}`)
    console.log(`${'='.repeat(60)}`)

    if (!company.website) {
      console.log(`⚠️  Sem website - pulando`)
      failedCount++
      continue
    }

    try {
      const domain = new URL(company.website).hostname.replace('www.', '')

      // Buscar decisores financeiros REAIS com Apollo
      const apolloContacts = await apolloEnrichment.findFinancialDecisionMakers(
        company.name,
        domain
      )

      if (apolloContacts.length > 0) {
        console.log(`✅ Encontrados ${apolloContacts.length} decisores REAIS:\n`)

        apolloContacts.forEach((contact, i) => {
          console.log(`${i + 1}. ${contact.name}`)
          console.log(`   Cargo: ${contact.role}`)
          console.log(`   📧 Email: ${contact.email || '❌ Não disponível'}`)
          console.log(`   📱 Telefone: ${contact.phone || '❌ Não disponível'}`)
          console.log(`   🔗 LinkedIn: ${contact.linkedin || '❌ Não disponível'}`)
          console.log()
        })

        // Atualizar TODOS os leads desta empresa com os contatos reais
        const companyLeads = leads.filter(l => l.company.id === company.id)

        for (const companyLead of companyLeads) {
          await prisma.lead.update({
            where: { id: companyLead.id },
            data: {
              suggestedContacts: JSON.stringify(apolloContacts.map(c => ({
                name: c.name,
                role: c.role,
                email: c.email,
                phone: c.phone,
                linkedin: c.linkedin,
              }))),
            },
          })
        }

        console.log(`✅ ${companyLeads.length} lead(s) atualizados com contatos REAIS`)
        enrichedCount++
      } else {
        console.log(`⚠️  Nenhum decisor encontrado no Apollo`)
        failedCount++
      }

      // Rate limit - evitar muitas requisições por segundo
      await sleep(2000)
    } catch (error) {
      console.error(`❌ Erro ao enriquecer ${company.name}:`, error)
      failedCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO')
  console.log('='.repeat(60))
  console.log(`\n✅ Empresas enriquecidas: ${enrichedCount}`)
  console.log(`❌ Falhas: ${failedCount}`)
  console.log(`📧 Leads atualizados com emails e telefones REAIS`)
  console.log(`\n💡 Os contatos agora têm dados REAIS para prospecção efetiva!`)

  await prisma.$disconnect()
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

enrichLeadsWithApollo()
  .then(() => {
    console.log('\n🎉 Enriquecimento completo!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro no enriquecimento:', error)
    process.exit(1)
  })
