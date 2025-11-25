import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

// GET /api/super-admin/tenants/[id] - Buscar tenant específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      tenantUsers: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      },
      _count: {
        select: {
          leads: true,
          searchQueries: true,
        }
      }
    }
  })

  if (!tenant) {
    return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 })
  }

  return NextResponse.json(tenant)
}

// PATCH /api/super-admin/tenants/[id] - Atualizar tenant
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { name, plan, maxUsers, maxSearchQueries, billingEmail, contractEnd, isActive } = body

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(plan && { plan }),
        ...(maxUsers !== undefined && { maxUsers }),
        ...(maxSearchQueries !== undefined && { maxSearchQueries }),
        ...(billingEmail !== undefined && { billingEmail }),
        ...(contractEnd !== undefined && { contractEnd: contractEnd ? new Date(contractEnd) : null }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return NextResponse.json(tenant)
  } catch (error) {
    console.error("Erro ao atualizar tenant:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar tenant" },
      { status: 500 }
    )
  }
}

// DELETE /api/super-admin/tenants/[id] - Deletar tenant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params

  try {
    // Verificar se tenant existe e tem dados
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            leads: true,
            tenantUsers: true,
          }
        }
      }
    })

    if (!tenant) {
      return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 })
    }

    // Avisar se tem dados
    if (tenant._count.leads > 0) {
      return NextResponse.json(
        {
          error: `Não é possível deletar. Tenant possui ${tenant._count.leads} leads.`,
          canDeactivate: true
        },
        { status: 400 }
      )
    }

    await prisma.tenant.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao deletar tenant:", error)
    return NextResponse.json(
      { error: "Erro ao deletar tenant" },
      { status: 500 }
    )
  }
}
