import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TenantRole } from "@prisma/client"

// Verificar se é SuperAdmin
async function requireSuperAdmin() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { error: "Não autenticado", status: 401 }
  }

  const superAdmin = await prisma.superAdmin.findUnique({
    where: { userId: session.user.id }
  })

  if (!superAdmin) {
    return { error: "Acesso negado. Apenas Super Admins.", status: 403 }
  }

  return { userId: session.user.id }
}

// PATCH /api/super-admin/users/[id]/tenants/[tenantId] - Atualizar role no tenant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tenantId: string }> }
) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id: userId, tenantId } = await params

  try {
    const body = await request.json()
    const { role, isActive } = body

    // Verificar se associação existe
    const tenantUser = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        }
      }
    })

    if (!tenantUser) {
      return NextResponse.json(
        { error: "Associação não encontrada" },
        { status: 404 }
      )
    }

    // Atualizar
    const updated = await prisma.tenantUser.update({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        }
      },
      data: {
        ...(role && { role: role as TenantRole }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Erro ao atualizar associação:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar associação" },
      { status: 500 }
    )
  }
}

// DELETE /api/super-admin/users/[id]/tenants/[tenantId] - Remover associação
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tenantId: string }> }
) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id: userId, tenantId } = await params

  try {
    // Verificar se associação existe
    const tenantUser = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        }
      }
    })

    if (!tenantUser) {
      return NextResponse.json(
        { error: "Associação não encontrada" },
        { status: 404 }
      )
    }

    // Deletar associação
    await prisma.tenantUser.delete({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        }
      }
    })

    // Se era o lastActiveTenantId, limpar ou definir outro
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenantUsers: {
          take: 1,
          select: { tenantId: true }
        }
      }
    })

    if (user?.lastActiveTenantId === tenantId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastActiveTenantId: user.tenantUsers[0]?.tenantId || null
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao remover associação:", error)
    return NextResponse.json(
      { error: "Erro ao remover associação" },
      { status: 500 }
    )
  }
}
