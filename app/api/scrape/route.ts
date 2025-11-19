import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { leadOrchestrator } from '@/lib/services/lead-orchestrator'

// Vercel Fluid Compute: habilita timeout de 300s (5 minutos) no plano Hobby
export const maxDuration = 300

/**
 * API para executar scraping manualmente (para testes)
 * POST /api/scrape
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    console.log('[Scrape API] Verificando autenticação...')
    const session = await getServerSession(authOptions)

    if (!session) {
      console.log('[Scrape API] ❌ Não autorizado')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    console.log(`[Scrape API] ✅ Usuário autenticado: ${session.user?.email}`)

    const body = await request.json()
    const { query, maxCompanies = 20 } = body

    console.log(`[Scrape API] Query: "${query}", MaxCompanies: ${maxCompanies}`)

    if (!query) {
      return NextResponse.json(
        { error: 'Query é obrigatória' },
        { status: 400 }
      )
    }

    console.log('[Scrape API] 🚀 Iniciando scraping SÍNCRONO...')
    console.log(`[Scrape API] ⏱  Timeout configurado: ${maxDuration}s (Vercel Fluid Compute)`)

    // CRÍTICO: Em serverless, processamento DEVE ser síncrono (com await)
    // Background processing (sem await) é ABORTADO quando a response é retornada
    const result = await leadOrchestrator.scrapeAndProcessLeads({
      query,
      maxCompanies
    })

    const duration = Math.floor((Date.now() - startTime) / 1000)
    console.log(`[Scrape API] ✅ Scraping concluído em ${duration}s`)
    console.log(`[Scrape API] Resultado: ${result.savedLeads} leads salvos, ${result.totalJobs} vagas totais`)

    if (result.errors.length > 0) {
      console.log(`[Scrape API] ⚠️  ${result.errors.length} erros:`)
      result.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`))
    }

    // Retornar resultado final
    return NextResponse.json({
      success: true,
      message: `Scraping concluído! ${result.savedLeads} leads salvos de ${result.totalJobs} vagas encontradas.`,
      status: 'completed',
      savedLeads: result.savedLeads,
      totalJobs: result.totalJobs,
      duration,
      errors: result.errors
    })
  } catch (error) {
    const duration = Math.floor((Date.now() - startTime) / 1000)
    console.error('[Scrape API] ❌ Erro no scraping:', error)
    console.error('[Scrape API] Stack:', error instanceof Error ? error.stack : 'N/A')

    return NextResponse.json(
      {
        error: 'Erro ao executar scraping',
        details: error instanceof Error ? error.message : String(error),
        duration
      },
      { status: 500 }
    )
  }
}
