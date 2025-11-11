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

      // API pública da Receita Federal (via BrasilAPI)
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`)

      if (!response.ok) {
        throw new Error(`Erro ao buscar CNPJ: ${response.status}`)
      }

      const data = await response.json()

      return {
        cnpj: data.cnpj,
        revenue: this.estimateRevenue(data.capital_social),
        employees: this.estimateEmployees(data.porte),
        sector: data.cnae_fiscal_descricao,
        website: data.email ? `https://${data.email.split('@')[1]}` : undefined,
      }
    } catch (error) {
      console.error('Erro ao buscar dados da Receita Federal:', error)
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
   */
  private estimateEmployees(porte?: string): number | undefined {
    if (!porte) return undefined

    const porteMap: Record<string, number> = {
      'ME': 10,       // Microempresa
      'EPP': 50,      // Empresa de Pequeno Porte
      'MEDIA': 200,   // Média
      'GRANDE': 1000  // Grande
    }

    return porteMap[porte.toUpperCase()] || undefined
  }
}

export const companyEnrichment = new CompanyEnrichmentService()
