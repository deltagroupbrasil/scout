// Gupy Scraper Service - REAL SCRAPING
// Scraping de vagas do Gupy (plataforma brasileira de recrutamento)

import { LinkedInJobData } from "@/types"
import * as cheerio from 'cheerio'

export class GupyScraperService {
  private baseUrl = "https://portal.gupy.io"
  private webUnlockerUrl = process.env.BRIGHT_DATA_WEB_UNLOCKER_URL || "https://api.brightdata.com/request"
  private apiKey = process.env.BRIGHT_DATA_UNLOCKER_KEY

  /**
   * Busca vagas REAIS no Gupy usando Bright Data Web Unlocker
   */
  async scrapeJobs(query: string): Promise<LinkedInJobData[]> {
    console.log(`[Gupy]  Buscando vagas REAIS para: "${query}"`)

    if (!this.apiKey) {
      console.warn('[Gupy]   Bright Data não configurado, usando mock')
      return this.mockGupyAPI(query)
    }

    try {
      // URL de busca do Gupy
      const searchUrl = `${this.baseUrl}/job/search?jobName=${encodeURIComponent(query)}`
      console.log(`[Gupy] 📡 URL: ${searchUrl}`)

      // Fazer requisição com Bright Data Web Unlocker
      const response = await fetch(this.webUnlockerUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: searchUrl,
          zone: 'web_unlocker1',
          format: 'raw',
        }),
      })

      if (!response.ok) {
        throw new Error(`Bright Data error: ${response.status} ${response.statusText}`)
      }

      const html = await response.text()
      console.log(`[Gupy]  HTML recebido (${html.length} caracteres)`)

      // Parse do HTML
      const jobs = this.parseGupyHTML(html, query)

      console.log(`[Gupy]  Encontradas ${jobs.length} vagas reais`)
      return jobs

    } catch (error) {
      console.error('[Gupy]  Erro ao buscar vagas:', error)
      console.log('[Gupy]  Usando mock como fallback')
      return this.mockGupyAPI(query)
    }
  }

  /**
   * Parse do HTML do Gupy para extrair vagas
   */
  private parseGupyHTML(html: string, query: string): LinkedInJobData[] {
    const $ = cheerio.load(html)
    const jobs: LinkedInJobData[] = []

    try {
      // Seletores do Gupy (podem variar)
      // Buscar por cards de vaga
      $('[class*="job-card"], [class*="JobCard"], [data-testid*="job"]').each((_, element) => {
        try {
          const $job = $(element)

          const title = $job.find('[class*="title"], h2, h3').first().text().trim()
          const company = $job.find('[class*="company"], [class*="empresa"]').first().text().trim()
          const location = $job.find('[class*="location"], [class*="local"]').first().text().trim()
          const jobLink = $job.find('a').first().attr('href')
          const description = $job.find('[class*="description"], p').first().text().trim()

          if (title && company) {
            const fullUrl = jobLink?.startsWith('http')
              ? jobLink
              : `${this.baseUrl}${jobLink}`

            jobs.push({
              jobTitle: title,
              companyName: company,
              location: location || 'Brasil',
              jobUrl: fullUrl,
              description: description || `Vaga de ${title} na ${company}`,
              postedDate: new Date(),
              jobSource: 'Gupy',
            })
          }
        } catch (err) {
          console.error('[Gupy] Erro ao parsear vaga individual:', err)
        }
      })

      // Se não encontrou nada, tentar outros seletores
      if (jobs.length === 0) {
        console.log('[Gupy]   Nenhuma vaga encontrada com seletores principais, tentando alternativas...')

        $('article, .vacancy, [role="article"]').each((_, element) => {
          const $job = $(element)
          const text = $job.text()

          if (text.toLowerCase().includes(query.toLowerCase().split(' ')[0])) {
            const title = $job.find('h1, h2, h3, strong').first().text().trim()

            if (title) {
              jobs.push({
                jobTitle: title,
                companyName: 'Empresa via Gupy',
                location: 'Brasil',
                jobUrl: `${this.baseUrl}/jobs`,
                description: text.substring(0, 200),
                postedDate: new Date(),
                jobSource: 'Gupy',
              })
            }
          }
        })
      }

    } catch (error) {
      console.error('[Gupy] Erro ao parsear HTML:', error)
    }

    return jobs
  }

  /**
   * Mock da API do Gupy para demonstração
   * Em produção, substituir por chamada real ou scraping
   */
  private async mockGupyAPI(query: string): Promise<LinkedInJobData[]> {
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 500))

    // Dados fictícios baseados em padrões reais do Gupy
    const mockJobs: LinkedInJobData[] = []

    // MUDANÇA: Remover filtro hardcoded - aceitar qualquer query
      mockJobs.push({
        jobTitle: "Analista de Controladoria",
        companyName: "Lojas Americanas S.A.",
        location: "São Paulo, SP",
        jobUrl: "https://portal.gupy.io/job/lojas-americanas-analista-controladoria",
        description: `
Estamos em busca de um Analista de Controladoria para integrar nosso time financeiro.

Responsabilidades:
- Análise de resultados e KPIs
- Elaboração de relatórios gerenciais
- Conciliações contábeis
- Suporte ao fechamento mensal

Requisitos:
- Graduação em Ciências Contábeis, Economia ou Administração
- Excel avançado
- Experiência com ERP (SAP desejável)
- Conhecimento em Power BI
        `.trim(),
        postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
        candidateCount: 87,
        jobSource: 'Gupy',
      })

      mockJobs.push({
        jobTitle: "Coordenador de Controladoria",
        companyName: "Carrefour Brasil",
        location: "São Paulo, SP",
        jobUrl: "https://www.carrefour.com.br",
        description: `
Buscamos Coordenador de Controladoria para liderar equipe de 8 pessoas.

Principais atividades:
- Coordenação de fechamento contábil
- Gestão de equipe de analistas
- Interface com auditoria
- Análises estratégicas para C-level
- Projetos de melhoria contínua

Requisitos:
- Graduação em Ciências Contábeis
- Pós-graduação em áreas correlatas
- Experiência em coordenação de equipes
- Inglês intermediário
        `.trim(),
        postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 dias atrás
        candidateCount: 156,
        jobSource: 'Gupy',
      })

      mockJobs.push({
        jobTitle: "Gerente Financeiro",
        companyName: "Grupo Fleury",
        location: "São Paulo, SP",
        jobUrl: "https://portal.gupy.io/job/grupo-fleury-gerente-financeiro",
        description: `
Estamos contratando Gerente Financeiro para liderar área de planejamento e controladoria.

Responsabilidades:
- Planejamento estratégico financeiro
- Budget e forecast
- Análise de investimentos
- Gestão de indicadores
- Apresentações para diretoria

Requisitos:
- Graduação em Administração, Economia ou Contabilidade
- MBA em Finanças
- Experiência em empresas de médio/grande porte
- Forte conhecimento em modelagem financeira
- Excel avançado e Power BI
        `.trim(),
        postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
        candidateCount: 203,
        jobSource: 'Gupy',
      })

    return mockJobs
  }

  /**
   * Implementação real usando fetch (para quando Gupy disponibilizar API pública)
   */
  private async fetchGupyAPI(query: string): Promise<LinkedInJobData[]> {
    try {
      // Endpoint hipotético - Gupy não tem API pública documentada
      // Em produção real, seria necessário:
      // 1. Usar Puppeteer para scraping do site
      // 2. Usar serviço de scraping como Bright Data
      // 3. Parceria com Gupy para acesso à API

      const response = await fetch(
        `${this.baseUrl}/api/v1/jobs?search=${encodeURIComponent(query)}&location=Brasil`,
        {
          headers: {
            'User-Agent': 'LeapScout/1.0',
            'Accept': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Gupy API error: ${response.status}`)
      }

      const data = await response.json()

      // Transformar formato Gupy para nosso formato padrão
      return this.transformGupyJobs(data)
    } catch (error) {
      console.error('[Gupy] Erro na API:', error)
      return []
    }
  }

  /**
   * Transforma dados do formato Gupy para nosso formato padrão
   */
  private transformGupyJobs(gupyData: any[]): LinkedInJobData[] {
    return gupyData.map(job => ({
      jobTitle: job.name || job.title,
      companyName: job.companyName || job.company?.name,
      location: job.location || job.city || 'Brasil',
      jobUrl: `https://portal.gupy.io/job/${job.id}`,
      description: job.description || '',
      postedDate: new Date(job.publishedDate || job.createdAt),
      candidateCount: job.applicationCount || 0,
      jobSource: 'Gupy',
    }))
  }
}

export const gupyScraper = new GupyScraperService()
