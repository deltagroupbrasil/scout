import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { leadId, content } = body

    if (!leadId || !content) {
      return NextResponse.json(
        { error: 'leadId e content são obrigatórios' },
        { status: 400 }
      )
    }

    const note = await prisma.note.create({
      data: {
        leadId,
        userId: session.user.id,
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
