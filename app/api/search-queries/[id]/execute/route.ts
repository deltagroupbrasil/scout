import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { leadOrchestrator } from '@/lib/services/lead-orchestrator'

export const maxDuration = 300 // Vercel Fluid Compute: 5 minutos

/**
 * POST /api/search-queries/[id]/execute
 * Executa uma query salva
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()

  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar query
    const query = await prisma.searchQuery.findUnique({
      where: { id: params.id },
    })

    if (!query) {
      return NextResponse.json({ error: 'Query não encontrada' }, { status: 404 })
    }

    if (!query.isActive) {
      return NextResponse.json({ error: 'Query desativada' }, { status: 400 })
    }

    console.log(`🔍 Executando query: ${query.name}`)
    console.log(`   Cargo: ${query.jobTitle}`)
    console.log(`   Localização: ${query.location}`)
    console.log(`   Limite: ${query.maxCompanies} empresas`)

    // Criar log de execução
    const scrapeLog = await prisma.scrapeLog.create({
      data: {
        status: 'running',
        query: `${query.jobTitle} - ${query.location}`,
        jobsFound: 0,
        leadsCreated: 0,
      },
    })

    // Executar scraping
    const result = await leadOrchestrator.scrapeAndProcessLeads({
      query: query.jobTitle,
      location: query.location,
      maxCompanies: query.maxCompanies,
    })

    const duration = Math.floor((Date.now() - startTime) / 1000)

    // Atualizar log
    await prisma.scrapeLog.update({
      where: { id: scrapeLog.id },
      data: {
        status: 'success',
        jobsFound: result.totalJobs,
        leadsCreated: result.savedLeads,
        duration,
        ...(result.errors.length > 0 && { errors: JSON.stringify(result.errors) }),
      },
    })

    // Atualizar query (última execução e contador)
    await prisma.searchQuery.update({
      where: { id: params.id },
      data: {
        lastUsedAt: new Date(),
        usageCount: { increment: 1 },
      },
    })

    console.log(`✅ Query executada: ${result.savedLeads} leads criados em ${duration}s`)

    return NextResponse.json({
      success: true,
      leadsCreated: result.savedLeads,
      totalJobs: result.totalJobs,
      companiesProcessed: result.companiesProcessed,
      duration,
      errors: result.errors,
    })
  } catch (error) {
    console.error('❌ Erro ao executar query:', error)
    const duration = Math.floor((Date.now() - startTime) / 1000)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        duration,
      },
      { status: 500 }
    )
  }
}
