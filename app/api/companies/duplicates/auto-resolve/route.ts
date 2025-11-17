import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { companyDeduplicator } from '@/lib/services/company-deduplicator'

/**
 * POST /api/companies/duplicates/auto-resolve
 *
 * Resolve automaticamente duplicatas com alta confiança
 * Body (opcional):
 * {
 *   minConfidence: 'high' | 'medium'  // default: 'high'
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const minConfidence = body.minConfidence || 'high'

    console.log(` Iniciando resolução automática de duplicatas (confiança mínima: ${minConfidence})...`)

    const results = await companyDeduplicator.autoResolveDuplicates(minConfidence)

    const totalMerged = results.reduce((sum, r) => sum + r.mergedIds.length, 0)
    const totalLeads = results.reduce((sum, r) => sum + r.leadsTransferred, 0)

    console.log(` Resolução completa: ${totalMerged} empresas mescladas, ${totalLeads} leads transferidos`)

    return NextResponse.json({
      success: true,
      summary: {
        companiesMerged: totalMerged,
        leadsTransferred: totalLeads,
        groups: results.length,
      },
      details: results,
    })
  } catch (error) {
    console.error('Erro ao resolver duplicatas automaticamente:', error)
    return NextResponse.json(
      { error: 'Erro ao resolver duplicatas' },
      { status: 500 }
    )
  }
}
