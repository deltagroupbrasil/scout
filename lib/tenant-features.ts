/**
 * Tenant Features & Quotas
 *
 * Utilitários para verificar features habilitadas e quotas do tenant.
 *
 * IMPORTANTE: Apenas 2 features são controláveis:
 * - kanban: Visualização em Kanban
 * - search: Busca de Vagas (com queries ilimitadas quando habilitado)
 *
 * Tudo o resto (dashboard, export, ai_insights, contact_enrichment, user_management)
 * vem de fábrica para todos os tenants.
 */

import { prisma } from "./prisma"
import { TenantFeature } from "./get-tenant-context"

/**
 * Features controláveis (que o SuperAdmin pode habilitar/desabilitar)
 */
export const CONTROLLABLE_FEATURES: { id: TenantFeature; name: string; description: string }[] = [
  { id: 'kanban', name: 'Kanban', description: 'Visualização em Kanban para gestão de leads' },
  { id: 'search', name: 'Busca de Vagas', description: 'Criar queries customizadas ilimitadas (sem isso, só cron job)' },
]

/**
 * Features padrão de fábrica (todos os tenants têm)
 */
export const DEFAULT_FEATURES: TenantFeature[] = [
  'dashboard',
  'export',
  'ai_insights',
  'contact_enrichment',
  'user_management',
]

/**
 * Lista de todas as features (para referência)
 */
export const AVAILABLE_FEATURES = [
  ...DEFAULT_FEATURES.map(id => ({ id, name: id, description: 'Padrão' })),
  ...CONTROLLABLE_FEATURES,
]

/**
 * Busca as features habilitadas de um tenant
 * Retorna DEFAULT_FEATURES + features controláveis que estão habilitadas
 */
export async function getTenantFeatures(tenantId: string): Promise<TenantFeature[]> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { enabledFeatures: true }
  })

  if (!tenant) {
    return [...DEFAULT_FEATURES] // Fallback: apenas padrões
  }

  try {
    const storedFeatures = tenant.enabledFeatures as TenantFeature[]
    const controllableEnabled = Array.isArray(storedFeatures)
      ? storedFeatures.filter(f => CONTROLLABLE_FEATURES.some(cf => cf.id === f))
      : []

    // Retorna padrões + controláveis habilitadas
    return [...DEFAULT_FEATURES, ...controllableEnabled]
  } catch {
    return [...DEFAULT_FEATURES]
  }
}

/**
 * Verifica se uma feature está habilitada para o tenant
 */
export async function hasFeature(tenantId: string, feature: TenantFeature): Promise<boolean> {
  const features = await getTenantFeatures(tenantId)
  return features.includes(feature)
}

/**
 * Verifica se o tenant pode adicionar mais usuários
 */
export async function canAddUser(tenantId: string): Promise<{ allowed: boolean; current: number; max: number }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      maxUsers: true,
      _count: {
        select: { tenantUsers: { where: { isActive: true } } }
      }
    }
  })

  if (!tenant) {
    return { allowed: false, current: 0, max: 0 }
  }

  const current = tenant._count.tenantUsers
  const max = tenant.maxUsers

  return {
    allowed: current < max,
    current,
    max
  }
}

/**
 * Verifica se o tenant pode criar queries de busca customizadas
 *
 * REGRA:
 * - Se tem feature 'search' habilitada = pode criar queries ILIMITADAS
 * - Se NÃO tem = NÃO pode criar queries (usa apenas cron job agendado)
 */
export async function canAddSearchQuery(tenantId: string): Promise<{ allowed: boolean; current: number; max: number; unlimited: boolean; hasFeature: boolean }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      enabledFeatures: true,
      _count: {
        select: { searchQueries: { where: { isActive: true } } }
      }
    }
  })

  if (!tenant) {
    return { allowed: false, current: 0, max: 0, unlimited: false, hasFeature: false }
  }

  // Verificar se tem feature 'search' habilitada
  let hasSearchFeature = false
  try {
    const storedFeatures = tenant.enabledFeatures as TenantFeature[]
    hasSearchFeature = Array.isArray(storedFeatures) && storedFeatures.includes('search')
  } catch {
    // Não tem
  }

  const current = tenant._count.searchQueries

  if (hasSearchFeature) {
    // Tem a feature = pode criar queries ilimitadas
    return { allowed: true, current, max: -1, unlimited: true, hasFeature: true }
  }

  // Não tem a feature = não pode criar queries (só usa cron job)
  return {
    allowed: false,
    current,
    max: 0,
    unlimited: false,
    hasFeature: false
  }
}

/**
 * Atualiza as features de um tenant
 * IMPORTANTE: Apenas armazena features controláveis (kanban, search)
 * Features padrão são adicionadas automaticamente por getTenantFeatures()
 */
export async function updateTenantFeatures(tenantId: string, features: TenantFeature[]): Promise<void> {
  // Filtrar apenas features controláveis
  const controllableOnly = features.filter(f =>
    CONTROLLABLE_FEATURES.some(cf => cf.id === f)
  )

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { enabledFeatures: controllableOnly }
  })
}

/**
 * Verifica quota e retorna erro formatado se excedida
 */
export async function checkUserQuota(tenantId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const quota = await canAddUser(tenantId)

  if (!quota.allowed) {
    return {
      ok: false,
      error: `Limite de usuários atingido (${quota.current}/${quota.max}). Faça upgrade do plano para adicionar mais usuários.`
    }
  }

  return { ok: true }
}

/**
 * Verifica se o tenant pode criar queries customizadas
 */
export async function checkSearchQueryQuota(tenantId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const quota = await canAddSearchQuery(tenantId)

  if (!quota.hasFeature) {
    return {
      ok: false,
      error: `Seu plano não inclui a funcionalidade de Busca de Vagas customizada. Entre em contato com o suporte para habilitar.`
    }
  }

  return { ok: true }
}
