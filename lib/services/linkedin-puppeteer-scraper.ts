/**
 * LinkedIn Scraper usando Puppeteer (Vercel-compatible)
 */

import { LinkedInJobData } from "@/types"
import { puppeteerVercel } from "./puppeteer-vercel"

export class LinkedInPuppeteerScraperService {
  async scrapeJobs(query: string, location: string = "Brasil"): Promise<LinkedInJobData[]> {
    console.log(`[LinkedIn Puppeteer] 🔍 Buscando: "${query}" em ${location}`)

    try {
      // URL de busca do LinkedIn
      const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&f_TPR=r86400&sortBy=DD`

      console.log(`[LinkedIn Puppeteer] 📡 URL: ${searchUrl}`)

      // Scrape usando Puppeteer Vercel
      const html = await puppeteerVercel.scrapePage(searchUrl, {
        waitFor: '.jobs-search__results-list',
        timeout: 30000,
        retries: 2
      })

      console.log(`[LinkedIn Puppeteer] ✅ HTML recebido: ${html.length} caracteres`)

      // Parse usando cheerio (similar ao scraper público)
      const cheerio = await import('cheerio')
      const $ = cheerio.load(html)
      const jobs: LinkedInJobData[] = []

      // Procurar por cards de vagas
      $('.base-card, .job-search-card, [data-entity-urn]').each((_, element) => {
        try {
          const $job = $(element)

          // Título
          let title = $job.find('.base-search-card__title, h3').first().text().trim()
          if (!title) return

          // Empresa
          let company = $job.find('.base-search-card__subtitle, h4').first().text().trim()
          if (!company) return

          // Localização
          let location = $job.find('.job-search-card__location').first().text().trim()

          // URL
          let jobUrl = $job.find('a.base-card__full-link').attr('href')
          if (!jobUrl || !jobUrl.includes('linkedin.com')) return

          // Limpar URL
          jobUrl = jobUrl.split('?')[0]

          // Data de postagem
          let postedDate: Date | undefined
          const postedText = $job.find('.job-search-card__listdate, time').first().text().trim()
          if (postedText) {
            if (postedText.includes('minuto') || postedText.includes('hora')) {
              postedDate = new Date()
            } else if (postedText.includes('dia')) {
              const days = parseInt(postedText) || 1
              postedDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            }
          }

          jobs.push({
            jobTitle: title,
            companyName: company,
            location: location || 'Brasil',
            jobUrl,
            postedDate: postedDate || new Date(), // Data atual se não encontrada
            jobSource: 'LinkedIn Puppeteer',
            description: '', // Puppeteer não pega descrição completa na listagem
          })
        } catch (error) {
          console.error('[LinkedIn Puppeteer] Erro ao parsear job card:', error)
        }
      })

      console.log(`[LinkedIn Puppeteer] ✅ ${jobs.length} vagas extraídas`)

      // Fechar browser
      await puppeteerVercel.close()

      return jobs

    } catch (error) {
      console.error('[LinkedIn Puppeteer] ❌ Erro:', error)

      // Garantir que o browser seja fechado
      await puppeteerVercel.close().catch(() => {})

      return []
    }
  }
}

export const linkedInPuppeteerScraper = new LinkedInPuppeteerScraperService()
