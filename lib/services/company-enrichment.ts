// Company Enrichment Service
import { CompanyEnrichmentData } from "@/types"
import { prisma } from "@/lib/prisma"

export class CompanyEnrichmentService {
  /**
   * Busca dados da empresa na Receita Federal via CNPJ
   * Usa cache para evitar requisições duplicadas
   */
  async getCompanyByCNPJ(cnpj: string): Promise<CompanyEnrichmentData | null> {
    try {
      // Remover caracteres não numéricos do CNPJ
      const cleanCNPJ = cnpj.replace(/\D/g, '')

      // 1. Verificar cache primeiro
      const cached = await this.getFromCache(cleanCNPJ)
      if (cached) {
        console.log(`💾 [Enrichment] Usando cache para CNPJ: ${cleanCNPJ}`)
        return cached
      }

      console.log(`[Enrichment] Buscando dados para CNPJ: ${cleanCNPJ}`)

      // API pública da Receita Federal (via BrasilAPI)
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`)

      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          console.warn(`⚠️  [Enrichment] Rate limit atingido (${response.status}), usando apenas CNPJ`)
          // Retornar apenas o CNPJ sem enriquecimento
          return {
            cnpj: cleanCNPJ,
            revenue: undefined,
            employees: undefined,
            sector: undefined,
            website: undefined,
          }
        }
        throw new Error(`Erro ao buscar CNPJ: ${response.status}`)
      }

      const data = await response.json()

      console.log(`✅ [Enrichment] Dados enriquecidos: ${data.nome_fantasia || data.razao_social}`)

      const enrichmentData = {
        cnpj: data.cnpj,
        revenue: this.estimateRevenue(data.capital_social),
        employees: this.estimateEmployees(data.porte),
        sector: data.cnae_fiscal_descricao,
        website: data.email ? `https://${data.email.split('@')[1]}` : undefined,
      }

      // 2. Salvar no cache para uso futuro (expira em 30 dias)
      await this.saveToCache(cleanCNPJ, data)

      return enrichmentData
    } catch (error) {
      console.error('❌ [Enrichment] Erro ao buscar dados da Receita Federal:', error)

      // Salvar erro no cache para não tentar novamente (expira em 1 dia)
      await this.saveErrorToCache(cleanCNPJ, error instanceof Error ? error.message : 'Unknown error')

      return null
    }
  }

  /**
   * Busca dados do cache
   */
  private async getFromCache(cnpj: string): Promise<CompanyEnrichmentData | null> {
    try {
      const cached = await prisma.enrichmentCache.findUnique({
        where: { cnpj },
      })

      if (!cached) {
        return null
      }

      // Verificar se cache expirou
      if (new Date() > cached.expiresAt) {
        // Cache expirado, deletar
        await prisma.enrichmentCache.delete({ where: { cnpj } })
        return null
      }

      // Se não teve sucesso na última busca, retornar null
      if (!cached.success) {
        return null
      }

      // Retornar dados do cache
      return {
        cnpj: cached.cnpj,
        revenue: this.estimateRevenue(cached.capitalSocial || undefined),
        employees: this.estimateEmployees(cached.porte || undefined),
        sector: cached.sector || undefined,
        website: cached.website || undefined,
      }
    } catch (error) {
      console.error('Erro ao buscar cache:', error)
      return null
    }
  }

  /**
   * Salva dados no cache
   */
  private async saveToCache(cnpj: string, data: any): Promise<void> {
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30) // Expira em 30 dias

      await prisma.enrichmentCache.upsert({
        where: { cnpj },
        update: {
          razaoSocial: data.razao_social,
          nomeFantasia: data.nome_fantasia,
          capitalSocial: data.capital_social,
          porte: data.porte,
          sector: data.cnae_fiscal_descricao,
          website: data.email ? `https://${data.email.split('@')[1]}` : null,
          success: true,
          errorMessage: null,
          expiresAt,
        },
        create: {
          cnpj,
          razaoSocial: data.razao_social,
          nomeFantasia: data.nome_fantasia,
          capitalSocial: data.capital_social,
          porte: data.porte,
          sector: data.cnae_fiscal_descricao,
          website: data.email ? `https://${data.email.split('@')[1]}` : null,
          success: true,
          expiresAt,
        },
      })

      console.log(`💾 [Cache] Dados salvos para CNPJ: ${cnpj}`)
    } catch (error) {
      console.error('Erro ao salvar cache:', error)
    }
  }

  /**
   * Salva erro no cache para não tentar novamente por 1 dia
   */
  private async saveErrorToCache(cnpj: string, errorMessage: string): Promise<void> {
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 1) // Expira em 1 dia

      await prisma.enrichmentCache.upsert({
        where: { cnpj },
        update: {
          success: false,
          errorMessage,
          expiresAt,
        },
        create: {
          cnpj,
          success: false,
          errorMessage,
          expiresAt,
        },
      })

      console.log(`💾 [Cache] Erro salvo para CNPJ: ${cnpj}`)
    } catch (error) {
      console.error('Erro ao salvar erro no cache:', error)
    }
  }

  /**
   * Busca CNPJ pelo nome da empresa usando ReceitaWS
   */
  async searchCNPJByName(companyName: string): Promise<string | null> {
    try {
      console.log('Buscando CNPJ para:', companyName)

      // Limpar nome da empresa (remover S.A., Ltda, etc)
      const cleanName = this.cleanCompanyName(companyName)

      // Tentar via Google (busca "{nome} cnpj")
      // Nota: Isso é uma solução simples. Para produção, considere usar uma API paga.

      // Por enquanto, retornar null - pode ser implementado com scraping ou API paga
      return null
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error)
      return null
    }
  }

  /**
   * Limpa o nome da empresa removendo sufixos comuns
   */
  private cleanCompanyName(name: string): string {
    return name
      .replace(/\s+(S\.?A\.?|LTDA\.?|ME|EPP|EIRELI)$/i, '')
      .trim()
  }

  /**
   * Busca múltiplas empresas por padrão de nome
   */
  async searchCompaniesByPattern(pattern: string): Promise<CompanyEnrichmentData[]> {
    try {
      // TODO: Implementar busca por padrão
      // Isso seria útil para encontrar subsidiárias ou variações do nome
      return []
    } catch (error) {
      console.error('Erro ao buscar empresas por padrão:', error)
      return []
    }
  }

  /**
   * Estima o faturamento baseado no capital social
   */
  private estimateRevenue(capitalSocial?: number): number | undefined {
    if (!capitalSocial) return undefined
    // Heurística simples: faturamento ~= capital social * 5
    return capitalSocial * 5
  }

  /**
   * Estima o número de funcionários baseado no porte
   * Fonte: Receita Federal / BrasilAPI
   */
  private estimateEmployees(porte?: string): number | undefined {
    if (!porte) return undefined

    // Mapeamento dos portes da Receita Federal
    const porteMap: Record<string, number> = {
      'MICRO EMPRESA': 10,           // Código 1: até 9 funcionários
      'ME': 10,
      'EMPRESA DE PEQUENO PORTE': 50, // Código 3: 10-49 funcionários
      'EPP': 50,
      'DEMAIS': 500,                 // Código 5: 50+ funcionários (empresas grandes)
      'MEDIA': 200,
      'GRANDE': 1000
    }

    return porteMap[porte.toUpperCase()] || 100  // Default: 100 funcionários
  }
}

export const companyEnrichment = new CompanyEnrichmentService()
