import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateTenantFeatures, AVAILABLE_FEATURES } from "@/lib/tenant-features"
import { TenantFeature } from "@/lib/get-tenant-context"

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

// GET /api/super-admin/tenants/[id]/features - Buscar features do tenant
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
    select: {
      id: true,
      name: true,
      enabledFeatures: true,
      plan: true,
    }
  })

  if (!tenant) {
    return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 })
  }

  // Parsear features
  let enabledFeatures: TenantFeature[] = ['dashboard']
  try {
    const parsed = tenant.enabledFeatures as TenantFeature[]
    if (Array.isArray(parsed)) {
      enabledFeatures = parsed
    }
  } catch {
    // Fallback para dashboard
  }

  return NextResponse.json({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
    },
    enabledFeatures,
    availableFeatures: AVAILABLE_FEATURES,
  })
}

// PATCH /api/super-admin/tenants/[id]/features - Atualizar features do tenant
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
    const { features } = body

    if (!Array.isArray(features)) {
      return NextResponse.json(
        { error: "features deve ser um array" },
        { status: 400 }
      )
    }

    // Validar que todas as features são válidas
    const validFeatureIds = AVAILABLE_FEATURES.map(f => f.id)
    const invalidFeatures = features.filter(f => !validFeatureIds.includes(f))

    if (invalidFeatures.length > 0) {
      return NextResponse.json(
        { error: `Features inválidas: ${invalidFeatures.join(', ')}` },
        { status: 400 }
      )
    }

    // Atualizar features
    await updateTenantFeatures(id, features as TenantFeature[])

    return NextResponse.json({ success: true, features })
  } catch (error) {
    console.error("Erro ao atualizar features:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar features" },
      { status: 500 }
    )
  }
}
