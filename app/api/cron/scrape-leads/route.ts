import { NextRequest, NextResponse } from 'next/server'
import { leadOrchestrator } from '@/lib/services/lead-orchestrator'
import { prisma } from '@/lib/prisma'

/**
 * Cron Job para scraping automatizado de leads
 *
 * Para Vercel Cron, adicionar em vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/scrape-leads",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 *
 * Para desenvolvimento local, chamar manualmente via GET
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Verificar se é uma chamada autorizada (Vercel Cron ou com token)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production'

  if (authHeader !== `Bearer ${cronSecret}`) {
    // Em desenvolvimento, permitir sem autenticação
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  let scrapeLogId: string | undefined

  try {
    // Criar log de execução
    const scrapeLog = await prisma.scrapeLog.create({
      data: {
        status: 'running',
        query: 'Controller OR CFO OR Controladoria São Paulo',
        jobsFound: 0,
        leadsCreated: 0,
      },
    })

    scrapeLogId = scrapeLog.id

    console.log(' Iniciando cron job de scraping...')

    // Query para buscar vagas - termos específicos de Controladoria e BPO Financeiro
    const query = 'Controller OR CFO OR "Gerente Financeiro" OR "Diretor Financeiro" OR Controladoria São Paulo'

    // Executar scraping com limite de 50 empresas (1x ao dia às 6AM)
    // Timeout configurado para 300s no vercel.json
    const result = await leadOrchestrator.scrapeAndProcessLeads({
      query,
      maxCompanies: 50
    })

    const leadsCreated = result.savedLeads

    const duration = Math.floor((Date.now() - startTime) / 1000)

    // Atualizar log com sucesso
    await prisma.scrapeLog.update({
      where: { id: scrapeLogId },
      data: {
        status: 'success',
        jobsFound: result.totalJobs,
        leadsCreated: result.savedLeads,
        duration,
        ...(result.errors.length > 0 && { errors: JSON.stringify(result.errors) }),
      },
    })

    console.log(` Cron job concluído: ${leadsCreated} leads criados em ${duration}s`)

    return NextResponse.json({
      success: true,
      leadsCreated,
      duration,
      message: `Scraping concluído com sucesso. ${leadsCreated} leads criados.`,
    })
  } catch (error) {
    console.error(' Erro no cron job:', error)

    const duration = Math.floor((Date.now() - startTime) / 1000)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

    // Atualizar log com erro
    if (scrapeLogId) {
      await prisma.scrapeLog.update({
        where: { id: scrapeLogId },
        data: {
          status: 'error',
          duration,
          errors: JSON.stringify({ message: errorMessage }),
        },
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration,
      },
      { status: 500 }
    )
  }
}

// POST também é suportado para chamadas manuais
export async function POST(request: NextRequest) {
  return GET(request)
}
