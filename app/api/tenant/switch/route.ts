import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/tenant/switch
 * Troca o tenant ativo do usuário na sessão
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { tenantId } = body

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId é obrigatório' },
        { status: 400 }
      )
    }

    // Validar que o usuário tem acesso ao tenant solicitado
    const tenantUser = await prisma.tenantUser.findFirst({
      where: {
        userId: session.user.id,
        tenantId,
        isActive: true,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
    })

    if (!tenantUser || !tenantUser.tenant.isActive) {
      return NextResponse.json(
        { error: 'Você não tem acesso a este tenant' },
        { status: 403 }
      )
    }

    // Atualizar lastActiveTenantId no banco de dados
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastActiveTenantId: tenantId },
    })

    console.log(`✅ [Tenant Switch] Usuário ${session.user.email} trocou para tenant ${tenantUser.tenant.name}`)

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenantUser.tenant.id,
        name: tenantUser.tenant.name,
        slug: tenantUser.tenant.slug,
      },
    })
  } catch (error) {
    console.error('❌ [Tenant Switch] Erro:', error)
    return NextResponse.json(
      {
        error: 'Erro ao trocar de tenant',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
