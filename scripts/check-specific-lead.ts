import { prisma } from '../lib/prisma'

async function checkSpecificLead() {
  try {
    const leadId = '8e819db0-c4c8-49ef-940d-310b0221648f'

    console.log(`🔍 Verificando lead ${leadId}...\n`)

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        company: true,
        notes: true
      }
    })

    if (!lead) {
      console.log('❌ Lead não encontrado!')
      return
    }

    console.log('📊 Dados do lead:')
    console.log(`   ID: ${lead.id}`)
    console.log(`   Empresa: ${lead.company.name}`)
    console.log(`   Cargo: ${lead.jobTitle}`)
    console.log(`   Status: ${lead.status}`)
    console.log(`   isNew: ${lead.isNew}`)
    console.log(`   priorityScore: ${lead.priorityScore}`)
    console.log(`   createdAt: ${lead.createdAt}`)
    console.log(`   updatedAt: ${lead.updatedAt}`)

    const now = new Date()
    const daysAgo = Math.floor((now.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    console.log(`   Idade: ${daysAgo} dias\n`)

    // Buscar todos os leads com a mesma ordenação da API
    console.log('\n📝 Posição na lista ordenada:')
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

    const position = allLeads.findIndex(l => l.id === leadId)
    console.log(`   Posição: ${position + 1} de ${allLeads.length}`)

    if (position >= 20) {
      console.log(`   ⚠️  PROBLEMA: Este lead está na posição ${position + 1}, mas a API retorna apenas os primeiros 20!`)
    }

    // Mostrar os leads ao redor dele na lista
    console.log('\n📋 Leads ao redor na lista ordenada:')
    const start = Math.max(0, position - 2)
    const end = Math.min(allLeads.length, position + 3)

    for (let i = start; i < end; i++) {
      const l = allLeads[i]
      const marker = i === position ? '👉' : '  '
      console.log(`${marker} ${i + 1}. ${l.company.name} - ${l.jobTitle}`)
      console.log(`      isNew: ${l.isNew} | priority: ${l.priorityScore} | status: ${l.status}`)
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSpecificLead()
