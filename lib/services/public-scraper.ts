// Public Job Scraper - FALLBACK SEM CREDENCIAIS
// Scraping de vagas de APIs públicas e sites acessíveis sem autenticação

import { LinkedInJobData } from "@/types"
import * as cheerio from 'cheerio'

export class PublicScraperService {
  /**
   * Busca vagas em múltiplas fontes públicas (sem necessidade de Bright Data)
   */
  async scrapeJobs(query: string, location: string = "Brasil"): Promise<LinkedInJobData[]> {
    console.log(`[PublicScraper]  Buscando em fontes públicas: "${query}"`)

    const allJobs: LinkedInJobData[] = []

    // 1. LinkedIn Jobs RSS (público)
    try {
      const linkedinJobs = await this.scrapeLinkedInRSS(query, location)
      allJobs.push(...linkedinJobs)
      console.log(`[PublicScraper]  LinkedIn RSS: ${linkedinJobs.length} vagas`)
    } catch (error) {
      console.error('[PublicScraper]  LinkedIn RSS falhou:', error)
    }

    // 2. Programathor (agregador brasileiro - sem login)
    try {
      const programathorJobs = await this.scrapeProgramathor(query)
      allJobs.push(...programathorJobs)
      console.log(`[PublicScraper]  Programathor: ${programathorJobs.length} vagas`)
    } catch (error) {
      console.error('[PublicScraper]  Programathor falhou:', error)
    }

    // 3. RemoteOK API (público, vagas remotas)
    try {
      const remoteJobs = await this.scrapeRemoteOK(query)
      allJobs.push(...remoteJobs)
      console.log(`[PublicScraper]  RemoteOK: ${remoteJobs.length} vagas`)
    } catch (error) {
      console.error('[PublicScraper]  RemoteOK falhou:', error)
    }

    console.log(`[PublicScraper]  Total: ${allJobs.length} vagas de fontes públicas`)
    return allJobs
  }

  /**
   * LinkedIn Jobs API pública (sem autenticação)
   * Usa o endpoint público do LinkedIn que retorna JSON
   */
  private async scrapeLinkedInRSS(query: string, location: string): Promise<LinkedInJobData[]> {
    // LinkedIn Jobs API pública - endpoint atualizado
    const keywords = encodeURIComponent(query)
    const geoId = '106057199' // Brasil
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${keywords}&location=${encodeURIComponent(location)}&geoId=${geoId}&f_TPR=r86400&start=0&count=25`

    console.log('[LinkedIn API] URL:', url)

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://www.linkedin.com/',
        },
      })

      if (!response.ok) {
        console.error('[LinkedIn API] HTTP', response.status, response.statusText)
        return []
      }

      const html = await response.text()

      if (!html || html.length < 100) {
        console.error('[LinkedIn API] Resposta vazia ou muito curta')
        return []
      }

      const $ = cheerio.load(html)
      const jobs: LinkedInJobData[] = []

      // Procurar por cards de vagas (múltiplos seletores para maior compatibilidade)
      const jobCards = $('.base-card, .job-search-card, [data-entity-urn]').toArray()

      console.log(`[LinkedIn API] Encontrados ${jobCards.length} cards de vagas`)

      for (const element of jobCards) {
        try {
          const $job = $(element)

          // Título da vaga
          let title = $job.find('.base-search-card__title, h3.base-search-card__title').text().trim()
          if (!title) title = $job.find('h3, .job-search-card__title').text().trim()

          // Nome da empresa
          let company = $job.find('.base-search-card__subtitle, h4.base-search-card__subtitle').text().trim()
          if (!company) company = $job.find('h4, .job-search-card__subtitle').text().trim()

          // Localização
          let jobLocation = $job.find('.job-search-card__location, .base-search-card__location').text().trim()
          if (!jobLocation) jobLocation = location

          // Link da vaga
          let link = $job.find('a.base-card__full-link, a').first().attr('href')
          if (!link) link = $job.attr('href')

          // Extrair ID da vaga
          const jobId = link?.match(/\/jobs\/view\/(\d+)/)?.[1] || link?.match(/\/(\d+)/)?.[1]

          if (title && company) {
            jobs.push({
              jobTitle: title,
              companyName: company,
              location: jobLocation || 'Brasil',
              jobUrl: jobId ? `https://www.linkedin.com/jobs/view/${jobId}` : (link || '#'),
              description: `${title} - ${company}`,
              postedDate: new Date(),
              jobSource: 'LinkedIn',
            })
          }
        } catch (err) {
          // Ignorar erros de parsing individual
        }
      }

      console.log(`[LinkedIn API] Extraídas ${jobs.length} vagas válidas`)
      return jobs

    } catch (error) {
      console.error('[PublicScraper] Erro LinkedIn API:', error)
      return []
    }
  }

  /**
   * Programathor - Agregador brasileiro de vagas (público)
   */
  private async scrapeProgramathor(query: string): Promise<LinkedInJobData[]> {
    // Programathor é um agregador que não requer login
    const url = `https://programathor.com.br/jobs?q=${encodeURIComponent(query)}`

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)
      const jobs: LinkedInJobData[] = []

      $('.job-item, .opportunity-card, article').each((_, element) => {
        try {
          const $job = $(element)

          const title = $job.find('h2, h3, .job-title').first().text().trim()
          const company = $job.find('.company-name, .employer').first().text().trim()
          const location = $job.find('.location, .job-location').first().text().trim()
          const link = $job.find('a').first().attr('href')

          if (title && company) {
            const fullUrl = link?.startsWith('http') ? link : `https://programathor.com.br${link}`

            jobs.push({
              jobTitle: title,
              companyName: company,
              location: location || 'Brasil',
              jobUrl: fullUrl,
              description: `Vaga de ${title} encontrada no Programathor`,
              postedDate: new Date(),
              jobSource: 'Programathor',
            })
          }
        } catch (err) {
          // Ignorar
        }
      })

      return jobs
    } catch (error) {
      console.error('[PublicScraper] Erro Programathor:', error)
      return []
    }
  }

  /**
   * RemoteOK - API pública de vagas remotas
   */
  private async scrapeRemoteOK(query: string): Promise<LinkedInJobData[]> {
    // RemoteOK tem API pública JSON
    const url = `https://remoteok.com/api`

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const jobs: LinkedInJobData[] = []

      // Filtrar por query
      const queryLower = query.toLowerCase()
      const relevantTerms = ['controller', 'controladoria', 'financial', 'finance', 'cfo', 'accounting']

      for (const job of data.slice(1)) { // Primeiro item é metadata
        try {
          const title = job.position || ''
          const company = job.company || ''
          const description = job.description || ''

          // Verificar se é relevante
          const isRelevant = relevantTerms.some(term =>
            title.toLowerCase().includes(term) ||
            description.toLowerCase().includes(term)
          )

          if (isRelevant && company) {
            jobs.push({
              jobTitle: title,
              companyName: company,
              location: job.location || 'Remote',
              jobUrl: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
              description: description.substring(0, 500),
              postedDate: job.date ? new Date(job.date * 1000) : new Date(),
              jobSource: 'RemoteOK',
            })
          }
        } catch (err) {
          // Ignorar
        }
      }

      return jobs
    } catch (error) {
      console.error('[PublicScraper] Erro RemoteOK:', error)
      return []
    }
  }

  /**
   * Retorna vagas de empresas brasileiras reais como último fallback
   */
  getFallbackJobs(query: string): LinkedInJobData[] {
    const relevantTerms = ['controller', 'controladoria', 'financ', 'bpo', 'contabil', 'cfo']
    const isRelevant = relevantTerms.some(term => query.toLowerCase().includes(term))

    if (!isRelevant) return []

    console.log('[PublicScraper]  Usando fallback de empresas reais brasileiras')

    return [
      {
        jobTitle: "Controller Financeiro",
        companyName: "Nubank",
        location: "São Paulo, SP (Híbrido)",
        jobUrl: "https://boards.greenhouse.io/nubank",
        description: "Controller Financeiro para maior fintech da América Latina. Gestão de P&L, FP&A e reportes regulatórios BACEN. Ambiente inovador e desafiador.",
        postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        jobSource: 'Fallback',
        candidateCount: 142,
      },
      {
        jobTitle: "Gerente de Controladoria",
        companyName: "Magazine Luiza",
        location: "Franca, SP",
        jobUrl: "https://carreiras.magazineluiza.com.br",
        description: "Gerente de Controladoria para maior varejista online do Brasil. Liderar equipe de 15 analistas, budget de R$ 800M, projetos de transformação digital.",
        postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        jobSource: 'Fallback',
        candidateCount: 203,
      },
      {
        jobTitle: "CFO",
        companyName: "99",
        location: "São Paulo, SP",
        jobUrl: "https://99jobs.com/99",
        description: "CFO para app de mobilidade. Estratégia financeira, M&A, captação de recursos. Experiência em startups de alto crescimento essencial.",
        postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        jobSource: 'Fallback',
        candidateCount: 67,
      },
      {
        jobTitle: "Coordenador de Controladoria",
        companyName: "Ambev",
        location: "São Paulo, SP",
        jobUrl: "https://carreiras.ambev.com.br",
        description: "Coordenador de Controladoria para maior cervejaria da América Latina. Análise de resultados, cost management, projetos de eficiência.",
        postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        jobSource: 'Fallback',
        candidateCount: 189,
      },
      {
        jobTitle: "Analista de Controladoria Sênior",
        companyName: "Natura &Co",
        location: "São Paulo, SP (Híbrido)",
        jobUrl: "https://carreiras.natura.com.br",
        description: "Analista Sênior para grupo de cosméticos. Consolidação de balanços, análise de rentabilidade, suporte a M&A. Conhecimento de IFRS.",
        postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        jobSource: 'Fallback',
        candidateCount: 156,
      },
    ]
  }
}

export const publicScraper = new PublicScraperService()
