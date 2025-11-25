import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

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

// GET /api/super-admin/users/[id] - Buscar usuário específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      tenantUsers: {
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          }
        }
      },
      superAdmin: true,
    }
  })

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
  }

  return NextResponse.json(user)
}

// PATCH /api/super-admin/users/[id] - Atualizar usuário
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
    const { name, email, password, isSuperAdmin } = body

    // Verificar se usuário existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { superAdmin: true }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Se mudou email, verificar se já existe
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      })
      if (emailExists) {
        return NextResponse.json(
          { error: "Já existe um usuário com esse email" },
          { status: 400 }
        )
      }
    }

    // Atualizar em transação
    await prisma.$transaction(async (tx) => {
      // Atualizar usuário
      await tx.user.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(password && { password: await bcrypt.hash(password, 10) }),
        },
      })

      // Gerenciar SuperAdmin
      if (isSuperAdmin !== undefined) {
        if (isSuperAdmin && !existingUser.superAdmin) {
          // Promover a SuperAdmin
          await tx.superAdmin.create({
            data: { userId: id }
          })
        } else if (!isSuperAdmin && existingUser.superAdmin) {
          // Remover SuperAdmin
          await tx.superAdmin.delete({
            where: { userId: id }
          })
        }
      }
    })

    // Buscar usuário atualizado
    const updatedUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        tenantUsers: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
              }
            }
          }
        },
        superAdmin: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar usuário" },
      { status: 500 }
    )
  }
}

// DELETE /api/super-admin/users/[id] - Deletar usuário
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
    // Não permitir deletar a si mesmo
    if (id === auth.userId) {
      return NextResponse.json(
        { error: "Não é possível deletar seu próprio usuário" },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao deletar usuário:", error)
    return NextResponse.json(
      { error: "Erro ao deletar usuário" },
      { status: 500 }
    )
  }
}
