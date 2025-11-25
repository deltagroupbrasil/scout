import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/get-tenant-context'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Multi-Tenancy: obter tenant ativo
    const { tenantId } = await getTenantContext()

    const { id } = await params

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        tenantId, // Multi-Tenancy: CRITICAL - validar acesso ao tenant
      },
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

    // Multi-Tenancy: obter tenant ativo
    const { tenantId } = await getTenantContext()

    const { id } = await params
    const body = await request.json()
    const { status, isNew } = body

    // Multi-Tenancy: CRITICAL - verificar se lead pertence ao tenant
    const existingLead = await prisma.lead.findFirst({
      where: { id, tenantId },
    })

    if (!existingLead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    // Quando o status muda de NEW para qualquer outro, marca isNew como false
    // Mas se voltar para NEW, NÃO muda o isNew (deixa como estava)
    const updateData: any = {
      ...(status && { status }),
      ...(isNew !== undefined && { isNew })
    }

    // Se o status está sendo atualizado para CONTACTED, QUALIFIED ou DISCARDED,
    // automaticamente marca isNew como false
    // IMPORTANTE: Se voltar para NEW, não altera isNew
    if (status && status !== 'NEW' && isNew === undefined) {
      updateData.isNew = false
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
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
