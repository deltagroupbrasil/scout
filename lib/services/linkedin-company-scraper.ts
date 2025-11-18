// LinkedIn Company Page Scraper
// Extrai dados reais de páginas de empresas no LinkedIn usando Bright Data Puppeteer

import puppeteer from 'puppeteer-core'
import * as cheerio from 'cheerio'

interface LinkedInCompanyData {
  website: string | null
  followers: number | null
  employees: string | null  // Ex: "1.001-5.000 funcionários"
  employeesCount: number | null  // Número estimado do meio da faixa
  description: string | null
  industry: string | null
  headquarters: string | null
  foundedYear: number | null
}

export class LinkedInCompanyScraperService {
  private browserWSEndpoint: string | null = null

  constructor() {
    this.browserWSEndpoint = process.env.BRIGHT_DATA_PUPPETEER_URL || null
    if (!this.browserWSEndpoint) {
      console.warn(' BRIGHT_DATA_PUPPETEER_URL não configurada - LinkedIn scraping desabilitado')
    }
  }

  /**
   * Faz scraping de uma página de empresa do LinkedIn
   */
  async scrapeCompanyPage(linkedinUrl: string): Promise<LinkedInCompanyData> {
    if (!this.browserWSEndpoint) {
      console.log(' [LinkedIn Company] Bright Data não configurado')
      return this.emptyResult()
    }

    // Normalizar URL (pode vir como /company/pagbank ou url completa)
    const companyUrl = linkedinUrl.startsWith('http')
      ? linkedinUrl
      : `https://www.linkedin.com${linkedinUrl.startsWith('/') ? '' : '/'}${linkedinUrl}`

    console.log(` [LinkedIn Company] Scraping: ${companyUrl}`)

    let browser: any = null
    try {
      // Conectar ao browser remoto do Bright Data
      browser = await puppeteer.connect({
        browserWSEndpoint: this.browserWSEndpoint,
      })

      const page = await browser.newPage()
      page.setDefaultNavigationTimeout(45000)

      // Navegar para a página da empresa
      await page.goto(companyUrl, {
        waitUntil: 'networkidle2',
      })

      // Esperar a página carregar
      await this.sleep(3000)

      // Extrair HTML
      const html = await page.content()
      const $ = cheerio.load(html)

      // Extrair dados da página
      const data: LinkedInCompanyData = {
        website: this.extractWebsite($),
        followers: this.extractFollowers($),
        employees: this.extractEmployees($),
        employeesCount: null,
        description: this.extractDescription($),
        industry: this.extractIndustry($),
        headquarters: this.extractHeadquarters($),
        foundedYear: this.extractFoundedYear($),
      }

      // Calcular número estimado de funcionários
      if (data.employees) {
        data.employeesCount = this.parseEmployeeCount(data.employees)
      }

      console.log(` [LinkedIn Company] Dados extraídos:`)
      console.log(`   Website: ${data.website || 'N/A'}`)
      console.log(`   Seguidores: ${data.followers?.toLocaleString() || 'N/A'}`)
      console.log(`   Funcionários: ${data.employees || 'N/A'}`)
      console.log(`   Indústria: ${data.industry || 'N/A'}`)
      console.log(`   Sede: ${data.headquarters || 'N/A'}`)

      await page.close()

      return data
    } catch (error) {
      console.error('[LinkedIn Company] Erro ao fazer scraping:', error)
      return this.emptyResult()
    } finally {
      if (browser) {
        await browser.disconnect()
      }
    }
  }

  /**
   * Extrai website da página
   */
  private extractWebsite($: cheerio.CheerioAPI): string | null {
    try {
      // Seletores possíveis para o website
      const selectors = [
        'a[data-tracking-control-name="about_website"]',
        'a.link-without-visited-state[href^="http"]',
        '.org-page-details__definition-text a',
        'a[target="_blank"][rel="noopener noreferrer"]',
      ]

      for (const selector of selectors) {
        const link = $(selector).first()
        if (link.length) {
          let href = link.attr('href')

          // Limpar URL do LinkedIn tracking
          if (href && href.includes('linkedin.com')) {
            const urlParam = new URL(href).searchParams.get('url')
            if (urlParam) {
              href = decodeURIComponent(urlParam)
            }
          }

          if (href && !href.includes('linkedin.com')) {
            return href
          }
        }
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Extrai número de seguidores
   */
  private extractFollowers($: cheerio.CheerioAPI): number | null {
    try {
      // Procurar por texto que contenha "seguidores" ou "followers"
      const followersText = $('*').filter((_, el) => {
        const text = $(el).text()
        return text.includes('seguidores') || text.includes('followers')
      }).first().text()

      // Extrair número (ex: "1.234.567 seguidores" → 1234567)
      const match = followersText.match(/([0-9.,]+)\s*(seguidores|followers)/i)
      if (match) {
        const numberStr = match[1].replace(/[.,]/g, '')
        return parseInt(numberStr, 10)
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Extrai faixa de funcionários
   */
  private extractEmployees($: cheerio.CheerioAPI): string | null {
    try {
      // Procurar por texto que contenha "funcionários" ou "employees"
      const employeesText = $('*').filter((_, el) => {
        const text = $(el).text()
        return (text.includes('funcionários') || text.includes('employees')) &&
               (text.includes('-') || text.includes('mais de'))
      }).first().text()

      // Extrair faixa (ex: "1.001-5.000 funcionários")
      const match = employeesText.match(/([\d.,]+-[\d.,]+|mais de [\d.,]+)\s*(funcionários|employees)/i)
      if (match) {
        return match[1]
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Extrai descrição da empresa
   */
  private extractDescription($: cheerio.CheerioAPI): string | null {
    try {
      const selectors = [
        'p.break-words',
        '.org-top-card-summary__tagline',
        '.org-about-us-organization-description__text',
      ]

      for (const selector of selectors) {
        const desc = $(selector).first().text().trim()
        if (desc && desc.length > 50) {
          return desc
        }
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Extrai setor/indústria
   */
  private extractIndustry($: cheerio.CheerioAPI): string | null {
    try {
      // Procurar por "Setor" ou "Industry"
      const industryText = $('*').filter((_, el) => {
        const text = $(el).text()
        return text.includes('Setor') || text.includes('Industry')
      }).first().parent().text()

      // Extrair valor depois de "Setor" ou "Industry"
      const match = industryText.match(/(Setor|Industry)[:\s]+([^\n]+)/i)
      if (match) {
        return match[2].trim()
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Extrai localização da sede
   */
  private extractHeadquarters($: cheerio.CheerioAPI): string | null {
    try {
      // Procurar por "Sede" ou "Headquarters"
      const hqText = $('*').filter((_, el) => {
        const text = $(el).text()
        return text.includes('Sede') || text.includes('Headquarters')
      }).first().parent().text()

      // Extrair valor depois de "Sede" ou "Headquarters"
      const match = hqText.match(/(Sede|Headquarters)[:\s]+([^\n]+)/i)
      if (match) {
        return match[2].trim()
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Extrai ano de fundação
   */
  private extractFoundedYear($: cheerio.CheerioAPI): number | null {
    try {
      // Procurar por "Fundada em" ou "Founded"
      const foundedText = $('*').filter((_, el) => {
        const text = $(el).text()
        return text.includes('Fundada') || text.includes('Founded')
      }).first().text()

      // Extrair ano (4 dígitos)
      const match = foundedText.match(/(\d{4})/)
      if (match) {
        return parseInt(match[1], 10)
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Converte faixa de funcionários em número estimado
   * Ex: "1.001-5.000" → 3000 (média)
   * Ex: "mais de 10.000" → 10000
   */
  private parseEmployeeCount(employeeRange: string): number | null {
    try {
      // "1.001-5.000" → pegar média
      const rangeMatch = employeeRange.match(/([\d.,]+)-([\d.,]+)/)
      if (rangeMatch) {
        const min = parseInt(rangeMatch[1].replace(/[.,]/g, ''), 10)
        const max = parseInt(rangeMatch[2].replace(/[.,]/g, ''), 10)
        return Math.floor((min + max) / 2)
      }

      // "mais de 10.000" → usar o número
      const moreThanMatch = employeeRange.match(/mais de ([\d.,]+)/)
      if (moreThanMatch) {
        return parseInt(moreThanMatch[1].replace(/[.,]/g, ''), 10)
      }

      return null
    } catch {
      return null
    }
  }

  /**
   * Retorna resultado vazio
   */
  private emptyResult(): LinkedInCompanyData {
    return {
      website: null,
      followers: null,
      employees: null,
      employeesCount: null,
      description: null,
      industry: null,
      headquarters: null,
      foundedYear: null,
    }
  }

  /**
   * Helper: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const linkedInCompanyScraper = new LinkedInCompanyScraperService()
