// OpenCNPJ / ReceitaWS Enrichment Service
// Busca dados oficiais de empresas brasileiras via CNPJ (Receita Federal)
// API Grátis: https://www.receitaws.com.br/ ou https://brasilapi.com.br/

export interface OpenCNPJCompanyData {
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  email?: string
  telefone?: string
  socios: Array<{
    nome: string
    cpfMasked: string  // CPF mascarado (XXX.XXX.XXX-**)
    qualificacao: string  // Administrador, Sócio, Presidente, etc
    dataEntrada?: string
  }>
  capitalSocial?: number
  porte?: string  // ME, EPP, DEMAIS
  naturezaJuridica?: string
  atividadePrincipal?: {
    code: string
    text: string
  }
  situacao?: string  // ATIVA, BAIXADA, etc
  dataAbertura?: string
}

export class OpenCNPJEnrichmentService {
  private baseUrl = 'https://brasilapi.com.br/api/cnpj/v1'
  private fallbackUrl = 'https://www.receitaws.com.br/v1/cnpj'

  constructor() {
    console.log('[OpenCNPJ] Serviço inicializado (APIs gratuitas)')
  }

  /**
   * Busca dados oficiais da empresa por CNPJ
   */
  async getCompanyData(cnpj: string): Promise<OpenCNPJCompanyData | null> {
    // Limpar CNPJ (remover formatação)
    const cleanCNPJ = cnpj.replace(/\D/g, '')

    if (cleanCNPJ.length !== 14) {
      console.error(`[OpenCNPJ] CNPJ inválido: ${cnpj} (deve ter 14 dígitos)`)
      return null
    }

    console.log(`\n [OpenCNPJ] Consultando CNPJ: ${this.formatCNPJ(cleanCNPJ)}`)

    // Tentar Brasil API primeiro (mais rápida)
    let data = await this.fetchFromBrasilAPI(cleanCNPJ)

    // Fallback: ReceitaWS
    if (!data) {
      console.log('     Brasil API falhou, tentando ReceitaWS...')
      data = await this.fetchFromReceitaWS(cleanCNPJ)
    }

    if (!data) {
      console.log('    Nenhuma API retornou dados')
      return null
    }

    console.log(`    Dados encontrados: ${data.razaoSocial}`)
    if (data.socios.length > 0) {
      console.log(`    Sócios: ${data.socios.length}`)
    }

    return data
  }

  /**
   * Busca via BrasilAPI (rápida, sem rate limit conhecido)
   */
  private async fetchFromBrasilAPI(cnpj: string): Promise<OpenCNPJCompanyData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${cnpj}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LeapScout/1.0'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          console.log('     CNPJ não encontrado na Brasil API')
        } else {
          console.error(`    Brasil API erro ${response.status}`)
        }
        return null
      }

      const data = await response.json()

      // Converter formato Brasil API para nosso formato
      return this.parseBrasilAPIResponse(data)

    } catch (error) {
      console.error('[OpenCNPJ] Erro Brasil API:', error)
      return null
    }
  }

  /**
   * Busca via ReceitaWS (fallback, tem rate limit)
   */
  private async fetchFromReceitaWS(cnpj: string): Promise<OpenCNPJCompanyData | null> {
    try {
      const response = await fetch(`${this.fallbackUrl}/${cnpj}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LeapScout/1.0'
        }
      })

      if (!response.ok) {
        if (response.status === 429) {
          console.log('     ReceitaWS: Rate limit atingido')
        } else if (response.status === 404) {
          console.log('     CNPJ não encontrado na ReceitaWS')
        } else {
          console.error(`    ReceitaWS erro ${response.status}`)
        }
        return null
      }

      const data = await response.json()

      // Verificar se há erro na resposta
      if (data.status === 'ERROR') {
        console.error('    ReceitaWS erro:', data.message)
        return null
      }

      // Converter formato ReceitaWS para nosso formato
      return this.parseReceitaWSResponse(data)

    } catch (error) {
      console.error('[OpenCNPJ] Erro ReceitaWS:', error)
      return null
    }
  }

  /**
   * Parse response da Brasil API
   */
  private parseBrasilAPIResponse(data: any): OpenCNPJCompanyData {
    return {
      cnpj: data.cnpj,
      razaoSocial: data.razao_social || data.nome_empresarial,
      nomeFantasia: data.nome_fantasia || data.razao_social,
      email: data.email || undefined,
      telefone: data.ddd_telefone_1 || undefined,
      socios: (data.qsa || []).map((socio: any) => ({
        nome: socio.nome_socio || socio.nome,
        cpfMasked: this.maskCPF(socio.cpf_representante_legal || socio.cpf_cnpj_socio || ''),
        qualificacao: socio.qualificacao_socio || socio.qual,
        dataEntrada: socio.data_entrada_sociedade
      })),
      capitalSocial: data.capital_social ? parseFloat(data.capital_social) : undefined,
      porte: data.porte,
      naturezaJuridica: data.natureza_juridica,
      atividadePrincipal: data.cnae_fiscal_principal ? {
        code: data.cnae_fiscal_principal.codigo || data.cnae_fiscal,
        text: data.cnae_fiscal_principal.descricao || ''
      } : undefined,
      situacao: data.situacao_cadastral || data.situacao,
      dataAbertura: data.data_inicio_atividade || data.data_abertura
    }
  }

  /**
   * Parse response da ReceitaWS
   */
  private parseReceitaWSResponse(data: any): OpenCNPJCompanyData {
    return {
      cnpj: data.cnpj,
      razaoSocial: data.nome,
      nomeFantasia: data.fantasia || data.nome,
      email: data.email || undefined,
      telefone: data.telefone || undefined,
      socios: (data.qsa || []).map((socio: any) => ({
        nome: socio.nome,
        cpfMasked: '', // ReceitaWS não retorna CPF
        qualificacao: socio.qual
      })),
      capitalSocial: data.capital_social ? parseFloat(data.capital_social.replace(/\D/g, '')) / 100 : undefined,
      porte: data.porte,
      naturezaJuridica: data.natureza_juridica,
      atividadePrincipal: data.atividade_principal && data.atividade_principal.length > 0 ? {
        code: data.atividade_principal[0].code,
        text: data.atividade_principal[0].text
      } : undefined,
      situacao: data.situacao,
      dataAbertura: data.abertura
    }
  }

  /**
   * Mascara CPF (XXX.XXX.XXX-**)
   */
  private maskCPF(cpf: string): string {
    if (!cpf || cpf.length < 11) return ''

    const clean = cpf.replace(/\D/g, '')
    return `${clean.substring(0, 3)}.${clean.substring(3, 6)}.${clean.substring(6, 9)}-**`
  }

  /**
   * Formata CNPJ (XX.XXX.XXX/XXXX-XX)
   */
  private formatCNPJ(cnpj: string): string {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  /**
   * Sleep helper (para rate limiting)
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const openCNPJEnrichment = new OpenCNPJEnrichmentService()
