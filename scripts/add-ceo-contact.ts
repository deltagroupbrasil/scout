import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addCEOContact() {
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

  // Criar contatos sugeridos com o CEO real
  const suggestedContacts = [
    {
      name: 'Marcos Adriano Silva',
      role: 'CEO & Cofundador',
      linkedin: 'https://www.linkedin.com/in/marcos-adriano-silva-oficial/',
      email: null, // Não disponível publicamente
      phone: null, // Não disponível publicamente
      bio: 'Advogado, contador e cofundador da Save Co. Especialista em tributação, contabilidade, sustentabilidade e tecnologia.'
    },
    {
      name: 'Diretor de Operações',
      role: 'Diretor de Operações',
      linkedin: null,
      email: null,
      phone: null,
      bio: 'Responsável pelas operações da empresa (173 funcionários)'
    },
    {
      name: 'Gerente de RH',
      role: 'Gerente de Recursos Humanos',
      linkedin: null,
      email: null,
      phone: null,
      bio: 'Responsável por contratações e gestão de pessoas'
    }
  ]

  // Criar triggers de abordagem baseados no perfil real da empresa
  const triggers = [
    'Empresa em forte crescimento (fundada em 2019, já possui 173 funcionários)',
    'Especializada em consultoria tributária - potencial interesse em soluções de controladoria',
    'CEO é advogado E contador - entende bem a dor de processos financeiros complexos',
    'Presença forte no LinkedIn (3.478 seguidores) - empresa inovadora e digital',
    'Sede em Jaraguá do Sul, SC - hub industrial com empresas de médio/grande porte',
    'Ecossistema integrado (tributação, contabilidade, ESG, tecnologia) - valorizam eficiência',
    'Capital social de R$ 30mil mas faturamento estimado em R$ 30M - alta rentabilidade',
    'Porte ideal para BPO Financeiro (173 funcionários = volume suficiente para justificar terceirização)'
  ]

  console.log('\n📝 Atualizando contatos sugeridos e triggers...')

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      suggestedContacts: JSON.stringify(suggestedContacts),
      triggers: JSON.stringify(triggers),
      updatedAt: new Date()
    }
  })

  console.log('✅ Contatos e triggers atualizados!')

  const updatedLead = await prisma.lead.findUnique({
    where: { id: leadId }
  })

  console.log('\n✨ CONTATOS SUGERIDOS:')
  console.log('=====================================')
  const contacts = JSON.parse(updatedLead!.suggestedContacts || '[]')
  contacts.forEach((contact: any, i: number) => {
    console.log(`\n${i + 1}. ${contact.name}`)
    console.log(`   Cargo: ${contact.role}`)
    if (contact.linkedin) console.log(`   LinkedIn: ${contact.linkedin}`)
    if (contact.bio) console.log(`   Bio: ${contact.bio}`)
  })

  console.log('\n\n🎯 GATILHOS DE ABORDAGEM:')
  console.log('=====================================')
  const parsedTriggers = JSON.parse(updatedLead!.triggers || '[]')
  parsedTriggers.forEach((trigger: string, i: number) => {
    console.log(`${i + 1}. ${trigger}`)
  })

  console.log('\n\n🎬 Lead pronto para demo!')
  console.log('Dados reais do CEO Marcos Adriano Silva adicionados.')
}

addCEOContact()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('❌ Erro:', error)
    prisma.$disconnect()
  })
