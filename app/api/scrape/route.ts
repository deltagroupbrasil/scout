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

    console.log('[Scrape API] 🚀 Iniciando scraping...')

    // SOLUÇÃO: Retornar resposta imediata e processar em background
    // Isso evita o gateway timeout de 60s do Vercel Hobby
    console.log('[Scrape API] ⚡ Processando em background para evitar gateway timeout')

    // Iniciar processamento em background (sem await)
    leadOrchestrator.scrapeAndProcessLeads({
      query,
      maxCompanies
    }).then(result => {
      const duration = Math.floor((Date.now() - startTime) / 1000)
      console.log(`[Scrape API] ✅ Scraping concluído em ${duration}s`)
      console.log(`[Scrape API] Resultado: ${result.savedLeads} leads, ${result.totalJobs} vagas totais`)

      if (result.errors.length > 0) {
        console.log(`[Scrape API] ⚠️  ${result.errors.length} erros:`)
        result.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`))
      }
    }).catch(error => {
      console.error('[Scrape API] ❌ Erro no processamento em background:', error)
    })

    // Retornar resposta imediata
    return NextResponse.json({
      success: true,
      message: `Scraping iniciado com sucesso! Processando ${maxCompanies} empresas em background...`,
      status: 'processing',
      query,
      maxCompanies,
      info: 'O processamento continua em background. Atualize o dashboard para ver os novos leads.'
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
