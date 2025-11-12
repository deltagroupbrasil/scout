// Company Enrichment Service
import { CompanyEnrichmentData } from "@/types"

export class CompanyEnrichmentService {
  /**
   * Busca dados da empresa na Receita Federal via CNPJ
   */
  async getCompanyByCNPJ(cnpj: string): Promise<CompanyEnrichmentData | null> {
    try {
      // Remover caracteres não numéricos do CNPJ
      const cleanCNPJ = cnpj.replace(/\D/g, '')

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

      return {
        cnpj: data.cnpj,
        revenue: this.estimateRevenue(data.capital_social),
        employees: this.estimateEmployees(data.porte),
        sector: data.cnae_fiscal_descricao,
        website: data.email ? `https://${data.email.split('@')[1]}` : undefined,
      }
    } catch (error) {
      console.error('❌ [Enrichment] Erro ao buscar dados da Receita Federal:', error)
      return null
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
