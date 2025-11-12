/**
 * Web Unlocker Service - Bright Data
 *
 * Faz requisições HTTP através de proxies da Bright Data
 * Bypassa bloqueios, CAPTCHAs e proteções anti-bot
 * Ideal para scraping de sites como Gupy, Catho, InfoJobs
 */

import { LinkedInJobData } from '@/types'
import * as cheerio from 'cheerio'

export class WebUnlockerService {
  private apiUrl = 'https://api.brightdata.com/request'

  private getApiKey(): string {
    return process.env.BRIGHT_DATA_UNLOCKER_KEY || ''
  }

  /**
   * Faz requisição HTTP através do Web Unlocker
   * @param url - URL para acessar
   * @returns HTML da página
   */
  async fetchPage(url: string): Promise<string> {
    const apiKey = this.getApiKey()

    if (!apiKey) {
      throw new Error('BRIGHT_DATA_UNLOCKER_KEY não configurada')
    }

    try {
      console.log(`🔓 Acessando via Web Unlocker: ${url}`)

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          zone: 'web_unlocker1',
          url,
          format: 'raw', // Retornar HTML puro
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Web Unlocker error: ${response.status}\n${errorText}`)
      }

      const data = await response.json()

      // A resposta vem com estrutura: { status_code, headers, body }
      const html = data.body || ''

      console.log(`✅ Página carregada: ${html.length} caracteres`)

      return html
    } catch (error) {
      console.error('❌ Erro no Web Unlocker:', error)
      throw error
    }
  }

  /**
   * Busca vagas no Gupy
   */
  async scrapeGupyJobs(query: string): Promise<LinkedInJobData[]> {
    try {
      // URL de busca do Gupy
      const searchUrl = `https://portal.gupy.io/job-search/term=${encodeURIComponent(query)}`

      const html = await this.fetchPage(searchUrl)
      const $ = cheerio.load(html)

      const jobs: LinkedInJobData[] = []

      // Seletores do Gupy (podem precisar de ajuste)
      $('.sc-bdnxRM').each((_, element) => {
        try {
          const $el = $(element)

          const title = $el.find('.sc-beySPh').text().trim()
          const company = $el.find('.sc-crrsfI').text().trim()
          const location = $el.find('.sc-hKwDye').text().trim()
          const url = $el.find('a').attr('href') || ''

          if (title && company) {
            jobs.push({
              jobTitle: title,
              companyName: company,
              location: location || 'Brasil',
              description: '',
              postedDate: new Date().toISOString(),
              jobUrl: url.startsWith('http') ? url : `https://portal.gupy.io${url}`,
              applicants: 0,
              cnpj: null,
            })
          }
        } catch (err) {
          console.error('Erro ao processar vaga do Gupy:', err)
        }
      })

      console.log(`📊 Gupy: ${jobs.length} vagas encontradas`)

      return jobs
    } catch (error) {
      console.error('❌ Erro ao buscar vagas no Gupy:', error)
      return []
    }
  }

  /**
   * Busca vagas no Catho
   */
  async scrapeCathoJobs(query: string, location: string = 'São Paulo'): Promise<LinkedInJobData[]> {
    try {
      // URL de busca do Catho
      const searchUrl = `https://www.catho.com.br/vagas/${encodeURIComponent(query)}/?cidade=${encodeURIComponent(location)}`

      const html = await this.fetchPage(searchUrl)
      const $ = cheerio.load(html)

      const jobs: LinkedInJobData[]  = []

      // Seletores do Catho (podem precisar de ajuste)
      $('article[data-testid="job-card"]').each((_, element) => {
        try {
          const $el = $(element)

          const title = $el.find('h2').text().trim()
          const company = $el.find('[data-testid="company-name"]').text().trim()
          const loc = $el.find('[data-testid="job-location"]').text().trim()
          const url = $el.find('a').attr('href') || ''

          if (title && company) {
            jobs.push({
              jobTitle: title,
              companyName: company,
              location: loc || location,
              description: '',
              postedDate: new Date().toISOString(),
              jobUrl: url.startsWith('http') ? url : `https://www.catho.com.br${url}`,
              applicants: 0,
              cnpj: null,
            })
          }
        } catch (err) {
          console.error('Erro ao processar vaga do Catho:', err)
        }
      })

      console.log(`📊 Catho: ${jobs.length} vagas encontradas`)

      return jobs
    } catch (error) {
      console.error('❌ Erro ao buscar vagas no Catho:', error)
      return []
    }
  }

  /**
   * Busca vagas no InfoJobs
   */
  async scrapeInfoJobsJobs(query: string, location: string = 'São Paulo'): Promise<LinkedInJobData[]> {
    try {
      // URL de busca do InfoJobs
      const searchUrl = `https://www.infojobs.com.br/empregos.aspx?palabra=${encodeURIComponent(query)}&provincia=${encodeURIComponent(location)}`

      const html = await this.fetchPage(searchUrl)
      const $ = cheerio.load(html)

      const jobs: LinkedInJobData[] = []

      // Seletores do InfoJobs (podem precisar de ajuste)
      $('.elemento-lista-sjl').each((_, element) => {
        try {
          const $el = $(element)

          const title = $el.find('.js-o-link').text().trim()
          const company = $el.find('.company-name').text().trim()
          const loc = $el.find('.job-location').text().trim()
          const url = $el.find('.js-o-link').attr('href') || ''

          if (title && company) {
            jobs.push({
              jobTitle: title,
              companyName: company,
              location: loc || location,
              description: '',
              postedDate: new Date().toISOString(),
              jobUrl: url.startsWith('http') ? url : `https://www.infojobs.com.br${url}`,
              applicants: 0,
              cnpj: null,
            })
          }
        } catch (err) {
          console.error('Erro ao processar vaga do InfoJobs:', err)
        }
      })

      console.log(`📊 InfoJobs: ${jobs.length} vagas encontradas`)

      return jobs
    } catch (error) {
      console.error('❌ Erro ao buscar vagas no InfoJobs:', error)
      return []
    }
  }

  /**
   * Busca vagas em múltiplas plataformas brasileiras
   */
  async scrapeAllBrazilianSources(
    query: string,
    location: string = 'São Paulo'
  ): Promise<LinkedInJobData[]> {
    console.log('🔍 Buscando vagas em plataformas brasileiras...')

    const promises = [
      this.scrapeGupyJobs(query),
      this.scrapeCathoJobs(query, location),
      this.scrapeInfoJobsJobs(query, location),
    ]

    const results = await Promise.allSettled(promises)

    const allJobs: LinkedInJobData[] = []

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allJobs.push(...result.value)
      } else {
        console.error('Erro em uma das fontes:', result.reason)
      }
    })

    console.log(`📊 Total de vagas encontradas: ${allJobs.length}`)

    return allJobs
  }
}

export const webUnlocker = new WebUnlockerService()
