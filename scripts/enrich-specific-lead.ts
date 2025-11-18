/**
 * Script para enriquecer lead específico com todos os dados
 */

require('dotenv').config()

import { prisma } from '../lib/prisma'
import { cnpjFinder } from '../lib/services/cnpj-finder'
import { novaVidaTIEnrichment } from '../lib/services/novavidati-enrichment'
import { eventsDetector } from '../lib/services/events-detector'
import { aiCompanyEnrichment } from '../lib/services/ai-company-enrichment'

async function enrichSpecificLead(leadId: string) {
  console.log('========================================')
  console.log('ENRIQUECIMENTO DE LEAD ESPECÍFICO')
  console.log('========================================\n')

  // 1. Buscar lead e empresa
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { company: true }
  })

  if (!lead) {
    console.error('Lead não encontrado!')
    return
  }

  const company = lead.company
  console.log(`Lead ID: ${leadId}`)
  console.log(`Empresa: ${company.name}`)
  console.log(`CNPJ atual: ${company.cnpj || 'Não tem'}\n`)

  // 2. Buscar CNPJ se não tiver
  let cnpj = company.cnpj
  if (!cnpj) {
    console.log('ETAPA 1: Buscando CNPJ via Claude API')
    console.log('--------------------------------------------------')
    cnpj = await cnpjFinder.findCNPJByName(company.name, company.website || undefined)

    if (cnpj) {
      await prisma.company.update({
        where: { id: company.id },
        data: { cnpj }
      })
      console.log(`CNPJ encontrado e salvo: ${cnpj}\n`)
    } else {
      console.log('CNPJ não encontrado. Continuando sem CNPJ...\n')
    }
  }

  // 3. Enriquecer com IA (revenue, employees, setor, notícias)
  console.log('ETAPA 2: Enriquecimento com Claude AI')
  console.log('--------------------------------------------------')

  const aiData = await aiCompanyEnrichment.enrichCompany(
    company.name,
    company.sector || undefined,
    company.website || undefined
  )

  if (aiData) {
    const updateData: any = {}

    if (aiData.cnpj && !cnpj) {
      updateData.cnpj = aiData.cnpj
      cnpj = aiData.cnpj
      console.log(`CNPJ encontrado pela IA: ${aiData.cnpj}`)
    }

    // Converter revenue de string para número
    if (aiData.revenue) {
      let revenueNumber: number | undefined

      if (typeof aiData.revenue === 'number') {
        revenueNumber = aiData.revenue
      } else if (typeof aiData.revenue === 'string') {
        // Parse "R$ 800 milhões - R$ 1 bilhão" ou "R$ 800 milhões"
        const revenueStr = aiData.revenue.toLowerCase()

        if (revenueStr.includes('bilhão') || revenueStr.includes('bilhao')) {
          const match = revenueStr.match(/([\d.,]+)/)
          if (match) {
            revenueNumber = parseFloat(match[1].replace(',', '.')) * 1_000_000_000
          }
        } else if (revenueStr.includes('milhão') || revenueStr.includes('milhao') || revenueStr.includes('milhões') || revenueStr.includes('milhoes')) {
          const match = revenueStr.match(/([\d.,]+)/)
          if (match) {
            revenueNumber = parseFloat(match[1].replace(',', '.')) * 1_000_000
          }
        } else {
          // Tentar converter número direto
          const cleaned = aiData.revenue.replace(/[^\d.,]/g, '').replace(',', '.')
          const parsed = parseFloat(cleaned)
          if (!isNaN(parsed)) {
            revenueNumber = parsed
          }
        }
      }

      if (revenueNumber && !isNaN(revenueNumber)) {
        updateData.revenue = revenueNumber
        console.log(`Revenue: R$ ${(revenueNumber / 1_000_000).toFixed(1)}M`)
      }
    }

    // Converter employees de string para número
    if (aiData.employees) {
      let employeesNumber: number | undefined

      if (typeof aiData.employees === 'number') {
        employeesNumber = aiData.employees
      } else if (typeof aiData.employees === 'string') {
        // Parse "3.000-4.000" ou "3000" ou "3.000"
        const employeesStr = aiData.employees.replace(/\./g, '').replace(/,/g, '')

        if (employeesStr.includes('-')) {
          // Pegar a média da faixa
          const parts = employeesStr.split('-')
          const min = parseInt(parts[0])
          const max = parseInt(parts[1])
          if (!isNaN(min) && !isNaN(max)) {
            employeesNumber = Math.floor((min + max) / 2)
          }
        } else {
          const parsed = parseInt(employeesStr)
          if (!isNaN(parsed)) {
            employeesNumber = parsed
          }
        }
      }

      if (employeesNumber && !isNaN(employeesNumber)) {
        updateData.employees = employeesNumber
        console.log(`Funcionários: ${employeesNumber}`)
      }
    }

    if (aiData.sector) {
      updateData.sector = aiData.sector
      console.log(`Setor: ${aiData.sector}`)
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.company.update({
        where: { id: company.id },
        data: updateData
      })
    }
    console.log('')
  }

  // 4. Enriquecer sócios com Nova Vida API
  if (cnpj) {
    console.log('ETAPA 3: Consultando Nova Vida API (Sócios)')
    console.log('--------------------------------------------------')

    const novaVidaData = await novaVidaTIEnrichment.enrichCompanyContacts(cnpj, company.name)

    if (novaVidaData) {
      const partnersData = novaVidaData.socios.map(socio => ({
        nome: socio.nome,
        qualificacao: socio.qualificacao,
        telefones: socio.telefones || [],
        emails: socio.emails || [],
        linkedin: socio.linkedin || null,
      }))

      await prisma.company.update({
        where: { id: company.id },
        data: {
          partners: JSON.stringify(partnersData),
          companyPhones: novaVidaData.telefones ? JSON.stringify(novaVidaData.telefones) : null,
          companyEmails: novaVidaData.emails ? JSON.stringify(novaVidaData.emails) : null,
          companyWhatsApp: novaVidaData.whatsapp?.[0] || null,
          partnersLastUpdate: new Date(),
        }
      })

      console.log(`Sócios salvos: ${partnersData.length}`)

      const totalPhones = partnersData.reduce((sum, p) => sum + p.telefones.length, 0)
      const totalEmails = partnersData.reduce((sum, p) => sum + p.emails.length, 0)

      console.log(`Total de telefones de sócios: ${totalPhones}`)
      console.log(`Total de emails de sócios: ${totalEmails}`)
      console.log('')
    }
  } else {
    console.log('ETAPA 3: PULADA (sem CNPJ)\n')
  }

  // 5. Detectar eventos e notícias
  console.log('ETAPA 4: Detectando Eventos e Notícias')
  console.log('--------------------------------------------------')

  const eventResult = await eventsDetector.detectEvents(company.name, {})

  if (eventResult.events.length > 0) {
    const relevantEvents = eventResult.events.filter(e =>
      e.relevance === 'high' || e.relevance === 'medium'
    )

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const recentNews = relevantEvents
      .filter(e => e.type === 'news' && e.date >= thirtyDaysAgo)
      .map(e => ({
        title: e.title,
        description: e.description,
        date: e.date.toISOString(),
        source: e.source,
        url: e.sourceUrl,
        sentiment: e.sentiment
      }))

    const upcomingEvents = relevantEvents
      .filter(e => e.type !== 'news' && e.date >= now)
      .map(e => ({
        type: e.type,
        title: e.title,
        description: e.description,
        date: e.date.toISOString(),
        source: e.source,
      }))

    await prisma.company.update({
      where: { id: company.id },
      data: {
        recentNews: recentNews.length > 0 ? JSON.stringify(recentNews) : null,
        upcomingEvents: upcomingEvents.length > 0 ? JSON.stringify(upcomingEvents) : null,
        eventsDetectedAt: new Date(),
      },
    })

    console.log(`Notícias recentes: ${recentNews.length}`)
    console.log(`Eventos futuros: ${upcomingEvents.length}`)

    recentNews.slice(0, 3).forEach((news, idx) => {
      console.log(`\n${idx + 1}. ${news.title}`)
      console.log(`   ${news.description}`)
    })
  } else {
    console.log('Nenhum evento relevante encontrado')
  }

  console.log('\n========================================')
  console.log('ENRIQUECIMENTO CONCLUÍDO!')
  console.log('========================================')
  console.log(`\nAcesse: http://localhost:3000/dashboard/leads/${leadId}`)
}

// Pegar leadId dos argumentos da linha de comando
const leadId = process.argv[2] || '05bbd918-14bf-457a-8b40-ede05db1cad7'

enrichSpecificLead(leadId)
  .catch(console.error)
  .finally(() => prisma.$disconnect())
