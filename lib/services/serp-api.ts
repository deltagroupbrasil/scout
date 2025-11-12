/**
 * SERP API Service - Bright Data
 *
 * Busca resultados do Google para encontrar vagas de emprego
 * Mais econômico que scraping direto e encontra múltiplas fontes
 */

import { LinkedInJobData } from '@/types'

interface SerpApiResponse {
  organic_results?: Array<{
    title: string
    link: string
    snippet: string
    displayed_link?: string
  }>
}

export class SerpApiService {
  private apiKey: string
  private apiUrl = 'https://api.brightdata.com/request'

  constructor() {
    this.apiKey = this.getApiKey()
  }

  private getApiKey(): string {
    return process.env.BRIGHT_DATA_SERP_KEY || ''
  }

  /**
   * Busca vagas no Google via SERP API
   * @param query - Termos de busca (ex: "Controller vagas São Paulo")
   * @param site - Site específico (opcional, ex: "linkedin.com")
   * @returns Lista de vagas encontradas
   */
  async searchJobs(
    query: string,
    site?: string,
    maxResults: number = 20
  ): Promise<LinkedInJobData[]> {
    const apiKey = this.getApiKey()

    if (!apiKey) {
      console.warn('BRIGHT_DATA_SERP_KEY não configurada')
      return []
    }

    try {
      // Construir query otimizada
      let searchQuery = query

      // Adicionar site específico se fornecido
      if (site) {
        searchQuery = `${query} site:${site}`
      }

      // Adicionar filtros para melhorar resultados
      searchQuery = `${searchQuery} "vaga" OR "oportunidade" -"curso" -"estágio"`

      console.log(`🔍 Buscando no Google: "${searchQuery}"`)

      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=${maxResults}`

      // Fazer requisição para SERP API
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          zone: 'serp_api1',
          url: googleUrl,
          format: 'json', // Usar JSON ao invés de raw para parsing automático
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`SERP API error: ${response.status} ${response.statusText}\n${errorText}`)
      }

      const contentType = response.headers.get('content-type')
      let data: any

      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        // Se não for JSON, tentar parsear HTML
        const html = await response.text()
        console.log('⚠️  Resposta não é JSON, recebido HTML')
        console.log('Primeiros 500 caracteres:', html.substring(0, 500))
        return []
      }

      // A resposta da Bright Data vem com estrutura: { status_code, headers, body }
      const bodyContent = data.body || data

      console.log('🔍 Debug - Tipo de body:', typeof bodyContent)

      // Se body for string HTML, precisamos parsear
      let parsedData: SerpApiResponse = {}

      if (typeof bodyContent === 'string') {
        // Body é HTML, vamos usar Web Unlocker ou retornar vazio por enquanto
        console.log('⚠️  SERP API retornou HTML puro. Use Web Unlocker para parsing.')
        return []
      } else {
        parsedData = bodyContent
      }

      const results = parsedData.organic_results || []
      console.log(`✅ Encontrados ${results.length} resultados`)

      // Converter resultados para formato LinkedInJobData
      const jobs: LinkedInJobData[] = []

      for (const result of results) {
        // Extrair informações da vaga
        const job = this.parseJobFromSerpResult(result)
        if (job) {
          jobs.push(job)
        }
      }

      return jobs
    } catch (error) {
      console.error('❌ Erro ao buscar vagas via SERP API:', error)
      return []
    }
  }

  /**
   * Busca vagas em múltiplas fontes simultaneamente
   */
  async searchMultipleSources(
    query: string,
    location: string = 'São Paulo'
  ): Promise<LinkedInJobData[]> {
    const sources = [
      'linkedin.com/jobs',
      'gupy.io',
      'catho.com.br',
      'infojobs.com.br',
      'vagas.com.br',
    ]

    console.log(`🔍 Buscando vagas em ${sources.length} fontes...`)

    // Buscar em todas as fontes em paralelo
    const promises = sources.map(source => {
      const searchQuery = `${query} ${location}`
      return this.searchJobs(searchQuery, source, 10)
    })

    const results = await Promise.allSettled(promises)

    // Combinar todos os resultados
    const allJobs: LinkedInJobData[] = []

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ ${sources[index]}: ${result.value.length} vagas`)
        allJobs.push(...result.value)
      } else {
        console.error(`❌ ${sources[index]}: Erro`, result.reason)
      }
    })

    // Remover duplicatas por URL
    const uniqueJobs = this.removeDuplicates(allJobs)

    console.log(`📊 Total de vagas únicas: ${uniqueJobs.length}`)

    return uniqueJobs
  }

  /**
   * Converte resultado do SERP em LinkedInJobData
   */
  private parseJobFromSerpResult(result: any): LinkedInJobData | null {
    try {
      const title = result.title || ''
      const url = result.link || ''
      const snippet = result.snippet || ''

      // Extrair nome da empresa do snippet ou título
      const companyName = this.extractCompanyName(title, snippet)

      // Extrair localização do snippet
      const location = this.extractLocation(snippet)

      if (!title || !url || !companyName) {
        return null
      }

      return {
        jobTitle: title,
        companyName,
        location,
        description: snippet,
        postedDate: new Date().toISOString(),
        jobUrl: url,
        applicants: 0,
        cnpj: null,
      }
    } catch (error) {
      console.error('Erro ao parsear resultado SERP:', error)
      return null
    }
  }

  /**
   * Extrai nome da empresa do texto
   */
  private extractCompanyName(title: string, snippet: string): string {
    // Tentar extrair empresa do título (formato comum: "Vaga - Empresa")
    const dashMatch = title.match(/[-–—]\s*(.+?)$/i)
    if (dashMatch) {
      return dashMatch[1].trim()
    }

    // Tentar extrair do snippet
    const empresaMatch = snippet.match(/empresa[:\s]+([^.,]+)/i)
    if (empresaMatch) {
      return empresaMatch[1].trim()
    }

    // Padrão "Vaga na Empresa X"
    const naMatch = snippet.match(/na\s+([A-Z][a-zà-ú]+(?:\s+[A-Z][a-zà-ú]+)*)/i)
    if (naMatch) {
      return naMatch[1].trim()
    }

    return 'Empresa não identificada'
  }

  /**
   * Extrai localização do texto
   */
  private extractLocation(text: string): string {
    // Cidades comuns do Brasil
    const cities = [
      'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília',
      'Curitiba', 'Porto Alegre', 'Salvador', 'Fortaleza', 'Recife',
      'Campinas', 'Santos', 'Guarulhos'
    ]

    for (const city of cities) {
      if (text.includes(city)) {
        return city + ', Brasil'
      }
    }

    // Tentar extrair padrão "em Cidade"
    const locationMatch = text.match(/em\s+([A-Z][a-zà-ú]+(?:\s+[A-Z][a-zà-ú]+)*)/i)
    if (locationMatch) {
      return locationMatch[1] + ', Brasil'
    }

    return 'Brasil'
  }

  /**
   * Remove vagas duplicadas por URL
   */
  private removeDuplicates(jobs: LinkedInJobData[]): LinkedInJobData[] {
    const seen = new Set<string>()
    return jobs.filter(job => {
      const url = job.jobUrl.split('?')[0] // Remover query params
      if (seen.has(url)) {
        return false
      }
      seen.add(url)
      return true
    })
  }

  /**
   * Busca informações sobre uma empresa específica
   */
  async searchCompanyInfo(companyName: string): Promise<any> {
    const apiKey = this.getApiKey()

    if (!apiKey) {
      console.warn('BRIGHT_DATA_SERP_KEY não configurada')
      return null
    }

    try {
      const query = `${companyName} CNPJ faturamento "Receita Federal"`
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          zone: 'serp_api1',
          url: googleUrl,
          format: 'json',
        }),
      })

      if (!response.ok) {
        throw new Error(`SERP API error: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Erro ao buscar informações da empresa:', error)
      return null
    }
  }
}

export const serpApi = new SerpApiService()
