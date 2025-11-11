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

    // Build where clause
    const where: any = {}

    if (status && status !== 'ALL') {
      where.status = status
    }

    if (search) {
      where.company = {
        name: {
          contains: search,
          mode: 'insensitive',
        },
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
        ? JSON.parse(lead.suggestedContacts)
            .map((c: any) => `${c.name} (${c.role})`)
            .join('; ')
        : ''

      const triggers = lead.triggers
        ? JSON.parse(lead.triggers).join('; ')
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
