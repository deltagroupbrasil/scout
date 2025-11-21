// API Route: Export Leads to CSV
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Authentication check
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const dateRange = searchParams.get('dateRange')
    const search = searchParams.get('search')
    const revenue = searchParams.get('revenue')
    const employees = searchParams.get('employees')
    const priority = searchParams.get('priority')
    const source = searchParams.get('source')
    const sector = searchParams.get('sector')

    // Build where clause
    const where: any = {}

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

    if (dateRange && dateRange !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (dateRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0)
      }

      where.createdAt = {
        gte: startDate,
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

    // Fetch leads
    const leads = await prisma.lead.findMany({
      where,
      include: {
        company: true,
      },
      orderBy: [
        { priorityScore: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    // Generate CSV
    const csvRows: string[] = []

    // Header
    csvRows.push([
      'Empresa',
      'CNPJ',
      'Faturamento',
      'Funcionários',
      'Setor',
      'Vaga',
      'Data Publicação',
      'Status',
      'Score Prioridade',
      'Candidatos',
      'URL Vaga',
      'Website',
      'LinkedIn',
      'Contatos Sugeridos',
      'Gatilhos',
      'Data Captação',
    ].join(','))

    // Data rows
    for (const lead of leads) {
      const suggestedContacts = lead.suggestedContacts
        ? JSON.parse(typeof lead.suggestedContacts === 'string' ? lead.suggestedContacts : JSON.stringify(lead.suggestedContacts))
            .map((c: any) => `${c.name} (${c.role})`)
            .join('; ')
        : ''

      const triggers = lead.triggers
        ? JSON.parse(typeof lead.triggers === 'string' ? lead.triggers : JSON.stringify(lead.triggers)).join('; ')
        : ''

      csvRows.push([
        escapeCSV(lead.company.name),
        escapeCSV(lead.company.cnpj || ''),
        lead.company.revenue
          ? `R$ ${(lead.company.revenue / 1_000_000).toFixed(1)}M`
          : '',
        lead.company.employees?.toString() || '',
        escapeCSV(lead.company.sector || ''),
        escapeCSV(lead.jobTitle),
        formatDate(lead.jobPostedDate),
        lead.status,
        lead.priorityScore.toString(),
        lead.candidateCount?.toString() || '',
        escapeCSV(lead.jobUrl),
        escapeCSV(lead.company.website || ''),
        escapeCSV(lead.company.linkedinUrl || ''),
        escapeCSV(suggestedContacts),
        escapeCSV(triggers),
        formatDate(lead.createdAt),
      ].join(','))
    }

    const csvContent = csvRows.join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="leapscout-leads-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Erro ao exportar CSV:', error)
    return NextResponse.json(
      { error: 'Erro ao exportar leads' },
      { status: 500 }
    )
  }
}

/**
 * Escapa valores para CSV (lida com vírgulas e aspas)
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Formata data para DD/MM/YYYY
 */
function formatDate(date: Date): string {
  const d = new Date(date)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}
