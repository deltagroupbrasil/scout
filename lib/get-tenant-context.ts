/**
 * Tenant Context Helper
 *
 * Utilitários para obter o contexto de tenant da sessão do usuário.
 * Usado em APIs e componentes server-side para garantir isolamento multi-tenant.
 */

import { getServerSession } from "next-auth"
import { authOptions } from "./auth"
import { TenantRole } from "@prisma/client"

export interface TenantContext {
  userId: string
  tenantId: string
  tenantSlug: string
  tenantName: string
  role: TenantRole
  isSuperAdmin: boolean
}

/**
 * Obtém o contexto de tenant da sessão atual.
 *
 * @throws {Error} Se não houver sessão autenticada ou tenant ativo
 * @returns {Promise<TenantContext>} Contexto do tenant ativo
 *
 * @example
 * ```ts
 * // Em uma API route ou Server Component
 * import { getTenantContext } from "@/lib/get-tenant-context"
 *
 * export async function GET(req: Request) {
 *   const { tenantId, userId, role } = await getTenantContext()
 *
 *   // Buscar apenas dados do tenant ativo
 *   const leads = await prisma.lead.findMany({
 *     where: { tenantId }
 *   })
 *
 *   return Response.json(leads)
 * }
 * ```
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw new Error("Unauthorized: No active session")
  }

  const { id: userId, activeTenantId, tenants, isSuperAdmin } = session.user

  if (!activeTenantId) {
    throw new Error("No active tenant selected")
  }

  // Buscar dados do tenant ativo
  const activeTenant = tenants.find(t => t.tenantId === activeTenantId)

  if (!activeTenant && !isSuperAdmin) {
    throw new Error("User does not have access to the selected tenant")
  }

  return {
    userId,
    tenantId: activeTenantId,
    tenantSlug: activeTenant?.tenantSlug || 'unknown',
    tenantName: activeTenant?.tenantName || 'Unknown Tenant',
    role: activeTenant?.role || 'VIEWER',
    isSuperAdmin,
  }
}

/**
 * Obtém o contexto de tenant ou retorna null se não houver sessão.
 * Útil para endpoints que permitem acesso opcional autenticado.
 *
 * @returns {Promise<TenantContext | null>} Contexto do tenant ou null
 */
export async function getTenantContextOrNull(): Promise<TenantContext | null> {
  try {
    return await getTenantContext()
  } catch {
    return null
  }
}

/**
 * Valida se o usuário tem uma role específica no tenant ativo.
 *
 * @param {TenantRole | TenantRole[]} requiredRoles - Role(s) necessária(s)
 * @throws {Error} Se o usuário não tiver a role necessária
 *
 * @example
 * ```ts
 * import { getTenantContext, requireRole } from "@/lib/get-tenant-context"
 *
 * export async function DELETE(req: Request) {
 *   const ctx = await getTenantContext()
 *   await requireRole(['ADMIN', 'MANAGER'], ctx)
 *
 *   // Apenas ADMIN ou MANAGER pode deletar
 *   // ...
 * }
 * ```
 */
export async function requireRole(
  requiredRoles: TenantRole | TenantRole[],
  context?: TenantContext
): Promise<void> {
  const ctx = context || await getTenantContext()

  // SuperAdmin tem acesso total
  if (ctx.isSuperAdmin) {
    return
  }

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

  if (!roles.includes(ctx.role)) {
    throw new Error(`Forbidden: Requires one of the following roles: ${roles.join(', ')}`)
  }
}

/**
 * Valida se o usuário é SuperAdmin.
 *
 * @throws {Error} Se o usuário não for SuperAdmin
 */
export async function requireSuperAdmin(): Promise<void> {
  const ctx = await getTenantContext()

  if (!ctx.isSuperAdmin) {
    throw new Error("Forbidden: SuperAdmin access required")
  }
}

/**
 * Features disponíveis no sistema
 */
export type TenantFeature =
  | 'dashboard'       // Acesso ao dashboard básico (sempre habilitado)
  | 'kanban'          // Kanban de leads
  | 'search'          // Busca de vagas
  | 'export'          // Exportação CSV
  | 'ai_insights'     // Insights de IA
  | 'contact_enrichment' // Enriquecimento de contatos
  | 'user_management' // Gestão de usuários do tenant

/**
 * Hierarquia de permissões:
 * ADMIN > MANAGER > USER > VIEWER
 */
const ROLE_HIERARCHY: Record<TenantRole, number> = {
  ADMIN: 4,
  MANAGER: 3,
  USER: 2,
  VIEWER: 1,
}

/**
 * Valida se o usuário tem pelo menos a role especificada.
 *
 * @param {TenantRole} minimumRole - Role mínima necessária
 * @param {TenantContext} [context] - Contexto opcional (busca automaticamente se não fornecido)
 * @throws {Error} Se o usuário não tiver permissão suficiente
 *
 * @example
 * ```ts
 * // Permite ADMIN, MANAGER e USER (exclui apenas VIEWER)
 * await requireMinimumRole('USER')
 * ```
 */
export async function requireMinimumRole(
  minimumRole: TenantRole,
  context?: TenantContext
): Promise<void> {
  const ctx = context || await getTenantContext()

  // SuperAdmin tem acesso total
  if (ctx.isSuperAdmin) {
    return
  }

  const userLevel = ROLE_HIERARCHY[ctx.role]
  const requiredLevel = ROLE_HIERARCHY[minimumRole]

  if (userLevel < requiredLevel) {
    throw new Error(`Forbidden: Requires at least ${minimumRole} role`)
  }
}
