// Script para re-gerar contatos dos leads com emails corporativos corretos
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { contactEnrichment } from '../lib/services/contact-enrichment'
import { websiteFinder } from '../lib/services/website-finder'

async function regenerateLeadsWithNewEmails() {
  console.log('\n' + '='.repeat(70))
  console.log('🔄 RE-GERANDO CONTATOS COM EMAILS CORPORATIVOS')
  console.log('='.repeat(70) + '\n')

  // Buscar leads com contatos que têm @br.linkedin.com
  const leads = await prisma.lead.findMany({
    where: {
      suggestedContacts: {
        contains: '@br.linkedin.com',
      },
    },
    include: {
      company: true,
    },
  })

  console.log(`📊 Encontrados ${leads.length} leads para re-gerar contatos\n`)

  let successCount = 0
  let failCount = 0

  for (const lead of leads) {
    try {
      console.log('\n' + '-'.repeat(70))
      console.log(`📋 Lead: ${lead.jobTitle}`)
      console.log(`🏢 Empresa: ${lead.company.name}`)
      console.log(`🌐 Website: ${lead.company.website || 'N/A'}`)
      console.log('-'.repeat(70))

      // Verificar se a empresa tem website real
      if (!lead.company.website || lead.company.website.includes('linkedin.com')) {
        console.log(`⏭️  Empresa sem website corporativo, pulando...`)
        continue
      }

      // Extrair domínio
      const domain = websiteFinder.extractDomain(lead.company.website)
      if (!domain) {
        console.log(`⏭️  Não foi possível extrair domínio de ${lead.company.website}`)
        continue
      }

      console.log(`📧 Domínio: ${domain}`)

      // Parsear contatos existentes
      const oldContacts = JSON.parse(lead.suggestedContacts) as Array<{
        name: string
        role: string
        email?: string
        phone?: string
        linkedin?: string | null
      }>

      console.log(`\n🔄 Re-enriquecendo ${oldContacts.length} contatos...`)

      // Re-enriquecer cada contato
      const newContacts = []
      for (const contact of oldContacts) {
        console.log(`\n   🔍 ${contact.name} (${contact.role})`)

        const enriched = await contactEnrichment.enrichContact(
          contact.name,
          contact.role,
          lead.company.name,
          domain,
          contact.linkedin || undefined
        )

        newContacts.push({
          name: enriched.name,
          role: enriched.role,
          email: enriched.email,
          phone: enriched.phone,
          linkedin: enriched.linkedin,
        })

        console.log(`      📧 ${enriched.email || 'N/A'}`)
        console.log(`      Source: ${enriched.source}`)

        // Rate limit
        await sleep(1000)
      }

      // Atualizar lead
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          suggestedContacts: JSON.stringify(newContacts),
        },
      })

      console.log(`\n   ✅ Lead atualizado com novos emails!`)
      successCount++

    } catch (error) {
      console.error(`\n   ❌ Erro ao processar lead ${lead.id}:`, error)
      failCount++
    }

    // Delay entre leads
    await sleep(500)
  }

  // Resumo final
  console.log('\n\n' + '='.repeat(70))
  console.log('📊 RESUMO DA RE-GERAÇÃO')
  console.log('='.repeat(70))
  console.log(`\n✅ Leads atualizados: ${successCount}`)
  console.log(`❌ Erros: ${failCount}`)
  console.log(`⏭️  Pulados: ${leads.length - successCount - failCount}`)
  console.log(`📊 Total processado: ${leads.length}`)

  // Verificar leads com emails corporativos
  const leadsWithCorporateEmails = await prisma.lead.findMany({
    where: {
      AND: [
        { suggestedContacts: { not: { contains: '@br.linkedin.com' } } },
        { suggestedContacts: { not: null } },
      ],
    },
  })

  console.log(`\n📧 Leads com emails corporativos: ${leadsWithCorporateEmails.length}`)

  console.log('\n✅ Re-geração concluída!')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

regenerateLeadsWithNewEmails()
  .then(() => {
    console.log('\n🎉 Script finalizado com sucesso!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro no script:', error)
    process.exit(1)
  })
