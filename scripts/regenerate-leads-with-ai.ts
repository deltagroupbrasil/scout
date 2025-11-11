import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { aiInsights } from '../lib/services/ai-insights'

const prisma = new PrismaClient()

async function regenerateLeads() {
  console.log('🔄 Regenerando insights dos leads com IA...\n')

  const leads = await prisma.lead.findMany({
    include: {
      company: true
    }
  })

  console.log(`📊 Encontrados ${leads.length} leads\n`)

  for (const lead of leads) {
    console.log(`🤖 Processando: ${lead.company.name} - ${lead.jobTitle}`)

    try {
      const insights = await aiInsights.generateInsights(
        lead.company.name,
        lead.company.sector || '',
        lead.jobTitle,
        lead.jobDescription
      )

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          suggestedContacts: JSON.stringify(insights.suggestedContacts),
          triggers: JSON.stringify(insights.triggers)
        }
      })

      console.log(`   ✅ ${insights.suggestedContacts.length} contatos e ${insights.triggers.length} gatilhos gerados\n`)

      // Delay para não sobrecarregar API
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`   ❌ Erro:`, error instanceof Error ? error.message : error)
    }
  }

  console.log('✨ Regeneração concluída!')
  await prisma.$disconnect()
}

regenerateLeads()
