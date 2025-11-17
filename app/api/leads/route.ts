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

    // Filtros avançados
    const revenue = searchParams.get('revenue')
    const employees = searchParams.get('employees')
    const priority = searchParams.get('priority')
    const source = searchParams.get('source')
    const sector = searchParams.get('sector')

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

    // Filtros avançados
    if (!where.company) where.company = {}

    // Filtro de receita
    if (revenue) {
      if (revenue === '0-10M') {
        where.company.revenue = { lte: 10000000 }
      } else if (revenue === '10M-50M') {
        where.company.revenue = { gte: 10000000, lte: 50000000 }
      } else if (revenue === '50M-100M') {
        where.company.revenue = { gte: 50000000, lte: 100000000 }
      } else if (revenue === '100M-500M') {
        where.company.revenue = { gte: 100000000, lte: 500000000 }
      } else if (revenue === '500M+') {
        where.company.revenue = { gte: 500000000 }
      }
    }

    // Filtro de funcionários
    if (employees) {
      if (employees === '0-50') {
        where.company.employees = { lte: 50 }
      } else if (employees === '50-200') {
        where.company.employees = { gte: 50, lte: 200 }
      } else if (employees === '200-500') {
        where.company.employees = { gte: 200, lte: 500 }
      } else if (employees === '500-1000') {
        where.company.employees = { gte: 500, lte: 1000 }
      } else if (employees === '1000+') {
        where.company.employees = { gte: 1000 }
      }
    }

    // Filtro de setor
    if (sector && sector !== 'all') {
      where.company.sector = { contains: sector }
    }

    // Filtro de prioridade
    if (priority) {
      if (priority === 'muito-alta') {
        where.priorityScore = { gte: 80 }
      } else if (priority === 'alta') {
        where.priorityScore = { gte: 60, lt: 80 }
      } else if (priority === 'media') {
        where.priorityScore = { gte: 40, lt: 60 }
      } else if (priority === 'baixa') {
        where.priorityScore = { gte: 20, lt: 40 }
      } else if (priority === 'muito-baixa') {
        where.priorityScore = { lt: 20 }
      }
    }

    // Filtro de fonte
    if (source && source !== 'all') {
      where.jobSource = source
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
