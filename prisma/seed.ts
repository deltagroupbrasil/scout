import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar usuário admin
  const hashedPassword = await hash('admin123', 12)

  const user = await prisma.user.upsert({
    where: { email: 'admin@leapsolutions.com.br' },
    update: {},
    create: {
      email: 'admin@leapsolutions.com.br',
      name: 'Administrador',
      password: hashedPassword,
    },
  })

  console.log('✅ Usuário admin criado:', user.email)

  // Criar empresa de exemplo
  const company = await prisma.company.create({
    data: {
      name: 'Ambev S.A.',
      cnpj: '07526557000100',
      revenue: 50000000,
      employees: 5000,
      sector: 'Bebidas',
      location: 'São Paulo, SP',
      website: 'https://www.ambev.com.br',
      linkedinUrl: 'https://www.linkedin.com/company/ambev',
    },
  })

  console.log('✅ Empresa de exemplo criada:', company.name)

  // Criar lead de exemplo
  const suggestedContacts = [
    {
      name: 'Carlos Mendes',
      role: 'CFO',
      linkedin: 'https://www.linkedin.com/in/carlos-mendes',
      email: 'carlos.mendes@ambev.com.br',
    },
    {
      name: 'Ana Paula Costa',
      role: 'Diretora Financeira',
      linkedin: 'https://www.linkedin.com/in/anapaula-costa',
    },
  ]

  const triggers = [
    'Empresa participou da ExpoGestão 2024 em outubro',
    'Crescimento de 20% no faturamento (2023 vs 2024)',
    'Expansão para 3 novas unidades no Nordeste',
    'Vaga aberta há apenas 3 dias - oportunidade fresca',
  ]

  const lead = await prisma.lead.create({
    data: {
      companyId: company.id,
      jobTitle: 'Controller Sênior',
      jobDescription: 'Responsável por coordenar equipe de controladoria, análises gerenciais, fechamento contábil e reporting financeiro. Requisitos: experiência em S/4 HANA, inglês fluente.',
      jobUrl: 'https://www.linkedin.com/jobs/view/123456789',
      jobPostedDate: new Date(),
      jobSource: 'LinkedIn',
      candidateCount: 45,
      status: 'NEW',
      isNew: true,
      suggestedContacts: JSON.stringify(suggestedContacts),
      triggers: JSON.stringify(triggers),
    },
  })

  console.log('✅ Lead de exemplo criado:', lead.jobTitle)

  // Criar nota de exemplo
  await prisma.note.create({
    data: {
      leadId: lead.id,
      userId: user.id,
      content: 'Ligação com Carlos agendada para 13/11 às 14h',
    },
  })

  console.log('✅ Nota de exemplo criada')

  // Criar mais empresas e leads
  const companies = [
    {
      name: 'Magazine Luiza',
      cnpj: '47960950000121',
      revenue: 45000000,
      employees: 3500,
      sector: 'Varejo',
      location: 'São Paulo, SP',
      website: 'https://www.magazineluiza.com.br',
      linkedinUrl: 'https://www.linkedin.com/company/magazine-luiza',
    },
    {
      name: 'Natura Cosméticos',
      cnpj: '71673990000177',
      revenue: 28000000,
      employees: 7000,
      sector: 'Cosméticos',
      location: 'São Paulo, SP',
      website: 'https://www.natura.com.br',
      linkedinUrl: 'https://www.linkedin.com/company/natura',
    },
    {
      name: 'Localiza Rent a Car',
      cnpj: '16670085000155',
      revenue: 30000000,
      employees: 8000,
      sector: 'Locação de Veículos',
      location: 'Belo Horizonte, MG',
      website: 'https://www.localiza.com',
      linkedinUrl: 'https://www.linkedin.com/company/localiza',
    },
  ]

  for (const companyData of companies) {
    const newCompany = await prisma.company.create({
      data: companyData,
    })

    const jobTitles = [
      'Gerente de Controladoria',
      'CFO',
      'Coordenador de BPO Financeiro',
    ]

    const jobTitle = jobTitles[Math.floor(Math.random() * jobTitles.length)]

    const leadContacts = [
      {
        name: 'Roberto Santos',
        role: 'CFO',
      },
      {
        name: 'Mariana Costa',
        role: 'Diretora Financeira',
      },
    ]

    const leadTriggers = [
      `${newCompany.name} está em processo de expansão`,
      'Empresa abriu nova unidade recentemente',
      'Investimento em digitalização de processos financeiros',
      'Oportunidade para otimização de controladoria',
    ]

    await prisma.lead.create({
      data: {
        companyId: newCompany.id,
        jobTitle,
        jobDescription: `Estamos buscando profissional experiente para ${jobTitle}. Responsável por liderar equipe financeira, reporting gerencial, e garantir compliance com normas contábeis. Requisitos: experiência em ERP, inglês intermediário.`,
        jobUrl: `https://www.linkedin.com/jobs/view/${Math.floor(Math.random() * 1000000)}`,
        jobPostedDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        jobSource: 'LinkedIn',
        candidateCount: Math.floor(Math.random() * 100) + 20,
        status: Math.random() > 0.5 ? 'NEW' : 'CONTACTED',
        isNew: Math.random() > 0.5,
        suggestedContacts: JSON.stringify(leadContacts),
        triggers: JSON.stringify(leadTriggers),
      },
    })

    console.log(`✅ Lead criado para: ${newCompany.name}`)
  }

  console.log('\n🎉 Seed concluído com sucesso!')
  console.log(`📊 Total: ${companies.length + 1} empresas e ${companies.length + 1} leads criados`)
  console.log('\n📋 Credenciais de acesso:')
  console.log('   Email: admin@leapsolutions.com.br')
  console.log('   Senha: admin123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Erro no seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
