import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LeadStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') as LeadStatus | 'ALL' | null
    const search = searchParams.get('search')
    const dateRange = searchParams.get('dateRange') // '7d', '30d', 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')

    // Construir filtros
    const where: any = {}

    // Filtro de status
    if (status && status !== 'ALL') {
      where.status = status
    }

    // Filtro de busca por nome da empresa
    // SQLite não suporta mode: 'insensitive', usa LIKE case-insensitive por padrão
    if (search) {
      where.company = {
        name: {
          contains: search
        }
      }
    }

    // Filtro de data
    if (dateRange && dateRange !== 'all') {
      const now = new Date()
      const daysAgo = dateRange === '7d' ? 7 : 30
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

      where.createdAt = {
        gte: startDate
      }
    }

    // Buscar leads com paginação
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          company: true,
          _count: {
            select: { notes: true }
          }
        },
        orderBy: [
          { priorityScore: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lead.count({ where })
    ])

    return NextResponse.json({
      data: leads,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    })
  } catch (error) {
    console.error('Erro ao buscar leads:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar leads' },
      { status: 500 }
    )
  }
}
