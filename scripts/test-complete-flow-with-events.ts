/**
 * Teste do fluxo completo com eventos e triggers
 * LinkedIn → CNPJ → Nova Vida → Eventos → Triggers → Lead
 */

require('dotenv').config()

import { leadOrchestrator } from '../lib/services/lead-orchestrator'
import { prisma } from '../lib/prisma'

async function testCompleteFlow() {
  console.log('========================================')
  console.log('TESTE: Fluxo Completo (LinkedIn → Eventos → Triggers)')
  console.log('========================================\n')

  // Mock de vaga do LinkedIn (Magazine Luiza)
  const mockJob = {
    jobTitle: 'Controller Financeiro',
    companyName: 'Magazine Luiza',
    jobUrl: 'https://www.linkedin.com/jobs/view/123456',
    companyUrl: 'https://www.linkedin.com/company/magazine-luiza',
    description: 'Estamos buscando um Controller Financeiro para liderar nossa equipe de controladoria.',
    postedDate: '2025-01-15',
    applicants: 45,
  }

  console.log('Vaga de teste:')
  console.log(`  Empresa: ${mockJob.companyName}`)
  console.log(`  Cargo: ${mockJob.jobTitle}`)
  console.log(`  Candidatos: ${mockJob.applicants}\n`)

  // Processar vaga
  console.log('Iniciando processamento...\n')
  const leadId = await leadOrchestrator.processCompanyWithMultipleJobs([mockJob as any])

  if (!leadId) {
    console.error('Erro: Lead não foi criado!')
    return
  }

  console.log(`\n\n========================================`)
  console.log('VERIFICANDO RESULTADOS')
  console.log('========================================\n')

  // Buscar lead completo com empresa
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      company: true,
    },
  })

  if (!lead) {
    console.error('Lead não encontrado!')
    return
  }

  console.log(`Lead ID: ${lead.id}`)
  console.log(`Empresa: ${lead.company.name}`)
  console.log(`CNPJ: ${lead.company.cnpj || 'N/A'}`)
  console.log(`Website: ${lead.company.website || 'N/A'}`)
  console.log(`Revenue: ${lead.company.revenue ? `R$ ${(lead.company.revenue / 1_000_000).toFixed(1)}M` : 'N/A'}`)
  console.log(`Funcionários: ${lead.company.employees || 'N/A'}`)
  console.log(`Setor: ${lead.company.sector || 'N/A'}`)

  // Verificar sócios (Nova Vida API)
  console.log(`\n${'='.repeat(60)}`)
  console.log('SÓCIOS (Nova Vida API)')
  console.log('='.repeat(60))

  if (lead.company.partners) {
    const partners = JSON.parse(lead.company.partners)
    console.log(`Total de sócios: ${partners.length}`)

    partners.forEach((partner: any, idx: number) => {
      console.log(`\n${idx + 1}. ${partner.nome}`)
      console.log(`   Cargo: ${partner.qualificacao}`)
      if (partner.telefones?.length > 0) {
        console.log(`   Telefones: ${partner.telefones.join(', ')}`)
      }
      if (partner.emails?.length > 0) {
        console.log(`   Emails: ${partner.emails.join(', ')}`)
      }
    })
  } else {
    console.log('Nenhum sócio encontrado')
  }

  // Verificar eventos e notícias
  console.log(`\n${'='.repeat(60)}`)
  console.log('EVENTOS E NOTÍCIAS')
  console.log('='.repeat(60))

  let eventsDetected = false

  if (lead.company.recentNews) {
    const news = JSON.parse(lead.company.recentNews as string)
    console.log(`\nNotícias recentes: ${news.length}`)
    news.slice(0, 3).forEach((n: any, idx: number) => {
      console.log(`\n${idx + 1}. ${n.title}`)
      console.log(`   Descrição: ${n.description || 'N/A'}`)
      console.log(`   Fonte: ${n.source}`)
      console.log(`   Data: ${new Date(n.date).toLocaleDateString('pt-BR')}`)
      console.log(`   Sentimento: ${n.sentiment}`)
      if (n.url) console.log(`   URL: ${n.url}`)
    })
    eventsDetected = true
  } else {
    console.log('\nNenhuma notícia recente detectada')
  }

  if (lead.company.upcomingEvents) {
    const events = JSON.parse(lead.company.upcomingEvents as string)
    console.log(`\n\nEventos futuros: ${events.length}`)
    events.forEach((e: any, idx: number) => {
      console.log(`\n${idx + 1}. ${e.title}`)
      console.log(`   Tipo: ${e.type}`)
      console.log(`   Descrição: ${e.description || 'N/A'}`)
      console.log(`   Data: ${new Date(e.date).toLocaleDateString('pt-BR')}`)
    })
    eventsDetected = true
  }

  if (lead.company.eventsDetectedAt) {
    console.log(`\n\nDetectados em: ${new Date(lead.company.eventsDetectedAt).toLocaleString('pt-BR')}`)
  }

  // Verificar triggers de abordagem
  console.log(`\n${'='.repeat(60)}`)
  console.log('TRIGGERS DE ABORDAGEM')
  console.log('='.repeat(60))

  if (lead.triggers) {
    const triggers = JSON.parse(lead.triggers)
    console.log(`\nTotal de triggers: ${triggers.length}`)
    triggers.forEach((trigger: string, idx: number) => {
      console.log(`${idx + 1}. ${trigger}`)
    })
  } else {
    console.log('\nNenhum trigger gerado')
  }

  // Verificar contatos sugeridos
  console.log(`\n${'='.repeat(60)}`)
  console.log('CONTATOS SUGERIDOS')
  console.log('='.repeat(60))

  if (lead.suggestedContacts) {
    const contacts = JSON.parse(lead.suggestedContacts)
    console.log(`\nTotal de contatos: ${contacts.length}`)
    contacts.forEach((contact: any, idx: number) => {
      console.log(`\n${idx + 1}. ${contact.name}`)
      console.log(`   Cargo: ${contact.role}`)
      console.log(`   Email: ${contact.email || 'N/A'}`)
      console.log(`   Telefone: ${contact.phone || 'N/A'}`)
      console.log(`   LinkedIn: ${contact.linkedin || 'N/A'}`)
      console.log(`   Fonte: ${contact.source}`)
    })
  } else {
    console.log('\nNenhum contato sugerido')
  }

  // Priority Score
  console.log(`\n${'='.repeat(60)}`)
  console.log('PRIORITY SCORE')
  console.log('='.repeat(60))
  console.log(`\nScore: ${lead.priorityScore}/100`)

  // Resumo final
  console.log(`\n\n${'='.repeat(60)}`)
  console.log('RESUMO DO FLUXO')
  console.log('='.repeat(60))
  console.log(`✅ Lead criado: ${lead.id}`)
  console.log(`✅ Empresa enriquecida: ${lead.company.name}`)
  console.log(`${lead.company.cnpj ? '✅' : '❌'} CNPJ: ${lead.company.cnpj || 'Não encontrado'}`)
  console.log(`${lead.company.partners ? '✅' : '❌'} Sócios (Nova Vida API): ${lead.company.partners ? JSON.parse(lead.company.partners).length : 0}`)
  console.log(`${eventsDetected ? '✅' : '❌'} Eventos detectados: ${eventsDetected ? 'Sim' : 'Não'}`)
  console.log(`${lead.triggers ? '✅' : '❌'} Triggers gerados: ${lead.triggers ? JSON.parse(lead.triggers).length : 0}`)
  console.log(`${lead.suggestedContacts ? '✅' : '❌'} Contatos sugeridos: ${lead.suggestedContacts ? JSON.parse(lead.suggestedContacts).length : 0}`)
  console.log(`✅ Priority Score: ${lead.priorityScore}/100`)

  console.log('\n========================================')
  console.log('TESTE CONCLUÍDO!')
  console.log('========================================\n')
}

testCompleteFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
