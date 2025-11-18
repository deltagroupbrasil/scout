// Website Intelligence Scraper
// Extrai dados estruturados do site da empresa: CNPJ, redes sociais, telefones, emails

import * as cheerio from 'cheerio'

export interface WebsiteIntelligence {
  // Redes Sociais
  instagram?: {
    handle: string
    url: string
    verified: boolean
  }
  twitter?: {
    handle: string
    url: string
    verified: boolean
  }
  facebook?: {
    handle: string
    url: string
    verified: boolean
  }
  linkedin?: {
    handle: string
    url: string
    verified: boolean
  }
  youtube?: {
    handle: string
    url: string
    verified: boolean
  }

  // Dados Corporativos
  cnpj?: string
  phones: string[]
  emails: string[]
  whatsapp?: string

  // Metadata
  scrapedAt: Date
  source: 'website_footer' | 'website_header' | 'website_contact_page'
}

export class WebsiteIntelligenceScraperService {
  /**
   * Extrai inteligência completa do website da empresa
   */
  async scrapeWebsite(websiteUrl: string, html?: string): Promise<WebsiteIntelligence> {
    console.log(`\n [Website Intelligence] Analisando: ${websiteUrl}`)

    let pageHtml: string | undefined = html

    // Se não foi passado HTML, fazer fetch via Bright Data Web Unlocker
    if (!pageHtml) {
      const fetched = await this.fetchWebsite(websiteUrl)
      pageHtml = fetched || undefined
    }

    if (!pageHtml) {
      console.log('     Não foi possível obter HTML do site')
      return this.getEmptyIntelligence()
    }

    const $ = cheerio.load(pageHtml)

    // Extrair dados
    const intelligence: WebsiteIntelligence = {
      scrapedAt: new Date(),
      source: 'website_footer',
      phones: [],
      emails: []
    }

    // 1. Extrair redes sociais
    intelligence.instagram = this.extractInstagram($)
    intelligence.twitter = this.extractTwitter($)
    intelligence.facebook = this.extractFacebook($)
    intelligence.linkedin = this.extractLinkedIn($)
    intelligence.youtube = this.extractYouTube($)

    // 2. Extrair CNPJ
    intelligence.cnpj = this.extractCNPJ($)

    // 3. Extrair telefones
    intelligence.phones = this.extractPhones($, pageHtml)

    // 4. Extrair emails
    intelligence.emails = this.extractEmails($, pageHtml)

    // 5. Extrair WhatsApp
    intelligence.whatsapp = this.extractWhatsApp($, pageHtml)

    this.logResults(intelligence)

    return intelligence
  }

  /**
   * Faz fetch do website via Bright Data Web Unlocker
   */
  private async fetchWebsite(url: string): Promise<string | null> {
    const webUnlockerUrl = process.env.BRIGHT_DATA_WEB_UNLOCKER_URL
    const apiKey = process.env.BRIGHT_DATA_UNLOCKER_KEY

    if (!webUnlockerUrl || !apiKey) {
      console.log('     Bright Data não configurado')
      return null
    }

    try {
      const response = await fetch(webUnlockerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          zone: 'web_unlocker1',
          url,
          format: 'raw'
        })
      })

      if (!response.ok) {
        console.log(`    Erro ao acessar site: ${response.status}`)
        return null
      }

      return await response.text()
    } catch (error) {
      console.error('    Erro ao fazer fetch:', error)
      return null
    }
  }

  /**
   * Extrai Instagram do HTML
   */
  private extractInstagram($: cheerio.CheerioAPI): WebsiteIntelligence['instagram'] {
    const patterns = [
      'a[href*="instagram.com/"]',
      'a[href*="instagr.am/"]'
    ]

    for (const pattern of patterns) {
      const link = $(pattern).attr('href')
      if (link) {
        const handle = this.extractHandleFromUrl(link, 'instagram.com')
        if (handle) {
          return {
            handle,
            url: link,
            verified: true
          }
        }
      }
    }

    return undefined
  }

  /**
   * Extrai Twitter/X do HTML
   */
  private extractTwitter($: cheerio.CheerioAPI): WebsiteIntelligence['twitter'] {
    const patterns = [
      'a[href*="twitter.com/"]',
      'a[href*="x.com/"]'
    ]

    for (const pattern of patterns) {
      const link = $(pattern).attr('href')
      if (link) {
        const handle = this.extractHandleFromUrl(link, 'twitter.com', 'x.com')
        if (handle) {
          return {
            handle,
            url: link,
            verified: true
          }
        }
      }
    }

    return undefined
  }

  /**
   * Extrai Facebook do HTML
   */
  private extractFacebook($: cheerio.CheerioAPI): WebsiteIntelligence['facebook'] {
    const patterns = [
      'a[href*="facebook.com/"]',
      'a[href*="fb.com/"]'
    ]

    for (const pattern of patterns) {
      const link = $(pattern).attr('href')
      if (link) {
        const handle = this.extractHandleFromUrl(link, 'facebook.com')
        if (handle) {
          return {
            handle,
            url: link,
            verified: true
          }
        }
      }
    }

    return undefined
  }

  /**
   * Extrai LinkedIn do HTML
   */
  private extractLinkedIn($: cheerio.CheerioAPI): WebsiteIntelligence['linkedin'] {
    const patterns = [
      'a[href*="linkedin.com/company/"]'
    ]

    for (const pattern of patterns) {
      const link = $(pattern).attr('href')
      if (link) {
        const handle = this.extractHandleFromUrl(link, 'linkedin.com/company/')
        if (handle) {
          return {
            handle,
            url: link,
            verified: true
          }
        }
      }
    }

    return undefined
  }

  /**
   * Extrai YouTube do HTML
   */
  private extractYouTube($: cheerio.CheerioAPI): WebsiteIntelligence['youtube'] {
    const patterns = [
      'a[href*="youtube.com/"]',
      'a[href*="youtu.be/"]'
    ]

    for (const pattern of patterns) {
      const link = $(pattern).attr('href')
      if (link) {
        const handle = this.extractHandleFromUrl(link, 'youtube.com')
        if (handle) {
          return {
            handle,
            url: link,
            verified: true
          }
        }
      }
    }

    return undefined
  }

  /**
   * Extrai handle de uma URL de rede social
   */
  private extractHandleFromUrl(url: string, ...domains: string[]): string | null {
    for (const domain of domains) {
      const regex = new RegExp(`${domain.replace('.', '\\.')}/([a-zA-Z0-9._-]+)`, 'i')
      const match = url.match(regex)
      if (match && match[1]) {
        // Limpar query params e trailing slash
        const handle = match[1].split('?')[0].split('/')[0]
        // Filtrar handles inválidos
        if (!['share', 'sharer', 'intent', 'explore'].includes(handle.toLowerCase())) {
          return handle
        }
      }
    }
    return null
  }

  /**
   * Extrai CNPJ do HTML
   */
  private extractCNPJ($: cheerio.CheerioAPI): string | undefined {
    const fullText = $.text()

    // Regex para CNPJ formatado: XX.XXX.XXX/XXXX-XX
    const cnpjRegex = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g
    const matches = fullText.match(cnpjRegex)

    if (matches && matches.length > 0) {
      return matches[0].replace(/\D/g, '') // Retornar apenas números
    }

    // Regex para CNPJ sem formatação: 14 dígitos
    const cnpjPlainRegex = /\b\d{14}\b/g
    const plainMatches = fullText.match(cnpjPlainRegex)

    if (plainMatches && plainMatches.length > 0) {
      return plainMatches[0]
    }

    return undefined
  }

  /**
   * Extrai telefones do HTML
   */
  private extractPhones($: cheerio.CheerioAPI, html: string): string[] {
    const phones = new Set<string>()

    // Buscar em links tel:
    $('a[href^="tel:"]').each((_, el) => {
      const href = $(el).attr('href')
      if (href) {
        const phone = this.cleanPhone(href.replace('tel:', ''))
        if (phone && phone.length >= 10) {
          phones.add(phone)
        }
      }
    })

    // Regex para telefones brasileiros
    const phoneRegex = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/g
    const matches = html.match(phoneRegex)

    if (matches) {
      matches.forEach(match => {
        const phone = this.cleanPhone(match)
        if (phone && phone.length >= 10) {
          phones.add(phone)
        }
      })
    }

    return Array.from(phones)
  }

  /**
   * Extrai emails do HTML
   */
  private extractEmails($: cheerio.CheerioAPI, html: string): string[] {
    const emails = new Set<string>()

    // Buscar em links mailto:
    $('a[href^="mailto:"]').each((_, el) => {
      const href = $(el).attr('href')
      if (href) {
        const email = href.replace('mailto:', '').split('?')[0]
        if (this.isValidEmail(email)) {
          emails.add(email.toLowerCase())
        }
      }
    })

    // Regex para emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    const matches = html.match(emailRegex)

    if (matches) {
      matches.forEach(email => {
        if (this.isValidEmail(email)) {
          emails.add(email.toLowerCase())
        }
      })
    }

    // Filtrar emails genéricos/inválidos
    return Array.from(emails).filter(email =>
      !email.includes('example.com') &&
      !email.includes('domain.com') &&
      !email.includes('email.com') &&
      !email.includes('seusite.com')
    )
  }

  /**
   * Extrai WhatsApp do HTML
   */
  private extractWhatsApp($: cheerio.CheerioAPI, html: string): string | undefined {
    // Buscar links wa.me ou api.whatsapp.com
    const whatsappLink = $('a[href*="wa.me"], a[href*="api.whatsapp.com"]').first().attr('href')

    if (whatsappLink) {
      const phoneMatch = whatsappLink.match(/\d{10,15}/)
      if (phoneMatch) {
        return phoneMatch[0]
      }
    }

    return undefined
  }

  /**
   * Valida email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email)
  }

  /**
   * Limpa telefone
   */
  private cleanPhone(phone: string): string {
    return phone.replace(/\D/g, '')
  }

  /**
   * Retorna intelligence vazia
   */
  private getEmptyIntelligence(): WebsiteIntelligence {
    return {
      phones: [],
      emails: [],
      scrapedAt: new Date(),
      source: 'website_footer'
    }
  }

  /**
   * Log dos resultados
   */
  private logResults(intelligence: WebsiteIntelligence): void {
    console.log('\n [Website Intelligence] Resultados:')

    if (intelligence.instagram) console.log(`    Instagram: @${intelligence.instagram.handle}`)
    if (intelligence.twitter) console.log(`    Twitter: @${intelligence.twitter.handle}`)
    if (intelligence.facebook) console.log(`    Facebook: ${intelligence.facebook.handle}`)
    if (intelligence.linkedin) console.log(`    LinkedIn: ${intelligence.linkedin.handle}`)
    if (intelligence.youtube) console.log(`    YouTube: ${intelligence.youtube.handle}`)
    if (intelligence.cnpj) console.log(`    CNPJ: ${intelligence.cnpj}`)
    if (intelligence.phones.length > 0) console.log(`    Telefones: ${intelligence.phones.length}`)
    if (intelligence.emails.length > 0) console.log(`    Emails: ${intelligence.emails.length}`)
    if (intelligence.whatsapp) console.log(`    WhatsApp: ${intelligence.whatsapp}`)

    const totalFound = [
      intelligence.instagram,
      intelligence.twitter,
      intelligence.facebook,
      intelligence.linkedin,
      intelligence.youtube,
      intelligence.cnpj,
      intelligence.phones.length > 0,
      intelligence.emails.length > 0,
      intelligence.whatsapp
    ].filter(Boolean).length

    console.log(`\n    Total de dados extraídos: ${totalFound}`)
  }
}

export const websiteIntelligenceScraper = new WebsiteIntelligenceScraperService()
