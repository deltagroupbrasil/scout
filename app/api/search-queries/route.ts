import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    // Query params
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Buscar queries
    const queries = await prisma.searchQuery.findMany({
      where: {
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

    // Validar dados
    const body = await request.json()
    const { name, jobTitle, location, maxCompanies } = body

    if (!name || !jobTitle || !location) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, jobTitle, location' },
        { status: 400 }
      )
    }

    // Criar query
    const query = await prisma.searchQuery.create({
      data: {
        name,
        jobTitle,
        location,
        maxCompanies: maxCompanies || 20,
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
