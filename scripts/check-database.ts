import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDatabase() {
  console.log('📊 Verificando banco de dados...\n')

  // Contar registros
  const companiesCount = await prisma.company.count()
  const leadsCount = await prisma.lead.count()
  const notesCount = await prisma.note.count()
  const usersCount = await prisma.user.count()

  console.log('📈 Estatísticas:')
  console.log(`   - Empresas: ${companiesCount}`)
  console.log(`   - Leads: ${leadsCount}`)
  console.log(`   - Notas: ${notesCount}`)
  console.log(`   - Usuários: ${usersCount}\n`)

  // Listar empresas
  const companies = await prisma.company.findMany({
    select: {
      name: true,
      revenue: true,
      employees: true,
      sector: true,
    }
  })

  console.log('🏢 Empresas no banco:')
  console.log('─'.repeat(60))
  companies.forEach(c => {
    const revenue = c.revenue
      ? `R$ ${(c.revenue / 1_000_000).toFixed(1)}M`
      : 'N/A'
    console.log(`${c.name}`)
    console.log(`   Faturamento: ${revenue} | Funcionários: ${c.employees || 'N/A'}`)
    console.log(`   Setor: ${c.sector || 'N/A'}\n`)
  })

  // Listar leads com score
  const leads = await prisma.lead.findMany({
    include: {
      company: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      priorityScore: 'desc'
    }
  })

  console.log('📋 Leads (ordenados por prioridade):')
  console.log('─'.repeat(60))
  leads.forEach(l => {
    console.log(`${l.company.name} - ${l.jobTitle}`)
    console.log(`   Score: ${l.priorityScore}/100 | Status: ${l.status} | Novo: ${l.isNew ? 'Sim' : 'Não'}`)

    // Contar contatos e gatilhos
    const contacts = l.suggestedContacts ? JSON.parse(l.suggestedContacts).length : 0
    const triggers = l.triggers ? JSON.parse(l.triggers).length : 0
    console.log(`   IA: ${contacts} contatos, ${triggers} gatilhos\n`)
  })

  await prisma.$disconnect()
}

checkDatabase()
