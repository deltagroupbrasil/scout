import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireMinimumRole } from '@/lib/get-tenant-context'
import { checkSearchQueryQuota, hasFeature } from '@/lib/tenant-features'

/**
 * GET /api/search-queries
 * Lista todas as queries de busca (apenas ativas por padrão)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Multi-Tenancy: obter tenant ativo
    const { tenantId } = await getTenantContext()

    // Query params
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Buscar queries do tenant
    const queries = await prisma.tenantSearchQuery.findMany({
      where: {
        tenantId, // Multi-Tenancy: CRITICAL
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { lastUsedAt: 'desc' }, // Mais usadas recentemente primeiro
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({ queries })
  } catch (error) {
    console.error('Erro ao buscar queries:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar queries' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/search-queries
 * Cria uma nova query de busca
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Multi-Tenancy: validar acesso e permissão
    const ctx = await getTenantContext()
    await requireMinimumRole('MANAGER', ctx) // Apenas MANAGER+ pode criar queries

    // Verificar se tenant tem a feature de busca habilitada
    const hasSearchFeature = await hasFeature(ctx.tenantId, 'search')
    if (!hasSearchFeature && !ctx.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Recurso não disponível. A busca de vagas não está habilitada para sua organização.' },
        { status: 403 }
      )
    }

    // Verificar quota de queries
    const quotaCheck = await checkSearchQueryQuota(ctx.tenantId)
    if (!quotaCheck.ok) {
      return NextResponse.json(
        { error: quotaCheck.error },
        { status: 403 }
      )
    }

    // Validar dados
    const body = await request.json()
    const { name, jobTitle, location, maxCompanies } = body

    if (!name || !jobTitle || !location) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, jobTitle, location' },
        { status: 400 }
      )
    }

    // Criar query associada ao tenant
    const query = await prisma.tenantSearchQuery.create({
      data: {
        tenantId: ctx.tenantId, // Multi-Tenancy: associar ao tenant
        name,
        jobTitle,
        location,
        maxCompanies: maxCompanies || 20,
        isLocked: false, // Queries criadas por usuários são editáveis
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ query }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar query:', error)
    return NextResponse.json(
      { error: 'Erro ao criar query' },
      { status: 500 }
    )
  }
}
