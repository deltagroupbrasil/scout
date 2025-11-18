import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { leadOrchestrator } from '@/lib/services/lead-orchestrator'

/**
 * API para executar scraping manualmente (para testes)
 * POST /api/scrape
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { query, maxCompanies = 20 } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Query é obrigatória' },
        { status: 400 }
      )
    }

    // Executar scraping com limite de empresas
    const result = await leadOrchestrator.scrapeAndProcessLeads({
      query,
      maxCompanies
    })

    return NextResponse.json({
      success: true,
      message: `${result.savedLeads} leads processados com sucesso`,
      count: result.savedLeads,
      totalJobs: result.totalJobs,
      errors: result.errors
    })
  } catch (error) {
    console.error('Erro no scraping:', error)
    return NextResponse.json(
      { error: 'Erro ao executar scraping' },
      { status: 500 }
    )
  }
}
