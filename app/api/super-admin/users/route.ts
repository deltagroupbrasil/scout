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

// GET /api/super-admin/users - Listar todos os usuários
export async function GET() {
  const auth = await requireSuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const users = await prisma.user.findMany({
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
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

// POST /api/super-admin/users - Criar usuário (com associação opcional a tenant)
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const { name, email, password, tenantId, role, isSuperAdmin } = body

    // Validações
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nome, email e senha são obrigatórios" },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Já existe um usuário com esse email" },
        { status: 400 }
      )
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10)

    // Criar usuário com tenant em uma transação
    const user = await prisma.$transaction(async (tx) => {
      // Criar usuário
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          lastActiveTenantId: tenantId || null,
        },
      })

      // Se tem tenantId, criar associação
      if (tenantId) {
        await tx.tenantUser.create({
          data: {
            userId: newUser.id,
            tenantId,
            role: role || 'USER',
          }
        })
      }

      // Se é SuperAdmin, criar registro
      if (isSuperAdmin) {
        await tx.superAdmin.create({
          data: {
            userId: newUser.id,
          }
        })
      }

      return newUser
    })

    // Buscar usuário com relações para retornar
    const userWithRelations = await prisma.user.findUnique({
      where: { id: user.id },
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

    return NextResponse.json(userWithRelations, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar usuário:", error)
    return NextResponse.json(
      { error: "Erro ao criar usuário" },
      { status: 500 }
    )
  }
}
