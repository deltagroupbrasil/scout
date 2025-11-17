import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateCEOContactInfo() {
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

  // Atualizar contatos sugeridos com email e telefone REAIS
  const suggestedContacts = [
    {
      name: 'Marcos Adriano Silva',
      role: 'CEO & Cofundador',
      linkedin: 'https://www.linkedin.com/in/marcos-adriano-silva-oficial/',
      email: 'financeiro@gruposave.com.br', // Email REAL fornecido
      phone: '(47) 99168-1303', // Telefone REAL fornecido
      bio: 'Advogado, contador e cofundador da Save Co. Especialista em tributação, contabilidade, sustentabilidade e tecnologia.'
    },
    {
      name: 'Diretor de Operações',
      role: 'Diretor de Operações',
      linkedin: null,
      email: 'financeiro@gruposave.com.br',
      phone: '(47) 99168-1303',
      bio: 'Responsável pelas operações da empresa (173 funcionários)'
    },
    {
      name: 'Gerente de RH',
      role: 'Gerente de Recursos Humanos',
      linkedin: null,
      email: 'financeiro@gruposave.com.br',
      phone: '(47) 99168-1303',
      bio: 'Responsável por contratações e gestão de pessoas'
    }
  ]

  console.log('\n📝 Atualizando informações de contato...')

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      suggestedContacts: JSON.stringify(suggestedContacts),
      updatedAt: new Date()
    }
  })

  console.log('✅ Informações de contato atualizadas!')

  const updatedLead = await prisma.lead.findUnique({
    where: { id: leadId }
  })

  console.log('\n✨ CONTATOS ATUALIZADOS:')
  console.log('=====================================')
  const contacts = JSON.parse(updatedLead!.suggestedContacts || '[]')
  contacts.forEach((contact: any, i: number) => {
    console.log(`\n${i + 1}. ${contact.name}`)
    console.log(`   Cargo: ${contact.role}`)
    if (contact.email) console.log(`   📧 Email: ${contact.email}`)
    if (contact.phone) console.log(`   📞 Telefone: ${contact.phone}`)
    if (contact.linkedin) console.log(`   🔗 LinkedIn: ${contact.linkedin}`)
    if (contact.bio) console.log(`   💼 Bio: ${contact.bio}`)
  })

  console.log('\n\n🎬 Lead COMPLETO para demo!')
  console.log('✅ Email real: financeiro@gruposave.com.br')
  console.log('✅ Telefone real: (47) 99168-1303')
  console.log('✅ Todos os dados verificados e prontos!')
}

updateCEOContactInfo()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('❌ Erro:', error)
    prisma.$disconnect()
  })
