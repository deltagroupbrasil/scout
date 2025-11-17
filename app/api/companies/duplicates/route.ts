import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { companyDeduplicator } from '@/lib/services/company-deduplicator'

/**
 * GET /api/companies/duplicates
 *
 * Encontra todas as duplicatas no banco
 * Query params:
 * - threshold: Score mínimo (default: 85)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const threshold = parseInt(searchParams.get('threshold') || '85')

    const duplicates = await companyDeduplicator.findAllDuplicates(threshold)

    // Converter Map para objeto serializável
    const duplicatesArray = Array.from(duplicates.entries()).map(([companyId, dups]) => ({
      companyId,
      duplicates: dups,
    }))

    return NextResponse.json({
      total: duplicatesArray.length,
      groups: duplicatesArray,
    })
  } catch (error) {
    console.error('Erro ao buscar duplicatas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar duplicatas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/companies/duplicates/merge
 *
 * Mescla empresas duplicadas
 * Body:
 * {
 *   primaryId: string,
 *   duplicateIds: string[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { primaryId, duplicateIds } = await request.json()

    if (!primaryId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      return NextResponse.json(
        { error: 'primaryId e duplicateIds são obrigatórios' },
        { status: 400 }
      )
    }

    const result = await companyDeduplicator.mergeCompanies(primaryId, duplicateIds)

    return NextResponse.json({
      success: true,
      message: `${duplicateIds.length} empresa(s) mesclada(s)`,
      result,
    })
  } catch (error) {
    console.error('Erro ao mesclar empresas:', error)
    return NextResponse.json(
      { error: 'Erro ao mesclar empresas' },
      { status: 500 }
    )
  }
}
