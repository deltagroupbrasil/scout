import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LeadStatus } from '@prisma/client'

export interface BulkActionRequest {
  action: 'updateStatus' | 'assign' | 'delete' | 'export'
  leadIds: string[]
  data?: {
    status?: LeadStatus
    assignedToId?: string
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body: BulkActionRequest = await request.json()
    const { action, leadIds, data } = body

    // Validação básica
    if (!action || !leadIds || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'Ação e IDs são obrigatórios' },
        { status: 400 }
      )
    }

    // Limite de 100 leads por operação para evitar timeouts
    if (leadIds.length > 100) {
      return NextResponse.json(
        { error: 'Máximo de 100 leads por operação' },
        { status: 400 }
      )
    }

    let result: any = {}

    switch (action) {
      case 'updateStatus': {
        if (!data?.status) {
          return NextResponse.json(
            { error: 'Status é obrigatório' },
            { status: 400 }
          )
        }

        const updated = await prisma.lead.updateMany({
          where: {
            id: { in: leadIds }
          },
          data: {
            status: data.status,
            isNew: false, // Remove flag "novo" ao atualizar status
            updatedAt: new Date()
          }
        })

        result = {
          action: 'updateStatus',
          status: data.status,
          count: updated.count,
          leadIds
        }
        break
      }

      case 'assign': {
        if (!data?.assignedToId) {
          return NextResponse.json(
            { error: 'ID do usuário é obrigatório' },
            { status: 400 }
          )
        }

        // Verificar se o usuário existe
        const userExists = await prisma.user.findUnique({
          where: { id: data.assignedToId }
        })

        if (!userExists) {
          return NextResponse.json(
            { error: 'Usuário não encontrado' },
            { status: 404 }
          )
        }

        const updated = await prisma.lead.updateMany({
          where: {
            id: { in: leadIds }
          },
          data: {
            assignedToId: data.assignedToId,
            updatedAt: new Date()
          }
        })

        result = {
          action: 'assign',
          assignedToId: data.assignedToId,
          assignedToName: userExists.name,
          count: updated.count,
          leadIds
        }
        break
      }

      case 'delete': {
        // Soft delete: marca como DISCARDED ao invés de deletar
        const updated = await prisma.lead.updateMany({
          where: {
            id: { in: leadIds }
          },
          data: {
            status: LeadStatus.DISCARDED,
            updatedAt: new Date()
          }
        })

        result = {
          action: 'delete',
          count: updated.count,
          leadIds
        }
        break
      }

      case 'export': {
        // Buscar leads selecionados com dados completos
        const leads = await prisma.lead.findMany({
          where: {
            id: { in: leadIds }
          },
          include: {
            company: true,
            assignedTo: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: [
            { priorityScore: 'desc' },
            { createdAt: 'desc' }
          ]
        })

        // Formatar dados para exportação
        const exportData = leads.map(lead => ({
          id: lead.id,
          empresa: lead.company.name,
          cnpj: lead.company.cnpj || 'N/A',
          website: lead.company.website || 'N/A',
          setor: lead.company.sector || 'N/A',
          receita: lead.company.revenue
            ? `R$ ${(lead.company.revenue / 1000000).toFixed(1)}M`
            : 'N/A',
          funcionarios: lead.company.employees || 'N/A',
          cargo: lead.jobTitle,
          fonte: lead.jobSource,
          status: lead.status,
          prioridade: lead.priorityScore,
          candidatos: lead.candidateCount || 0,
          criadoEm: lead.createdAt.toISOString(),
          atribuidoA: lead.assignedTo?.name || 'Não atribuído',
          linkedin: lead.company.linkedinUrl || 'N/A'
        }))

        result = {
          action: 'export',
          count: exportData.length,
          data: exportData
        }
        break
      }

      default:
        return NextResponse.json(
          { error: 'Ação inválida' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      result
    })
  } catch (error) {
    console.error('Erro ao executar ação em massa:', error)
    return NextResponse.json(
      { error: 'Erro ao executar ação em massa' },
      { status: 500 }
    )
  }
}
