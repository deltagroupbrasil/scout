import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/usage/nova-vida-ti
 *
 * Retorna estatísticas de uso da API Nova Vida TI
 * Query params:
 * - period: '7d' | '30d' | '90d' | 'all' (default: '30d')
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    // Calcular data inicial
    const since = new Date()
    if (period === '7d') since.setDate(since.getDate() - 7)
    else if (period === '30d') since.setDate(since.getDate() - 30)
    else if (period === '90d') since.setDate(since.getDate() - 90)
    else since.setFullYear(2000)  // 'all'

    // Buscar usos
    const usages = await prisma.novaVidaTIUsage.findMany({
      where: {
        createdAt: { gte: since }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calcular estatísticas
    const totalQueries = usages.length
    const totalCost = usages.reduce((sum, u) => sum + u.cost, 0)
    const uniqueCompanies = new Set(usages.map(u => u.cnpj)).size

    // Agrupar por dia
    const byDay = usages.reduce((acc, usage) => {
      const day = usage.createdAt.toISOString().split('T')[0]
      if (!acc[day]) {
        acc[day] = { queries: 0, cost: 0 }
      }
      acc[day].queries++
      acc[day].cost += usage.cost
      return acc
    }, {} as Record<string, { queries: number; cost: number }>)

    // Top 10 empresas mais consultadas
    const companyCounts = usages.reduce((acc, usage) => {
      const key = usage.companyName
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const topCompanies = Object.entries(companyCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    return NextResponse.json({
      period,
      since: since.toISOString(),
      summary: {
        totalQueries,
        totalCost: parseFloat(totalCost.toFixed(2)),
        uniqueCompanies,
        avgCostPerQuery: parseFloat((totalCost / Math.max(totalQueries, 1)).toFixed(4)),
      },
      byDay: Object.entries(byDay).map(([date, stats]) => ({
        date,
        queries: stats.queries,
        cost: parseFloat(stats.cost.toFixed(2)),
      })),
      topCompanies,
      recentUsages: usages.slice(0, 20).map(u => ({
        id: u.id,
        companyName: u.companyName,
        cnpj: u.cnpj,
        cost: u.cost,
        createdAt: u.createdAt,
      })),
    })
  } catch (error) {
    console.error('Erro ao buscar usage Nova Vida TI:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}
