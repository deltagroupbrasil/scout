// LinkedIn People Scraper - Busca pessoas REAIS na empresa
// Usa Bright Data Puppeteer para scraping de perfis de funcionários
import puppeteer from 'puppeteer-core'
import * as cheerio from 'cheerio'

export interface LinkedInPerson {
  name: string
  role: string
  linkedinUrl: string
  profilePicture?: string
  location?: string
  headline?: string
}

export interface LinkedInPersonDetails {
  name: string
  role: string
  linkedinUrl: string
  email?: string
  phone?: string
  location?: string
  headline?: string
  about?: string
  experience?: Array<{
    title: string
    company: string
    duration: string
  }>
}

export class LinkedInPeopleScraperService {
  private browserWSEndpoint: string

  constructor() {
    this.browserWSEndpoint = process.env.BRIGHT_DATA_PUPPETEER_URL || ''
  }

  /**
   * Busca pessoas na empresa por cargo/título
   * Exemplo: "CFO at Hitachi Energy", "Finance Director at PagBank"
   */
  async searchPeopleByRole(
    companyName: string,
    roles: string[]
  ): Promise<LinkedInPerson[]> {
    if (!this.browserWSEndpoint) {
      console.warn('[LinkedIn People] Bright Data não configurado')
      return []
    }

    const allPeople: LinkedInPerson[] = []

    for (const role of roles) {
      try {
        console.log(` [LinkedIn People] Buscando: ${role} at ${companyName}`)

        const query = `${role} at ${companyName}`
        const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`

        console.log(` Conectando ao navegador Bright Data...`)
        const browser = await puppeteer.connect({
          browserWSEndpoint: this.browserWSEndpoint,
        })

        const page = await browser.newPage()

        // Navegar para busca de pessoas
        console.log(` Navegando para: ${searchUrl}`)
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 })

        // Aguardar carregamento dos resultados
        await this.sleep(5000)

        // Extrair HTML
        const html = await page.content()
        await page.close()
        await browser.disconnect()

        // Parse com Cheerio
        const $ = cheerio.load(html)

        // Extrair pessoas dos resultados
        const people = this.extractPeopleFromSearchResults($)

        console.log(` Encontradas ${people.length} pessoas para ${role}`)
        allPeople.push(...people)

        // Rate limit
        await this.sleep(2000)

      } catch (error) {
        console.error(` Erro ao buscar ${role}:`, error)
      }
    }

    // Remover duplicatas por LinkedIn URL
    const uniquePeople = Array.from(
      new Map(allPeople.map(p => [p.linkedinUrl, p])).values()
    )

    return uniquePeople
  }

  /**
   * Extrai pessoas dos resultados de busca do LinkedIn
   */
  private extractPeopleFromSearchResults($: cheerio.CheerioAPI): LinkedInPerson[] {
    const people: LinkedInPerson[] = []

    // Seletores possíveis (LinkedIn muda frequentemente)
    const resultSelectors = [
      '.reusable-search__result-container',
      '.entity-result',
      '[data-chameleon-result-urn]',
    ]

    let $results = $()
    for (const selector of resultSelectors) {
      $results = $(selector)
      if ($results.length > 0) break
    }

    console.log(`    Encontrados ${$results.length} resultados no HTML`)

    $results.each((_, element) => {
      try {
        const $el = $(element)

        // Extrair nome
        const name = $el.find('.entity-result__title-text a span[aria-hidden="true"]').first().text().trim() ||
                     $el.find('.app-aware-link span[aria-hidden="true"]').first().text().trim() ||
                     $el.find('span[dir="ltr"] span[aria-hidden="true"]').first().text().trim()

        // Extrair URL do perfil
        const profileLink = $el.find('a.app-aware-link').attr('href') ||
                           $el.find('a[href*="/in/"]').attr('href')

        // Extrair cargo/headline
        const role = $el.find('.entity-result__primary-subtitle').text().trim() ||
                    $el.find('[data-anonymize="title"]').text().trim()

        // Extrair localização
        const location = $el.find('.entity-result__secondary-subtitle').text().trim()

        if (name && profileLink) {
          const fullProfileUrl = profileLink.startsWith('http')
            ? profileLink
            : `https://www.linkedin.com${profileLink}`

          people.push({
            name,
            role: role || 'Unknown',
            linkedinUrl: fullProfileUrl.split('?')[0], // Remove query params
            location,
          })
        }
      } catch (error) {
        console.error('     Erro ao extrair pessoa:', error)
      }
    })

    return people
  }

  /**
   * Scraping detalhado de perfil individual
   * Extrai email, telefone se disponível publicamente
   */
  async scrapePersonProfile(linkedinUrl: string): Promise<LinkedInPersonDetails | null> {
    if (!this.browserWSEndpoint) {
      console.warn('[LinkedIn Profile] Bright Data não configurado')
      return null
    }

    try {
      console.log(` [LinkedIn Profile] Scraping: ${linkedinUrl}`)

      const browser = await puppeteer.connect({
        browserWSEndpoint: this.browserWSEndpoint,
      })

      const page = await browser.newPage()

      // Navegar para perfil
      await page.goto(linkedinUrl, { waitUntil: 'networkidle2', timeout: 30000 })
      await this.sleep(5000)

      // Extrair HTML
      const html = await page.content()
      await page.close()
      await browser.disconnect()

      // Parse com Cheerio
      const $ = cheerio.load(html)

      // Extrair informações do perfil
      const name = $('h1.text-heading-xlarge').first().text().trim() ||
                  $('.pv-text-details__left-panel h1').first().text().trim()

      const headline = $('.text-body-medium.break-words').first().text().trim() ||
                      $('.pv-text-details__left-panel .text-body-medium').first().text().trim()

      const location = $('span.text-body-small.inline.t-black--light.break-words').first().text().trim()

      const about = $('#about').parent().find('.inline-show-more-text').text().trim()

      // Extrair informações de contato (se disponíveis)
      const contactInfo = this.extractContactInfo($)

      // Extrair experiência
      const experience = this.extractExperience($)

      // Extrair cargo atual
      const currentRole = experience.length > 0 ? experience[0].title : headline

      const details: LinkedInPersonDetails = {
        name,
        role: currentRole,
        linkedinUrl,
        email: contactInfo.email,
        phone: contactInfo.phone,
        location,
        headline,
        about,
        experience,
      }

      console.log(` Perfil extraído: ${name}`)
      if (contactInfo.email) console.log(`   📧 Email: ${contactInfo.email}`)
      if (contactInfo.phone) console.log(`    Phone: ${contactInfo.phone}`)

      return details

    } catch (error) {
      console.error(` Erro ao scraping profile ${linkedinUrl}:`, error)
      return null
    }
  }

  /**
   * Extrai informações de contato do perfil (email, telefone)
   */
  private extractContactInfo($: cheerio.CheerioAPI): { email?: string; phone?: string } {
    const contactInfo: { email?: string; phone?: string } = {}

    // Tentar encontrar seção de contato
    const contactSection = $('#top-card-text-details-contact-info, [data-test-id="contact-info"]')

    // Buscar email
    const emailText = contactSection.find('a[href^="mailto:"]').attr('href')
    if (emailText) {
      contactInfo.email = emailText.replace('mailto:', '')
    }

    // Buscar telefone
    const phoneText = contactSection.find('a[href^="tel:"]').attr('href')
    if (phoneText) {
      contactInfo.phone = phoneText.replace('tel:', '')
    }

    // Buscar em todo o HTML (fallback)
    if (!contactInfo.email) {
      const emailMatch = $.html().match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
      if (emailMatch) {
        contactInfo.email = emailMatch[0]
      }
    }

    if (!contactInfo.phone) {
      const phoneMatch = $.html().match(/\+?[\d\s\-\(\)]{10,}/)
      if (phoneMatch) {
        contactInfo.phone = phoneMatch[0].trim()
      }
    }

    return contactInfo
  }

  /**
   * Extrai experiência profissional
   */
  private extractExperience($: cheerio.CheerioAPI): Array<{
    title: string
    company: string
    duration: string
  }> {
    const experience: Array<{ title: string; company: string; duration: string }> = []

    $('#experience').parent().find('.pvs-list__item--line-separated').each((_, el) => {
      const $el = $(el)

      const title = $el.find('.mr1.t-bold span[aria-hidden="true"]').first().text().trim()
      const company = $el.find('.t-14.t-normal span[aria-hidden="true"]').first().text().trim()
      const duration = $el.find('.t-14.t-normal.t-black--light span[aria-hidden="true"]').first().text().trim()

      if (title && company) {
        experience.push({ title, company, duration })
      }
    })

    return experience
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const linkedInPeopleScraper = new LinkedInPeopleScraperService()
