import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

/**
 * GET /api/user/profile
 * Retorna dados do usuário logado
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        tenantUsers: {
          where: { isActive: true },
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

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        isSuperAdmin: !!user.superAdmin,
        tenants: user.tenantUsers.map(tu => ({
          id: tu.tenant.id,
          name: tu.tenant.name,
          slug: tu.tenant.slug,
          role: tu.role,
        }))
      }
    })
  } catch (error) {
    console.error("Erro ao buscar perfil:", error)
    return NextResponse.json(
      { error: "Erro ao buscar perfil" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/user/profile
 * Atualiza dados do usuário logado (nome, senha)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
    }

    const body = await request.json()
    const { name, currentPassword, newPassword } = body

    // Validações
    if (!name && !newPassword) {
      return NextResponse.json(
        { error: "Nenhum dado para atualizar" },
        { status: 400 }
      )
    }

    // Se vai alterar senha, precisa da senha atual
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Senha atual é obrigatória para alterar a senha" },
          { status: 400 }
        )
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Nova senha deve ter pelo menos 6 caracteres" },
          { status: 400 }
        )
      }

      // Verificar senha atual
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { password: true }
      })

      if (!user) {
        return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
      }

      const isValid = await bcrypt.compare(currentPassword, user.password)

      if (!isValid) {
        return NextResponse.json(
          { error: "Senha atual incorreta" },
          { status: 400 }
        )
      }
    }

    // Atualizar
    const updateData: { name?: string; password?: string } = {}

    if (name) {
      updateData.name = name
    }

    if (newPassword) {
      updateData.password = await bcrypt.hash(newPassword, 10)
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      message: newPassword ? "Perfil e senha atualizados" : "Perfil atualizado"
    })
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar perfil" },
      { status: 500 }
    )
  }
}
