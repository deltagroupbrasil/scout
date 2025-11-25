import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getTenantContext, requireMinimumRole } from "@/lib/get-tenant-context"
import { checkUserQuota, hasFeature } from "@/lib/tenant-features"
import bcrypt from "bcryptjs"

/**
 * GET /api/tenant/users
 * Lista usuários do tenant atual (apenas ADMIN pode ver)
 */
export async function GET() {
  try {
    const ctx = await getTenantContext()
    await requireMinimumRole('ADMIN', ctx)

    // Verificar se tenant tem a feature de gestão de usuários
    const hasUserManagement = await hasFeature(ctx.tenantId, 'user_management')
    if (!hasUserManagement && !ctx.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Recurso não disponível. A gestão de usuários não está habilitada para sua organização.' },
        { status: 403 }
      )
    }

    // Buscar usuários do tenant
    const tenantUsers = await prisma.tenantUser.findMany({
      where: { tenantId: ctx.tenantId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Formatar resposta
    const users = tenantUsers.map(tu => ({
      id: tu.user.id,
      name: tu.user.name,
      email: tu.user.email,
      role: tu.role,
      isActive: tu.isActive,
      joinedAt: tu.createdAt,
      userCreatedAt: tu.user.createdAt,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Erro ao listar usuários:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar usuários" },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    )
  }
}

/**
 * POST /api/tenant/users
 * Cria novo usuário e adiciona ao tenant (apenas ADMIN pode criar)
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getTenantContext()
    await requireMinimumRole('ADMIN', ctx)

    // Verificar se tenant tem a feature de gestão de usuários
    const hasUserManagement = await hasFeature(ctx.tenantId, 'user_management')
    if (!hasUserManagement && !ctx.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Recurso não disponível. A gestão de usuários não está habilitada para sua organização.' },
        { status: 403 }
      )
    }

    // Verificar quota de usuários
    const quotaCheck = await checkUserQuota(ctx.tenantId)
    if (!quotaCheck.ok) {
      return NextResponse.json(
        { error: quotaCheck.error },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, password, role } = body

    // Validações
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      )
    }

    // Validar role - Admin do tenant não pode criar outro ADMIN
    const validRoles = ['MANAGER', 'USER', 'VIEWER']
    const userRole = role || 'USER'

    if (!ctx.isSuperAdmin && userRole === 'ADMIN') {
      return NextResponse.json(
        { error: "Apenas Super Admins podem criar usuários com role ADMIN" },
        { status: 403 }
      )
    }

    if (!validRoles.includes(userRole) && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: "Role inválida. Use: MANAGER, USER ou VIEWER" },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      // Verificar se já está no tenant
      const existingTenantUser = await prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId: ctx.tenantId,
            userId: existingUser.id
          }
        }
      })

      if (existingTenantUser) {
        return NextResponse.json(
          { error: "Este usuário já faz parte da sua organização" },
          { status: 400 }
        )
      }

      // Adicionar usuário existente ao tenant
      await prisma.tenantUser.create({
        data: {
          tenantId: ctx.tenantId,
          userId: existingUser.id,
          role: userRole,
        }
      })

      return NextResponse.json({
        user: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: userRole,
          isActive: true,
        },
        message: "Usuário existente adicionado à sua organização"
      }, { status: 201 })
    }

    // Criar novo usuário
    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          lastActiveTenantId: ctx.tenantId,
        }
      })

      await tx.tenantUser.create({
        data: {
          tenantId: ctx.tenantId,
          userId: user.id,
          role: userRole,
        }
      })

      return user
    })

    return NextResponse.json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: userRole,
        isActive: true,
      }
    }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar usuário:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao criar usuário" },
      { status: 500 }
    )
  }
}
