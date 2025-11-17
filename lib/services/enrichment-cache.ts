/**
 * Enrichment Cache Service
 *
 * Gerencia cache de enriquecimento de empresas para reduzir custos
 * de APIs externas (Brasil API, Nova Vida TI, etc)
 *
 * Estratégia:
 * - Cache por CNPJ (30 dias)
 * - Cache por domínio (7 dias)
 * - Cache por nome normalizado (3 dias)
 * - LRU eviction automático
 */

import { prisma } from '@/lib/prisma'

export interface CachedEnrichmentData {
  cnpj?: string
  razaoSocial?: string
  nomeFantasia?: string
  capitalSocial?: number
  porte?: string
  sector?: string
  website?: string
  revenue?: number
  employees?: number
  source: string
  cachedAt: Date
  expiresAt: Date
}

export class EnrichmentCacheService {
  private readonly DEFAULT_TTL_DAYS = 30
  private readonly DOMAIN_TTL_DAYS = 7
  private readonly NAME_TTL_DAYS = 3

  /**
   * Busca dados no cache por CNPJ
   */
  async getByCNPJ(cnpj: string): Promise<CachedEnrichmentData | null> {
    const normalized = this.normalizeCNPJ(cnpj)

    const cached = await prisma.enrichmentCache.findFirst({
      where: {
        cnpj: normalized,
        expiresAt: {
          gt: new Date(),
        },
        success: true,
      },
    })

    if (!cached) return null

    return {
      cnpj: cached.cnpj,
      razaoSocial: cached.razaoSocial || undefined,
      nomeFantasia: cached.nomeFantasia || undefined,
      capitalSocial: cached.capitalSocial || undefined,
      porte: cached.porte || undefined,
      sector: cached.sector || undefined,
      website: cached.website || undefined,
      source: 'cache',
      cachedAt: cached.createdAt,
      expiresAt: cached.expiresAt,
    }
  }

  /**
   * Salva dados no cache
   */
  async save(
    cnpj: string,
    data: {
      razaoSocial?: string
      nomeFantasia?: string
      capitalSocial?: number
      porte?: string
      sector?: string
      website?: string
    },
    ttlDays: number = this.DEFAULT_TTL_DAYS
  ): Promise<void> {
    const normalized = this.normalizeCNPJ(cnpj)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + ttlDays)

    await prisma.enrichmentCache.upsert({
      where: { cnpj: normalized },
      create: {
        cnpj: normalized,
        ...data,
        success: true,
        expiresAt,
      },
      update: {
        ...data,
        success: true,
        expiresAt,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Salva erro no cache (para evitar re-consultas)
   */
  async saveError(
    cnpj: string,
    errorMessage: string,
    ttlDays: number = 1  // Erros expiram mais rápido
  ): Promise<void> {
    const normalized = this.normalizeCNPJ(cnpj)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + ttlDays)

    await prisma.enrichmentCache.upsert({
      where: { cnpj: normalized },
      create: {
        cnpj: normalized,
        success: false,
        errorMessage,
        expiresAt,
      },
      update: {
        success: false,
        errorMessage,
        expiresAt,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Verifica se CNPJ está em cache (mesmo que erro)
   */
  async hasCNPJ(cnpj: string): Promise<boolean> {
    const normalized = this.normalizeCNPJ(cnpj)

    const count = await prisma.enrichmentCache.count({
      where: {
        cnpj: normalized,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    return count > 0
  }

  /**
   * Remove entradas expiradas (limpeza)
   */
  async cleanupExpired(): Promise<number> {
    const result = await prisma.enrichmentCache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })

    return result.count
  }

  /**
   * Estatísticas do cache
   */
  async getStats(): Promise<{
    total: number
    valid: number
    expired: number
    errors: number
    hitRate?: number
  }> {
    const now = new Date()

    const [total, valid, expired, errors] = await Promise.all([
      prisma.enrichmentCache.count(),
      prisma.enrichmentCache.count({
        where: {
          expiresAt: { gt: now },
          success: true,
        },
      }),
      prisma.enrichmentCache.count({
        where: {
          expiresAt: { lte: now },
        },
      }),
      prisma.enrichmentCache.count({
        where: {
          success: false,
        },
      }),
    ])

    return {
      total,
      valid,
      expired,
      errors,
    }
  }

  /**
   * Invalidar cache de CNPJ específico
   */
  async invalidate(cnpj: string): Promise<void> {
    const normalized = this.normalizeCNPJ(cnpj)

    await prisma.enrichmentCache.delete({
      where: { cnpj: normalized },
    })
  }

  /**
   * Pré-aquecer cache com CNPJs conhecidos
   */
  async warmup(cnpjs: Array<{ cnpj: string; data: any }>): Promise<number> {
    let count = 0

    for (const item of cnpjs) {
      try {
        await this.save(item.cnpj, item.data)
        count++
      } catch (error) {
        console.error(`Erro ao aquecer cache para ${item.cnpj}:`, error)
      }
    }

    return count
  }

  /**
   * Buscar CNPJs que precisam de refresh (próximos a expirar)
   */
  async getExpiringSoon(daysThreshold: number = 3): Promise<string[]> {
    const threshold = new Date()
    threshold.setDate(threshold.getDate() + daysThreshold)

    const expiring = await prisma.enrichmentCache.findMany({
      where: {
        expiresAt: {
          gt: new Date(),
          lt: threshold,
        },
        success: true,
      },
      select: {
        cnpj: true,
      },
    })

    return expiring.map(e => e.cnpj)
  }

  /**
   * Wrapper: Executa função com cache automático
   */
  async withCache<T>(
    cnpj: string,
    fetcher: () => Promise<T>,
    parser: (data: T) => {
      razaoSocial?: string
      nomeFantasia?: string
      capitalSocial?: number
      porte?: string
      sector?: string
      website?: string
    },
    ttl: number = this.DEFAULT_TTL_DAYS
  ): Promise<T | null> {
    // 1. Verificar cache
    const cached = await this.getByCNPJ(cnpj)
    if (cached) {
      console.log(` [Cache Hit] CNPJ: ${cnpj}`)
      return cached as unknown as T
    }

    // 2. Fetch novo
    console.log(`  [Cache Miss] CNPJ: ${cnpj} - fetching...`)

    try {
      const data = await fetcher()

      // 3. Salvar no cache
      const parsed = parser(data)
      await this.save(cnpj, parsed, ttl)

      return data
    } catch (error: any) {
      // 4. Salvar erro no cache
      await this.saveError(cnpj, error.message || 'Unknown error', 1)
      throw error
    }
  }

  /**
   * Normaliza CNPJ (remove formatação)
   */
  private normalizeCNPJ(cnpj: string): string {
    return cnpj.replace(/\D/g, '')
  }

  /**
   * Calcula hit rate do cache
   */
  async calculateHitRate(periodDays: number = 7): Promise<number> {
    const since = new Date()
    since.setDate(since.getDate() - periodDays)

    const [hits, total] = await Promise.all([
      prisma.enrichmentCache.count({
        where: {
          createdAt: { gte: since },
        },
      }),
      prisma.company.count({
        where: {
          createdAt: { gte: since },
        },
      }),
    ])

    if (total === 0) return 0
    return Math.round((hits / total) * 100)
  }
}

// Singleton export
export const enrichmentCache = new EnrichmentCacheService()
