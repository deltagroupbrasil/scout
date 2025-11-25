import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getTenantContext, requireMinimumRole } from "@/lib/get-tenant-context"
import { hasFeature } from "@/lib/tenant-features"

/**
 * PATCH /api/tenant/users/[id]
 * Atualiza role de um usuário no tenant (apenas ADMIN)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext()
    await requireMinimumRole('ADMIN', ctx)

    // Verificar se tenant tem a feature de gestão de usuários
    const hasUserManagement = await hasFeature(ctx.tenantId, 'user_management')
    if (!hasUserManagement && !ctx.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Recurso não disponível.' },
        { status: 403 }
      )
    }

    const { id: userId } = await params
    const body = await request.json()
    const { role, isActive } = body

    // Não pode alterar a si mesmo
    if (userId === ctx.userId) {
      return NextResponse.json(
        { error: "Você não pode alterar suas próprias permissões" },
        { status: 400 }
      )
    }

    // Validar role
    if (role && !ctx.isSuperAdmin && role === 'ADMIN') {
      return NextResponse.json(
        { error: "Apenas Super Admins podem promover usuários a ADMIN" },
        { status: 403 }
      )
    }

    // Verificar se usuário está no tenant
    const tenantUser = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId: ctx.tenantId,
          userId,
        }
      }
    })

    if (!tenantUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado nesta organização" },
        { status: 404 }
      )
    }

    // Atualizar
    const updated = await prisma.tenantUser.update({
      where: {
        tenantId_userId: {
          tenantId: ctx.tenantId,
          userId,
        }
      },
      data: {
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json({
      user: {
        id: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        role: updated.role,
        isActive: updated.isActive,
      }
    })
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar usuário" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/tenant/users/[id]
 * Remove usuário do tenant (apenas ADMIN)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getTenantContext()
    await requireMinimumRole('ADMIN', ctx)

    const { id: userId } = await params

    // Não pode remover a si mesmo
    if (userId === ctx.userId) {
      return NextResponse.json(
        { error: "Você não pode se remover da organização" },
        { status: 400 }
      )
    }

    // Verificar se usuário está no tenant
    const tenantUser = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId: ctx.tenantId,
          userId,
        }
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    })

    if (!tenantUser) {
      return NextResponse.json(
        { error: "Usuário não encontrado nesta organização" },
        { status: 404 }
      )
    }

    // Não pode remover outro ADMIN (a menos que seja SuperAdmin)
    if (tenantUser.role === 'ADMIN' && !ctx.isSuperAdmin) {
      return NextResponse.json(
        { error: "Você não pode remover outro administrador" },
        { status: 403 }
      )
    }

    // Remover do tenant
    await prisma.tenantUser.delete({
      where: {
        tenantId_userId: {
          tenantId: ctx.tenantId,
          userId,
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `${tenantUser.user.name} foi removido da organização`
    })
  } catch (error) {
    console.error("Erro ao remover usuário:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao remover usuário" },
      { status: 500 }
    )
  }
}
