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
      console.log(' Conectando ao navegador Bright Data...')
      browser = await this.connectBrowser()
      page = await browser.newPage()

      // Construir URL de busca do LinkedIn
      const searchUrl = this.buildLinkedInSearchUrl(query, location, daysAgo)
      console.log(' Navegando para:', searchUrl)

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 })

      // Aguardar lista de vagas carregar
      // Tentar aguardar por diferentes containers de resultados
      try {
        await Promise.race([
          page.waitForSelector('.jobs-search__results-list', { timeout: 30000 }),
          page.waitForSelector('.scaffold-layout__list', { timeout: 30000 }),
          page.waitForSelector('[data-job-id]', { timeout: 30000 })
        ])
      } catch (error) {
        console.warn(' Timeout aguardando lista de vagas, tentando extrair mesmo assim...')
      }

      console.log(' Extraindo vagas da página...')

      // Extrair dados das vagas
      const jobs = await page.evaluate(() => {
        // Tentar múltiplos seletores (LinkedIn muda frequentemente)
        const possibleSelectors = [
          '.base-card',
          '.job-card-container',
          '.jobs-search-results__list-item',
          '[data-job-id]',
          '.scaffold-layout__list-item'
        ]

        let jobCards: NodeListOf<Element> | null = null
        for (const selector of possibleSelectors) {
          jobCards = document.querySelectorAll(selector)
          if (jobCards.length > 0) {
            console.log(` Usando seletor: ${selector} (${jobCards.length} cards encontrados)`)
            break
          }
        }

        if (!jobCards || jobCards.length === 0) {
          console.warn(' Nenhum card de vaga encontrado com seletores tradicionais')
          console.log(' Tentando fallback: buscar todos os links de vagas...')

          // Fallback: buscar todos os links que apontam para /jobs/view/
          const jobLinks = document.querySelectorAll('a[href*="/jobs/view/"]')
          console.log(`🔗 Encontrados ${jobLinks.length} links de vagas`)

          if (jobLinks.length === 0) {
            console.error(' Nenhuma vaga encontrada mesmo com fallback')
            return []
          }

          // Extrair dados dos links
          const fallbackResults: any[] = []
          jobLinks.forEach((link, index) => {
            try {
              const url = (link as HTMLAnchorElement).href
              const title = link.textContent?.trim() || link.getAttribute('aria-label') || ''

              // Tentar encontrar empresa no elemento pai
              const parent = link.closest('li, div[class*="job"]')
              let company = ''

              if (parent) {
                const companyElements = parent.querySelectorAll('h4, span[class*="company"], [class*="subtitle"]')
                for (const el of companyElements) {
                  const text = el.textContent?.trim() || ''
                  if (text && text !== title) {
                    company = text
                    break
                  }
                }
              }

              if (title && url) {
                fallbackResults.push({
                  jobTitle: title,
                  companyName: company || 'Empresa não identificada',
                  location: '',
                  jobUrl: url,
                  postedDate: new Date().toISOString().split('T')[0],
                })

                if (index < 3) {
                  console.log(`Fallback Card ${index + 1}:`, {
                    title: title.substring(0, 50),
                    company: company.substring(0, 30),
                    url: url.substring(0, 50)
                  })
                }
              }
            } catch (err) {
              console.error('Erro no fallback:', err)
            }
          })

          return fallbackResults
        }

        const results: any[] = []

        jobCards.forEach((card, index) => {
          try {
            // Múltiplos seletores para cada campo
            const titleSelectors = [
              '.base-search-card__title',
              '.job-card-list__title',
              'h3.base-search-card__title',
              'a[data-tracking-control-name*="job"]',
              '.job-card-container__link'
            ]

            const companySelectors = [
              '.base-search-card__subtitle',
              '.job-card-container__company-name',
              'h4.base-search-card__subtitle',
              '.job-card-container__primary-description'
            ]

            const locationSelectors = [
              '.job-search-card__location',
              '.job-card-container__metadata-item',
              '.artdeco-entity-lockup__caption'
            ]

            const linkSelectors = [
              'a.base-card__full-link',
              'a.job-card-list__title',
              'a[href*="/jobs/view/"]'
            ]

            // Encontrar elementos
            let titleElement: Element | null = null
            let companyElement: Element | null = null
            let locationElement: Element | null = null
            let linkElement: Element | null = null

            for (const sel of titleSelectors) {
              titleElement = card.querySelector(sel)
              if (titleElement) break
            }

            for (const sel of companySelectors) {
              companyElement = card.querySelector(sel)
              if (companyElement) break
            }

            for (const sel of locationSelectors) {
              locationElement = card.querySelector(sel)
              if (locationElement) break
            }

            for (const sel of linkSelectors) {
              linkElement = card.querySelector(sel)
              if (linkElement) break
            }

            const dateElement = card.querySelector('time')

            const title = titleElement?.textContent?.trim() || ''
            const company = companyElement?.textContent?.trim() || ''
            const location = locationElement?.textContent?.trim() || ''
            const url = linkElement?.getAttribute('href') || ''
            const postedDate = dateElement?.getAttribute('datetime') || new Date().toISOString().split('T')[0]

            // Debug: logar o que foi encontrado
            if (index < 3) {
              console.log(`Card ${index + 1}:`, {
                title: title.substring(0, 50),
                company: company.substring(0, 30),
                url: url.substring(0, 50),
                foundTitle: !!titleElement,
                foundCompany: !!companyElement
              })
            }

            if (title && company && url) {
              results.push({
                jobTitle: title,
                companyName: company,
                location,
                jobUrl: url,
                postedDate,
              })
            } else {
              console.warn(`Card ${index + 1} incompleto: title=${!!title}, company=${!!company}, url=${!!url}`)
            }
          } catch (err) {
            console.error('Erro ao processar card de vaga:', err)
          }
        })

        return results
      })

      console.log(` Encontradas ${jobs.length} vagas`)

      // Converter para formato LinkedInJobData
      const linkedInJobs: LinkedInJobData[] = jobs.map((job) => ({
        jobTitle: job.jobTitle,
        companyName: job.companyName,
        location: job.location,
        description: '', // Será preenchido em getJobDetails se necessário
        postedDate: job.postedDate,
        jobUrl: job.jobUrl,
        candidateCount: 0, // Não disponível na listagem
        jobSource: 'LinkedIn',
      }))

      return linkedInJobs
    } catch (error) {
      console.error(' Erro ao buscar vagas no LinkedIn:', error)
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
      console.log(' Extraindo detalhes da vaga:', jobUrl)
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
        const candidateCount = applicantsMatch ? parseInt(applicantsMatch[1]) : 0

        return {
          jobTitle: title,
          companyName: company,
          location,
          description,
          candidateCount,
        }
      })

      return {
        ...jobDetails,
        jobUrl,
        postedDate: new Date(),
        jobSource: 'LinkedIn',
      }
    } catch (error) {
      console.error(' Erro ao extrair detalhes da vaga:', error)
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
