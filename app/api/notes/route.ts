import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/get-tenant-context'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Multi-Tenancy: obter tenant ativo
    const { tenantId } = await getTenantContext()

    const body = await request.json()
    const { leadId, content } = body

    if (!leadId || !content) {
      return NextResponse.json(
        { error: 'leadId e content são obrigatórios' },
        { status: 400 }
      )
    }

    // Multi-Tenancy: CRITICAL - verificar se lead pertence ao tenant
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      )
    }

    const note = await prisma.note.create({
      data: {
        leadId,
        userId: session.user.id,
        tenantId, // Multi-Tenancy: associar nota ao tenant
        content
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(note, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar nota:', error)
    return NextResponse.json(
      { error: 'Erro ao criar nota' },
      { status: 500 }
    )
  }
}
