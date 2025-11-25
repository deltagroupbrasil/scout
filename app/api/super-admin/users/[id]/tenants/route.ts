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

// POST /api/super-admin/users/[id]/tenants - Associar usuário a tenant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id: userId } = await params

  try {
    const body = await request.json()
    const { tenantId, role } = body

    // Validações
    if (!tenantId) {
      return NextResponse.json(
        { error: "tenantId é obrigatório" },
        { status: 400 }
      )
    }

    // Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Verificar se tenant existe
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    })

    if (!tenant) {
      return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 })
    }

    // Verificar se associação já existe
    const existingAssociation = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        }
      }
    })

    if (existingAssociation) {
      return NextResponse.json(
        { error: "Usuário já está associado a este tenant" },
        { status: 400 }
      )
    }

    // Criar associação
    const tenantUser = await prisma.tenantUser.create({
      data: {
        userId,
        tenantId,
        role: (role as TenantRole) || 'USER',
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

    // Atualizar lastActiveTenantId se for o primeiro tenant
    const userTenants = await prisma.tenantUser.count({
      where: { userId }
    })

    if (userTenants === 1) {
      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveTenantId: tenantId }
      })
    }

    return NextResponse.json(tenantUser, { status: 201 })
  } catch (error) {
    console.error("Erro ao associar usuário ao tenant:", error)
    return NextResponse.json(
      { error: "Erro ao associar usuário ao tenant" },
      { status: 500 }
    )
  }
}
