import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/feedback
 * Cria um novo feedback sobre um contato
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      leadId,
      contactName,
      contactRole,
      contactEmail,
      contactPhone,
      contactSource,
      isCorrect,
      comment
    } = body

    // Validações
    if (!leadId || !contactName || !contactRole || isCorrect === undefined) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: leadId, contactName, contactRole, isCorrect' },
        { status: 400 }
      )
    }

    // Verificar se o lead existe
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se já existe feedback para este contato
    const existingFeedback = await prisma.contactFeedback.findFirst({
      where: {
        leadId,
        contactName,
        userId: session.user.id
      }
    })

    if (existingFeedback) {
      // Atualizar feedback existente
      const updatedFeedback = await prisma.contactFeedback.update({
        where: { id: existingFeedback.id },
        data: {
          isCorrect,
          comment: comment || null,
          contactEmail: contactEmail || null,
          contactPhone: contactPhone || null,
          contactSource: contactSource || null,
        }
      })

      return NextResponse.json({
        success: true,
        feedback: updatedFeedback,
        message: 'Feedback atualizado com sucesso'
      })
    }

    // Criar novo feedback
    const feedback = await prisma.contactFeedback.create({
      data: {
        leadId,
        userId: session.user.id,
        contactName,
        contactRole,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        contactSource: contactSource || null,
        isCorrect,
        comment: comment || null,
      }
    })

    return NextResponse.json({
      success: true,
      feedback,
      message: 'Feedback registrado com sucesso'
    })

  } catch (error) {
    console.error('Erro ao criar feedback:', error)
    return NextResponse.json(
      { error: 'Erro ao processar feedback' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/feedback?leadId=xxx
 * Busca feedbacks de um lead específico ou estatísticas gerais
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const getStats = searchParams.get('stats') === 'true'

    // Retornar estatísticas gerais
    if (getStats) {
      const stats = await getContactFeedbackStats()
      return NextResponse.json(stats)
    }

    // Retornar feedbacks de um lead específico
    if (leadId) {
      const feedbacks = await prisma.contactFeedback.findMany({
        where: { leadId },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return NextResponse.json({ feedbacks })
    }

    // Retornar todos os feedbacks (paginado)
    const feedbacks = await prisma.contactFeedback.findMany({
      take: 50,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        lead: {
          select: {
            id: true,
            jobTitle: true,
            company: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({ feedbacks })

  } catch (error) {
    console.error('Erro ao buscar feedbacks:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar feedbacks' },
      { status: 500 }
    )
  }
}

/**
 * Calcula estatísticas de qualidade dos contatos por fonte
 */
async function getContactFeedbackStats() {
  const allFeedbacks = await prisma.contactFeedback.findMany({
    select: {
      contactSource: true,
      isCorrect: true
    }
  })

  // Agrupar por fonte
  const statsBySource: Record<string, {
    total: number
    correct: number
    incorrect: number
    accuracy: number
  }> = {}

  allFeedbacks.forEach(feedback => {
    const source = feedback.contactSource || 'unknown'

    if (!statsBySource[source]) {
      statsBySource[source] = {
        total: 0,
        correct: 0,
        incorrect: 0,
        accuracy: 0
      }
    }

    statsBySource[source].total++

    if (feedback.isCorrect) {
      statsBySource[source].correct++
    } else {
      statsBySource[source].incorrect++
    }
  })

  // Calcular accuracy
  Object.values(statsBySource).forEach(stats => {
    stats.accuracy = stats.total > 0
      ? (stats.correct / stats.total) * 100
      : 0
  })

  // Estatísticas gerais
  const totalFeedbacks = allFeedbacks.length
  const totalCorrect = allFeedbacks.filter(f => f.isCorrect).length
  const totalIncorrect = allFeedbacks.filter(f => !f.isCorrect).length
  const overallAccuracy = totalFeedbacks > 0
    ? (totalCorrect / totalFeedbacks) * 100
    : 0

  return {
    overall: {
      total: totalFeedbacks,
      correct: totalCorrect,
      incorrect: totalIncorrect,
      accuracy: overallAccuracy
    },
    bySource: statsBySource
  }
}
