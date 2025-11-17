import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { enrichmentCache } from '@/lib/services/enrichment-cache'

/**
 * GET /api/cache/enrichment
 *
 * Retorna estatísticas do cache de enriquecimento
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const stats = await enrichmentCache.getStats()
    const hitRate = await enrichmentCache.calculateHitRate(7)

    return NextResponse.json({
      ...stats,
      hitRate,
      hitRatePeriod: '7 dias',
    })
  } catch (error) {
    console.error('Erro ao obter estatísticas do cache:', error)
    return NextResponse.json(
      { error: 'Erro ao obter estatísticas' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/cache/enrichment
 *
 * Limpa cache expirado ou invalida CNPJ específico
 * Query params:
 * - cnpj: CNPJ para invalidar (opcional)
 * - cleanup: true para limpar expirados (opcional)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const cnpj = searchParams.get('cnpj')
    const cleanup = searchParams.get('cleanup') === 'true'

    if (cnpj) {
      // Invalidar CNPJ específico
      await enrichmentCache.invalidate(cnpj)
      return NextResponse.json({
        success: true,
        message: `Cache invalidado para CNPJ: ${cnpj}`,
      })
    }

    if (cleanup) {
      // Limpar expirados
      const count = await enrichmentCache.cleanupExpired()
      return NextResponse.json({
        success: true,
        message: `${count} entrada(s) expirada(s) removida(s)`,
        count,
      })
    }

    return NextResponse.json(
      { error: 'Especifique ?cnpj=... ou ?cleanup=true' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erro ao limpar cache:', error)
    return NextResponse.json(
      { error: 'Erro ao limpar cache' },
      { status: 500 }
    )
  }
}
