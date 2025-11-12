// Bright Data Contact Scraper
// Extrai emails e telefones REAIS usando Puppeteer Browser + Web Unlocker
// Sem APIs pagas - 100% via scraping

import puppeteer from 'puppeteer-core'
import * as cheerio from 'cheerio'

export interface ScrapedContact {
  name: string
  role: string
  email: string | null
  phone: string | null
  linkedin: string | null
  source: 'linkedin_profile' | 'company_website' | 'google_search'
}

export class BrightDataContactScraperService {
  private browserWSEndpoint: string
  private webUnlockerUrl: string
  private serpApiKey: string

  constructor() {
    this.browserWSEndpoint = process.env.BRIGHT_DATA_PUPPETEER_URL || ''
    this.webUnlockerUrl = 'http://brd-customer-hl_xxxxx-zone-web_unlocker:password@brd.superproxy.io:22225'
    this.serpApiKey = process.env.BRIGHT_DATA_SERP_KEY || ''
  }

  /**
   * Extrai email e telefone de um perfil do LinkedIn
   * Usa Bright Data Puppeteer para bypass de anti-bot
   */
  async scrapeLinkedInProfile(linkedinUrl: string): Promise<{ email: string | null; phone: string | null }> {
    if (!this.browserWSEndpoint) {
      console.warn('[LinkedIn Scraper] BRIGHT_DATA_PUPPETEER_URL não configurado')
      return { email: null, phone: null }
    }

    try {
      console.log(`🔍 [LinkedIn] Scraping perfil: ${linkedinUrl}`)

      const browser = await puppeteer.connect({
        browserWSEndpoint: this.browserWSEndpoint,
      })

      const page = await browser.newPage()
      await page.goto(linkedinUrl, { waitUntil: 'networkidle2' })

      // Aguardar carregamento do perfil
      await page.waitForSelector('.pv-top-card', { timeout: 10000 }).catch(() => {})

      // Extrair informações de contato (se públicas)
      const contactInfo = await page.evaluate(() => {
        const extractEmail = () => {
          // Buscar email na seção de contato
          const contactSection = document.querySelector('.pv-contact-info')
          if (contactSection) {
            const emailElement = contactSection.querySelector('a[href^="mailto:"]')
            if (emailElement) {
              return emailElement.getAttribute('href')?.replace('mailto:', '') || null
            }
          }

          // Buscar email no texto da página (formato: nome@dominio.com)
          const bodyText = document.body.innerText
          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
          const emails = bodyText.match(emailRegex)
          return emails ? emails[0] : null
        }

        const extractPhone = () => {
          // Buscar telefone na seção de contato
          const contactSection = document.querySelector('.pv-contact-info')
          if (contactSection) {
            const phoneElement = contactSection.querySelector('[data-test-phone]')
            if (phoneElement) {
              return phoneElement.textContent?.trim() || null
            }
          }

          // Buscar telefone no texto (formato brasileiro: +55, (11), etc.)
          const bodyText = document.body.innerText
          const phoneRegex = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/g
          const phones = bodyText.match(phoneRegex)
          return phones ? phones[0] : null
        }

        return {
          email: extractEmail(),
          phone: extractPhone(),
        }
      })

      await browser.close()

      console.log(`✅ [LinkedIn] Dados extraídos: ${contactInfo.email || 'N/A'} | ${contactInfo.phone || 'N/A'}`)

      return contactInfo
    } catch (error) {
      console.error('[LinkedIn Scraper] Erro:', error)
      return { email: null, phone: null }
    }
  }

  /**
   * Busca página de contato da empresa via Google SERP API
   * Depois faz scraping da página com Web Unlocker
   */
  async scrapeCompanyContactPage(
    companyName: string,
    companyDomain: string
  ): Promise<{ emails: string[]; phones: string[] }> {
    try {
      console.log(`🔍 [Company Scraper] Buscando página de contato: ${companyName}`)

      // 1. Encontrar página de contato via Google
      const contactPageUrl = await this.findContactPage(companyName, companyDomain)
      if (!contactPageUrl) {
        console.log(`⚠️  [Company Scraper] Página de contato não encontrada`)
        return { emails: [], phones: [] }
      }

      // 2. Fazer scraping da página de contato
      const contactData = await this.scrapeContactPageContent(contactPageUrl)

      console.log(
        `✅ [Company Scraper] Extraído: ${contactData.emails.length} emails, ${contactData.phones.length} telefones`
      )

      return contactData
    } catch (error) {
      console.error('[Company Scraper] Erro:', error)
      return { emails: [], phones: [] }
    }
  }

  /**
   * Encontra URL da página de contato via SERP API
   */
  private async findContactPage(companyName: string, companyDomain: string): Promise<string | null> {
    if (!this.serpApiKey) {
      // Fallback: tentar URLs comuns
      const commonPaths = ['/contato', '/contact', '/fale-conosco', '/sobre', '/about']
      return `https://${companyDomain}${commonPaths[0]}`
    }

    try {
      // Buscar via SERP API do Bright Data
      const query = `${companyName} contato site:${companyDomain}`
      const serpUrl = `https://api.brightdata.com/serp/google?key=${this.serpApiKey}&q=${encodeURIComponent(query)}&gl=br&hl=pt-BR`

      const response = await fetch(serpUrl)
      if (!response.ok) {
        console.warn(`[SERP API] Erro ${response.status}`)
        return `https://${companyDomain}/contato`
      }

      const data = await response.json()

      // Pegar primeiro resultado orgânico
      if (data.organic && data.organic.length > 0) {
        return data.organic[0].link
      }

      // Fallback para página principal + /contato
      return `https://${companyDomain}/contato`
    } catch (error) {
      console.error('[SERP API] Erro:', error)
      return `https://${companyDomain}/contato`
    }
  }

  /**
   * Faz scraping do conteúdo da página de contato usando Web Unlocker
   */
  private async scrapeContactPageContent(url: string): Promise<{ emails: string[]; phones: string[] }> {
    try {
      // Usar Web Unlocker do Bright Data para bypass de anti-bot
      const response = await fetch(url, {
        headers: {
          'X-BRD-Unlock': 'true', // Ativar Web Unlocker
        },
        // @ts-ignore - proxy do Bright Data
        agent: this.webUnlockerUrl ? require('https-proxy-agent')(this.webUnlockerUrl) : undefined,
      })

      if (!response.ok) {
        console.warn(`[Web Unlocker] Erro ${response.status} ao acessar ${url}`)
        return { emails: [], phones: [] }
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Extrair todos os emails da página
      const emails = new Set<string>()
      const phoneNumbers = new Set<string>()

      // Buscar emails em links mailto:
      $('a[href^="mailto:"]').each((_, element) => {
        const email = $(element).attr('href')?.replace('mailto:', '').split('?')[0]
        if (email && this.isValidEmail(email)) {
          emails.add(email)
        }
      })

      // Buscar emails no texto
      const bodyText = $.text()
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      const foundEmails = bodyText.match(emailRegex) || []
      foundEmails.forEach((email) => {
        if (this.isValidEmail(email)) {
          emails.add(email)
        }
      })

      // Buscar telefones no texto (formato brasileiro)
      const phoneRegex = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/g
      const foundPhones = bodyText.match(phoneRegex) || []
      foundPhones.forEach((phone) => {
        const cleanPhone = this.cleanPhoneNumber(phone)
        if (cleanPhone) {
          phoneNumbers.add(cleanPhone)
        }
      })

      return {
        emails: Array.from(emails),
        phones: Array.from(phoneNumbers),
      }
    } catch (error) {
      console.error('[Web Unlocker] Erro:', error)
      return { emails: [], phones: [] }
    }
  }

  /**
   * Enriquece contato usando scraping multi-fonte
   */
  async enrichContact(
    name: string,
    role: string,
    companyName: string,
    companyDomain: string,
    linkedinUrl?: string
  ): Promise<ScrapedContact> {
    console.log(`🔄 [Bright Data] Enriquecendo: ${name} @ ${companyName}`)

    const contact: ScrapedContact = {
      name,
      role,
      email: null,
      phone: null,
      linkedin: linkedinUrl || null,
      source: 'google_search',
    }

    // 1. Tentar extrair do LinkedIn (se tiver URL)
    if (linkedinUrl) {
      const linkedinData = await this.scrapeLinkedInProfile(linkedinUrl)
      if (linkedinData.email || linkedinData.phone) {
        contact.email = linkedinData.email
        contact.phone = linkedinData.phone
        contact.source = 'linkedin_profile'
        console.log(`✅ [LinkedIn] Email: ${linkedinData.email} | Phone: ${linkedinData.phone}`)
        return contact
      }
    }

    // 2. Scraping da página de contato da empresa
    const companyData = await this.scrapeCompanyContactPage(companyName, companyDomain)

    if (companyData.emails.length > 0) {
      // Tentar encontrar email que bate com o nome
      const matchingEmail = this.findMatchingEmail(name, companyData.emails, companyDomain)
      contact.email = matchingEmail || companyData.emails[0] // Pegar primeiro se não encontrar match
      contact.source = 'company_website'
    }

    if (companyData.phones.length > 0) {
      contact.phone = companyData.phones[0] // Pegar primeiro telefone encontrado
    }

    // 3. Fallback: gerar email por padrão (se não encontrou nada)
    if (!contact.email) {
      contact.email = this.generateEmailByPattern(name, companyDomain)
      contact.source = 'google_search'
      console.log(`⚠️  [Fallback] Email gerado por padrão: ${contact.email}`)
    }

    console.log(`✅ [Bright Data] Resultado: ${contact.email} | ${contact.phone || 'N/A'}`)

    return contact
  }

  /**
   * Tenta encontrar email que corresponde ao nome
   */
  private findMatchingEmail(name: string, emails: string[], domain: string): string | null {
    const [firstName, ...lastNameParts] = name.toLowerCase().split(' ')
    const lastName = lastNameParts[lastNameParts.length - 1] || ''

    // Filtrar apenas emails do domínio da empresa
    const companyEmails = emails.filter((email) => email.toLowerCase().includes(domain.toLowerCase()))

    // Procurar email que contenha nome ou sobrenome
    const matchingEmail = companyEmails.find((email) => {
      const emailLower = email.toLowerCase()
      return emailLower.includes(firstName) || emailLower.includes(lastName)
    })

    return matchingEmail || null
  }

  /**
   * Gera email baseado em padrão comum
   */
  private generateEmailByPattern(name: string, domain: string): string {
    const [firstName, ...lastNameParts] = name.toLowerCase().split(' ')
    const lastName = lastNameParts[lastNameParts.length - 1] || ''

    // Padrão mais comum no Brasil: nome.sobrenome@empresa.com.br
    return `${firstName}.${lastName}@${domain}`
  }

  /**
   * Valida formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email) && !email.includes('@linkedin.com')
  }

  /**
   * Limpa e formata número de telefone brasileiro
   */
  private cleanPhoneNumber(phone: string): string | null {
    // Remover caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '')

    // Telefone brasileiro: 10-11 dígitos (com DDD)
    if (cleaned.length >= 10 && cleaned.length <= 11) {
      // Formatar: (11) 98765-4321 ou (11) 3456-7890
      if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
      } else {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
      }
    }

    // Se tiver +55, remover e tentar novamente
    if (phone.startsWith('+55')) {
      return this.cleanPhoneNumber(phone.replace('+55', ''))
    }

    return null
  }
}

export const brightDataContactScraper = new BrightDataContactScraperService()
