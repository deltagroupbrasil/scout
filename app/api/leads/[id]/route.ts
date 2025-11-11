import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        company: true,
        notes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error('Erro ao buscar lead:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar lead' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, isNew } = body

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(isNew !== undefined && { isNew })
      },
      include: {
        company: true
      }
    })

    return NextResponse.json(lead)
  } catch (error) {
    console.error('Erro ao atualizar lead:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar lead' },
      { status: 500 }
    )
  }
}
