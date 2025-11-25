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

// GET /api/super-admin/tenants - Listar tenants
export async function GET() {
  const auth = await requireSuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          tenantUsers: true,
          leads: true,
          searchQueries: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(tenants)
}

// POST /api/super-admin/tenants - Criar tenant
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin()
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const { name, slug, plan, maxUsers, maxSearchQueries, billingEmail, contractStart, contractEnd } = body

    // Validações
    if (!name || !slug) {
      return NextResponse.json(
        { error: "Nome e slug são obrigatórios" },
        { status: 400 }
      )
    }

    // Verificar se slug já existe
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug }
    })

    if (existingTenant) {
      return NextResponse.json(
        { error: "Já existe um tenant com esse slug" },
        { status: 400 }
      )
    }

    // Criar tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        plan: plan || 'basic',
        maxUsers: maxUsers || 5,
        maxSearchQueries: maxSearchQueries || 3,
        billingEmail: billingEmail || null,
        contractStart: contractStart ? new Date(contractStart) : new Date(),
        contractEnd: contractEnd ? new Date(contractEnd) : null,
      },
    })

    return NextResponse.json(tenant, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar tenant:", error)
    return NextResponse.json(
      { error: "Erro ao criar tenant" },
      { status: 500 }
    )
  }
}
