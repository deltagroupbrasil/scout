// LinkedIn Scraper Service usando Bright Data Puppeteer
import puppeteer, { Browser, Page } from 'puppeteer-core'
import { LinkedInJobData } from '@/types'

export class LinkedInScraperService {
  /**
   * Obtém a URL do WebSocket (lazy initialization)
   */
  private getBrowserWSEndpoint(): string {
    return process.env.BRIGHT_DATA_PUPPETEER_URL || ''
  }

  /**
   * Conecta ao navegador remoto da Bright Data
   */
  private async connectBrowser(): Promise<Browser> {
    const browserWSEndpoint = this.getBrowserWSEndpoint()

    if (!browserWSEndpoint) {
      throw new Error('BRIGHT_DATA_PUPPETEER_URL não configurada')
    }

    try {
      const browser = await puppeteer.connect({
        browserWSEndpoint,
      })
      return browser
    } catch (error) {
      console.error('Erro ao conectar ao navegador Bright Data:', error)
      throw error
    }
  }

  /**
   * Busca vagas no LinkedIn via Puppeteer
   * @param query - Termos de busca (ex: "Controller OR CFO OR Controladoria")
   * @param location - Localização (ex: "São Paulo, Brazil")
   * @param daysAgo - Vagas publicadas nos últimos X dias
   */
  async searchJobs(
    query: string,
    location: string = 'São Paulo, Brazil',
    daysAgo: number = 1
  ): Promise<LinkedInJobData[]> {
    const browserWSEndpoint = this.getBrowserWSEndpoint()

    if (!browserWSEndpoint) {
      console.warn('BRIGHT_DATA_PUPPETEER_URL não configurada')
      return []
    }

    let browser: Browser | null = null
    let page: Page | null = null

    try {
      console.log('🔍 Conectando ao navegador Bright Data...')
      browser = await this.connectBrowser()
      page = await browser.newPage()

      // Construir URL de busca do LinkedIn
      const searchUrl = this.buildLinkedInSearchUrl(query, location, daysAgo)
      console.log('🌐 Navegando para:', searchUrl)

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 })

      // Aguardar lista de vagas carregar
      await page.waitForSelector('.jobs-search__results-list', { timeout: 30000 })

      console.log('📊 Extraindo vagas da página...')

      // Extrair dados das vagas
      const jobs = await page.evaluate(() => {
        const jobCards = document.querySelectorAll('.base-card')
        const results: any[] = []

        jobCards.forEach((card) => {
          try {
            const titleElement = card.querySelector('.base-search-card__title')
            const companyElement = card.querySelector('.base-search-card__subtitle')
            const locationElement = card.querySelector('.job-search-card__location')
            const linkElement = card.querySelector('a.base-card__full-link')
            const dateElement = card.querySelector('time')

            const title = titleElement?.textContent?.trim() || ''
            const company = companyElement?.textContent?.trim() || ''
            const location = locationElement?.textContent?.trim() || ''
            const url = linkElement?.getAttribute('href') || ''
            const postedDate = dateElement?.getAttribute('datetime') || ''

            if (title && company && url) {
              results.push({
                jobTitle: title,
                companyName: company,
                location,
                jobUrl: url,
                postedDate,
              })
            }
          } catch (err) {
            console.error('Erro ao processar card de vaga:', err)
          }
        })

        return results
      })

      console.log(`✅ Encontradas ${jobs.length} vagas`)

      // Converter para formato LinkedInJobData
      const linkedInJobs: LinkedInJobData[] = jobs.map((job) => ({
        jobTitle: job.jobTitle,
        companyName: job.companyName,
        location: job.location,
        description: '', // Será preenchido em getJobDetails se necessário
        postedDate: job.postedDate,
        jobUrl: job.jobUrl,
        applicants: 0, // Não disponível na listagem
        cnpj: null, // Será extraído posteriormente
      }))

      return linkedInJobs
    } catch (error) {
      console.error('❌ Erro ao buscar vagas no LinkedIn:', error)
      throw error
    } finally {
      // Fechar navegador
      if (page) await page.close()
      if (browser) await browser.disconnect()
    }
  }

  /**
   * Extrai informações detalhadas de uma vaga específica
   */
  async getJobDetails(jobUrl: string): Promise<LinkedInJobData | null> {
    const browserWSEndpoint = this.getBrowserWSEndpoint()

    if (!browserWSEndpoint) {
      console.warn('BRIGHT_DATA_PUPPETEER_URL não configurada')
      return null
    }

    let browser: Browser | null = null
    let page: Page | null = null

    try {
      console.log('🔍 Extraindo detalhes da vaga:', jobUrl)
      browser = await this.connectBrowser()
      page = await browser.newPage()

      await page.goto(jobUrl, { waitUntil: 'networkidle2', timeout: 60000 })

      // Aguardar conteúdo da vaga carregar
      await page.waitForSelector('.show-more-less-html__markup', { timeout: 30000 })

      // Extrair detalhes completos
      const jobDetails = await page.evaluate(() => {
        const title = document.querySelector('.top-card-layout__title')?.textContent?.trim() || ''
        const company = document.querySelector('.topcard__org-name-link')?.textContent?.trim() || ''
        const location = document.querySelector('.topcard__flavor--bullet')?.textContent?.trim() || ''
        const description = document.querySelector('.show-more-less-html__markup')?.textContent?.trim() || ''

        // Tentar extrair número de candidatos
        const applicantsText = document.querySelector('.num-applicants__caption')?.textContent?.trim() || ''
        const applicantsMatch = applicantsText.match(/(\d+)/)
        const applicants = applicantsMatch ? parseInt(applicantsMatch[1]) : 0

        return {
          jobTitle: title,
          companyName: company,
          location,
          description,
          applicants,
        }
      })

      return {
        ...jobDetails,
        jobUrl,
        postedDate: new Date().toISOString(),
        cnpj: null,
      }
    } catch (error) {
      console.error('❌ Erro ao extrair detalhes da vaga:', error)
      return null
    } finally {
      if (page) await page.close()
      if (browser) await browser.disconnect()
    }
  }

  /**
   * Constrói URL de busca do LinkedIn
   */
  private buildLinkedInSearchUrl(query: string, location: string, daysAgo: number): string {
    const baseUrl = 'https://www.linkedin.com/jobs/search/'
    const params = new URLSearchParams({
      keywords: query,
      location: location,
      f_TPR: `r${daysAgo * 86400}`, // Tempo em segundos
      position: '1',
      pageNum: '0',
    })

    return `${baseUrl}?${params.toString()}`
  }

  /**
   * Extrai CNPJ da descrição da vaga ou da página da empresa
   */
  async extractCNPJ(companyName: string, jobDescription: string): Promise<string | null> {
    // Regex para CNPJ (XX.XXX.XXX/XXXX-XX ou XXXXXXXXXXXXXX)
    const cnpjRegex = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{14}/g

    // Tentar encontrar na descrição
    const matches = jobDescription.match(cnpjRegex)
    if (matches && matches.length > 0) {
      return matches[0].replace(/\D/g, '') // Remover formatação
    }

    // TODO: Implementar busca do CNPJ via Receita Federal ou outros meios
    console.log(`CNPJ não encontrado para ${companyName}`)
    return null
  }
}

export const linkedInScraper = new LinkedInScraperService()
