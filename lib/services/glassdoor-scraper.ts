// Glassdoor Brasil Scraper usando Bright Data Web Unlocker
import { LinkedInJobData } from "@/types"
import * as cheerio from 'cheerio'

export class GlassdoorScraperService {
  private baseUrl = "https://www.glassdoor.com.br"
  private webUnlockerUrl = process.env.BRIGHT_DATA_WEB_UNLOCKER_URL || "https://api.brightdata.com/request"
  private apiKey = process.env.BRIGHT_DATA_UNLOCKER_KEY

  async scrapeJobs(query: string, location: string = "Brasil"): Promise<LinkedInJobData[]> {
    console.log(`[Glassdoor] Buscando vagas para: "${query}" em ${location}`)

    if (!this.apiKey) {
      console.warn('[Glassdoor]   Bright Data Web Unlocker não configurado, retornando mock')
      return this.mockGlassdoorJobs(query)
    }

    try {
      // Construir URL de busca do Glassdoor Brasil
      const searchUrl = `${this.baseUrl}/Vaga/vagas.htm?sc.keyword=${encodeURIComponent(query)}&locT=N&locId=&jobType=`

      console.log(`[Glassdoor] URL: ${searchUrl}`)

      // Usar Bright Data Web Unlocker
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
      const jobs = this.parseGlassdoorHTML(html)

      console.log(`[Glassdoor] Encontradas ${jobs.length} vagas`)
      return jobs

    } catch (error) {
      console.error('[Glassdoor] Erro ao buscar vagas:', error)
      console.log('[Glassdoor] Usando dados mock como fallback')
      return this.mockGlassdoorJobs(query)
    }
  }

  /**
   * Parse do HTML do Glassdoor
   */
  private parseGlassdoorHTML(html: string): LinkedInJobData[] {
    const $ = cheerio.load(html)
    const jobs: LinkedInJobData[] = []

    // Seletores do Glassdoor (podem mudar)
    $('li[data-test="jobListing"], .react-job-listing').each((_, element) => {
      try {
        const $job = $(element)

        const title = $job.find('a[data-test="job-link"], .jobTitle').text().trim()
        const company = $job.find('[data-test="employer-name"], .employerName').text().trim()
        const location = $job.find('[data-test="emp-location"], .location').text().trim()
        const jobId = $job.find('a[data-test="job-link"]').attr('href')?.match(/jobListingId=(\d+)/)?.[1]
        const snippet = $job.find('.jobDescriptionContent, .desc').text().trim()

        if (title && company && jobId) {
          jobs.push({
            jobTitle: title,
            companyName: company,
            location: location || 'Brasil',
            jobUrl: `https://www.glassdoor.com.br/Vaga/-JV_KO0,0_KE1,1.htm?jl=${jobId}`,
            description: snippet || 'Veja detalhes no Glassdoor',
            postedDate: new Date(),
            jobSource: 'Glassdoor',
          })
        }
      } catch (error) {
        console.error('[Glassdoor] Erro ao parsear vaga:', error)
      }
    })

    return jobs
  }

  /**
   * Mock de vagas do Glassdoor
   */
  private mockGlassdoorJobs(query: string): LinkedInJobData[] {
    // MUDANÇA: Remover filtro hardcoded - aceitar qualquer query
    return [
      {
        jobTitle: "Analista de Controladoria Sênior",
        companyName: "Ambev",
        location: "São Paulo, SP",
        jobUrl: "https://www.glassdoor.com.br/Vaga/-JV_KO0,0_KE1,1.htm?jl=mock1",
        description: "Analista Sênior para atuar em controladoria. Empresa com ótima avaliação no Glassdoor (4.2 estrelas).",
        postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        jobSource: 'Glassdoor',
      },
      {
        jobTitle: "Coordenador Financeiro",
        companyName: "Natura",
        location: "São Paulo, SP",
        jobUrl: "https://www.glassdoor.com.br/Vaga/-JV_KO0,0_KE1,1.htm?jl=mock2",
        description: "Coordenador Financeiro para área de planejamento. Empresa premiada como Great Place to Work.",
        postedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        jobSource: 'Glassdoor',
      },
    ]
  }
}

export const glassdoorScraper = new GlassdoorScraperService()
