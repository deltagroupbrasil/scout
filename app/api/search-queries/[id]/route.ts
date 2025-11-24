import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/search-queries/[id]
 * Atualiza uma query de busca
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Await params (Next.js 15+ requirement)
    const { id } = await params

    const body = await request.json()
    const { name, jobTitle, location, maxCompanies, isActive } = body

    // Verificar se query existe
    const existingQuery = await prisma.searchQuery.findUnique({
      where: { id },
    })

    if (!existingQuery) {
      return NextResponse.json({ error: 'Query não encontrada' }, { status: 404 })
    }

    // Atualizar query
    const query = await prisma.searchQuery.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(jobTitle && { jobTitle }),
        ...(location && { location }),
        ...(maxCompanies !== undefined && { maxCompanies }),
        ...(isActive !== undefined && { isActive }),
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

    return NextResponse.json({ query })
  } catch (error) {
    console.error('Erro ao atualizar query:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar query' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/search-queries/[id]
 * Deleta uma query de busca
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Await params (Next.js 15+ requirement)
    const { id } = await params

    // Verificar se query existe
    const existingQuery = await prisma.searchQuery.findUnique({
      where: { id },
    })

    if (!existingQuery) {
      return NextResponse.json({ error: 'Query não encontrada' }, { status: 404 })
    }

    // Deletar query
    await prisma.searchQuery.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar query:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar query' },
      { status: 500 }
    )
  }
}
