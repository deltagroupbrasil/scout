import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createSaveLead() {
  console.log('🏢 Criando lead de exemplo: Save Co. - CFO\n')

  try {
    // 1. Criar ou encontrar a empresa
    const company = await prisma.company.upsert({
      where: { cnpj: '00000000000000' },
      update: {},
      create: {
        name: 'Save Inteligência Tributária',
        cnpj: '00000000000000', // CNPJ fictício para exemplo
        website: 'https://saveinteligenciatributaria.com.br/',
        sector: 'Serviços Tributários e Consultoria Fiscal',
        location: 'São Paulo, SP',
        estimatedRevenue: 'R$ 50M',
        estimatedEmployees: '150',
        linkedinUrl: 'https://www.linkedin.com/company/save-inteligencia-tributaria/',

        // Informações enriquecidas
        recentNews: JSON.stringify([
          {
            title: 'Save expande atuação em inteligência tributária',
            url: 'https://exemplo.com/noticia',
            date: '2024-11-01',
            summary: 'Empresa de consultoria tributária anuncia expansão nacional'
          }
        ]),

        instagramHandle: '@saveinteligencia',
        instagramFollowers: '5000',
        linkedinFollowers: '12000',

        industryPosition: 'Empresa de consultoria tributária e fiscal em crescimento, especializada em recuperação de créditos e planejamento tributário',

        keyInsights: JSON.stringify([
          'Crescimento de 40% no último ano',
          'Especialização em inteligência tributária',
          'Forte presença digital e networking',
          'Expansão de equipe em andamento'
        ]),

        enrichedAt: new Date(),
      },
    })

    console.log(`✅ Empresa criada/atualizada: ${company.name}`)

    // 2. Criar o lead (vaga de CFO)
    const lead = await prisma.lead.create({
      data: {
        companyId: company.id,

        jobTitle: 'Chief Financial Officer (CFO)',
        jobDescription: `Estamos em busca de um CFO estratégico para liderar nossa área financeira em um momento de forte crescimento e expansão nacional.

Responsabilidades:
• Liderar toda a área financeira, contábil e controladoria
• Desenvolver e implementar estratégia financeira de longo prazo
• Gestão de fluxo de caixa, budget e forecast
• Relacionamento com investidores e stakeholders
• Estruturação de processos e controles internos
• Liderança de equipe de 15+ profissionais
• Análise de viabilidade de novos projetos e M&A
• Compliance fiscal e tributário

Requisitos:
• Formação em Contabilidade, Economia ou Administração
• Experiência mínima de 10 anos em posições de liderança financeira
• Vivência em empresas de consultoria ou serviços
• Conhecimento profundo de tributação brasileira
• Excel avançado, Power BI e sistemas ERP
• Inglês avançado
• CRC ativo (desejável)

Oferecemos:
• Remuneração compatível com mercado (R$ 25-35K)
• Bônus por performance
• Participação nos lucros
• Plano de saúde e odontológico
• Vale refeição e alimentação
• Gympass
• Modelo híbrido (3x semana presencial)`,

        jobUrl: 'https://www.linkedin.com/jobs/view/4332783108/',
        jobPostedDate: new Date('2024-11-10'),
        jobSource: 'LinkedIn',
        candidateCount: 47,

        // Vagas relacionadas (mesma empresa ou similares)
        relatedJobs: JSON.stringify([
          {
            title: 'Controller Financeiro',
            url: 'https://www.linkedin.com/jobs/view/example1/',
            postedDate: '2024-11-05'
          },
          {
            title: 'Gerente de Controladoria',
            url: 'https://www.linkedin.com/jobs/view/example2/',
            postedDate: '2024-10-28'
          }
        ]),

        // Contatos sugeridos pela IA
        suggestedContacts: JSON.stringify([
          {
            name: 'Rodrigo Silva',
            role: 'CEO & Founder',
            email: 'rodrigo.silva@saveinteligencia.com.br',
            linkedin: 'https://www.linkedin.com/in/rodrigo-silva-save/',
            reasoning: 'Como fundador e CEO, é o decisor final para posição C-Level como CFO'
          },
          {
            name: 'Ana Carolina Mendes',
            role: 'Head de People & Culture',
            email: 'ana.mendes@saveinteligencia.com.br',
            linkedin: 'https://www.linkedin.com/in/ana-mendes-rh/',
            reasoning: 'Responsável por recrutamento executivo e processo seletivo de liderança'
          },
          {
            name: 'Carlos Eduardo Santos',
            role: 'Sócio-Diretor',
            email: 'carlos.santos@saveinteligencia.com.br',
            linkedin: 'https://www.linkedin.com/in/carlos-santos-save/',
            reasoning: 'Sócio-diretor envolvido em decisões estratégicas e contratações C-Level'
          }
        ]),

        // Gatilhos de abordagem gerados pela IA
        triggers: JSON.stringify([
          'Expansão Nacional Acelerada: Empresa crescendo 40% ao ano e expandindo para novos estados, necessita estruturação financeira robusta',

          'Profissionalização da Gestão: Momento de transição de startup para scale-up, demandando CFO experiente para implementar processos',

          'Captação de Investimento: Sinais de preparação para rodada de investimento (contratação de CFO C-Level é indicador clássico)',

          'Múltiplas Vagas Financeiras: Além do CFO, empresa está contratando Controller e Gerente de Controladoria, indicando estruturação completa da área',

          'Setor em Alta: Consultoria tributária em crescimento com reforma tributária em discussão no Brasil',

          'Forte Presença Digital: 12K seguidores no LinkedIn indica empresa moderna e em crescimento, atrativa para talentos',

          'Budget Significativo: Faixa salarial de R$ 25-35K para CFO demonstra investimento sério em liderança financeira'
        ]),

        status: 'NEW',
        priorityScore: 92, // Score alto devido aos múltiplos gatilhos
        isNew: true,
      },
    })

    console.log(`✅ Lead criado: ${lead.jobTitle}`)
    console.log(`📊 Priority Score: ${lead.priorityScore}`)
    console.log(`🎯 ${JSON.parse(lead.triggers).length} gatilhos identificados`)
    console.log(`👥 ${JSON.parse(lead.suggestedContacts).length} contatos sugeridos`)
    console.log(`\n🔗 Acesse: http://localhost:3001/dashboard/leads/${lead.id}`)

  } catch (error) {
    console.error('❌ Erro ao criar lead:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSaveLead()
