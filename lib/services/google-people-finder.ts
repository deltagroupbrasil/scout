// Google People Finder - Busca pessoas REAIS via Google Search
// Usa Bright Data SERP API + Web Unlocker para encontrar decisores
import * as cheerio from 'cheerio'
import { apolloEnrichment } from './apollo-enrichment'

export interface RealPerson {
  name: string
  role: string
  email?: string
  phone?: string
  linkedinUrl?: string
  source: string
  confidence: 'high' | 'medium' | 'low'
}

export class GooglePeopleFinderService {
  private serpApiUrl: string
  private webUnlockerUrl: string
  private apiKey: string

  constructor() {
    // Bright Data SERP API (Google Search)
    this.serpApiUrl = process.env.BRIGHT_DATA_SERP_API_URL || ''

    // Bright Data Web Unlocker (scraping de sites)
    this.webUnlockerUrl = process.env.BRIGHT_DATA_WEB_UNLOCKER_URL || ''

    // API Key (mesma para SERP e Web Unlocker)
    this.apiKey = process.env.BRIGHT_DATA_SERP_KEY || process.env.BRIGHT_DATA_UNLOCKER_KEY || ''
  }

  /**
   * Busca decisores reais de uma empresa usando múltiplas fontes
   */
  async findRealPeople(
    companyName: string,
    companyWebsite: string,
    roles: string[]
  ): Promise<RealPerson[]> {
    console.log(`\n🔍 [Google People Finder] Buscando decisores reais de ${companyName}`)

    const allPeople: RealPerson[] = []

    // Estratégia 1: Google Search para "CFO PagBank"
    console.log(`\n📍 Estratégia 1: Google Search`)
    const googlePeople = await this.searchViaGoogle(companyName, roles)
    allPeople.push(...googlePeople)

    // Estratégia 2: Scraping da página "Sobre Nós" / "Equipe" do site corporativo
    console.log(`\n📍 Estratégia 2: Scraping site corporativo`)
    const websitePeople = await this.scrapeCompanyWebsite(companyWebsite)
    allPeople.push(...websitePeople)

    // Estratégia 3: Buscar em diretórios públicos (Crunchbase, etc)
    console.log(`\n📍 Estratégia 3: Diretórios públicos`)
    const directoryPeople = await this.searchInDirectories(companyName, companyWebsite)
    allPeople.push(...directoryPeople)

    // Estratégia 4: Apollo.io (emails e telefones verificados)
    console.log(`\n📍 Estratégia 4: Apollo.io`)
    try {
      const apolloContacts = await apolloEnrichment.findFinancialDecisionMakers(
        companyName,
        this.extractDomain(companyWebsite)
      )

      if (apolloContacts.length > 0) {
        console.log(`   ✅ Apollo encontrou ${apolloContacts.length} decisores`)

        // Converter para formato RealPerson
        const apolloPeople: RealPerson[] = apolloContacts.map(contact => ({
          name: contact.name,
          role: contact.role,
          email: contact.email || undefined,
          phone: contact.phone || undefined,
          linkedinUrl: contact.linkedin,
          source: 'apollo',
          confidence: contact.email ? 'high' : 'medium',
        }))

        allPeople.push(...apolloPeople)
      } else {
        console.log(`   ⚠️  Apollo não encontrou decisores`)
      }
    } catch (error) {
      console.error(`   ❌ Erro ao buscar no Apollo:`, error)
    }

    // Remover duplicatas (mesmo nome ou mesmo email)
    const uniquePeople = this.deduplicatePeople(allPeople)

    console.log(`\n✅ Total de pessoas reais encontradas: ${uniquePeople.length}`)

    return uniquePeople
  }

  /**
   * Estratégia 1: Google Search para "CFO PagBank", "Finance Director PagBank"
   * Usa Web Unlocker em vez de SERP API
   */
  private async searchViaGoogle(
    companyName: string,
    roles: string[]
  ): Promise<RealPerson[]> {
    if (!this.webUnlockerUrl) {
      console.warn('   ⚠️  Bright Data Web Unlocker não configurado')
      return []
    }

    const people: RealPerson[] = []

    for (const role of roles) {
      try {
        // Query: "CFO PagBank email" ou "Finance Director PagBank contact"
        const query = `${role} ${companyName} email contact`
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=pt-BR`

        console.log(`   🔍 Google: "${query}"`)

        const response = await fetch(this.webUnlockerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            zone: 'web_unlocker1',
            url: googleUrl,
            format: 'raw'
          }),
        })

        if (!response.ok) {
          console.warn(`   ⚠️  Web Unlocker error: ${response.status}`)
          continue
        }

        const html = await response.text()
        const $ = cheerio.load(html)

        // Extrair pessoas dos resultados do Google
        const extractedPeople = this.extractPeopleFromGoogleHTML($, role)
        people.push(...extractedPeople)

        console.log(`   ✅ Encontradas ${extractedPeople.length} pessoas para ${role}`)

        // Rate limit
        await this.sleep(2000)

      } catch (error) {
        console.error(`   ❌ Erro ao buscar ${role}:`, error)
      }
    }

    return people
  }

  /**
   * Extrai pessoas do HTML dos resultados do Google Search
   */
  private extractPeopleFromGoogleHTML($: cheerio.CheerioAPI, role: string): RealPerson[] {
    const people: RealPerson[] = []

    // Seletores comuns para resultados do Google
    // Estrutura moderna do Google: <div class="g"> ou <div class="tF2Cxc">
    const resultSelectors = [
      '.g',           // Seletor principal de resultado
      '.tF2Cxc',      // Seletor alternativo
      '[data-sokoban-container]', // Outro possível seletor
    ]

    for (const selector of resultSelectors) {
      const results = $(selector)

      if (results.length === 0) continue

      results.each((_, element) => {
        try {
          const $result = $(element)

          // Extrair título e snippet
          const title = $result.find('h3').first().text().trim()
          const snippet = $result.find('.VwiC3b, .yXK7lf, [data-sncf="1"]').first().text().trim()
          const link = $result.find('a').first().attr('href') || ''

          const fullText = `${title} ${snippet}`

          // Tentar extrair nome do título ou snippet
          const nameMatch = this.extractNameFromText(fullText)

          if (nameMatch) {
            // Tentar extrair email do snippet
            const emailMatch = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)

            // Tentar extrair telefone do snippet (formato brasileiro)
            const phoneMatch = fullText.match(/\+?55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/)

            // Verificar se tem LinkedIn URL
            const linkedinUrl = link.includes('linkedin.com/in/') ? link : undefined

            people.push({
              name: nameMatch,
              role,
              email: emailMatch?.[0],
              phone: phoneMatch?.[0],
              linkedinUrl,
              source: 'google_search',
              confidence: emailMatch ? 'high' : 'medium',
            })

            console.log(`      ✅ Encontrado: ${nameMatch} ${emailMatch ? `(${emailMatch[0]})` : ''}`)
          }
        } catch (error) {
          console.error('   ⚠️  Erro ao extrair pessoa:', error)
        }
      })

      // Se encontrou resultados com este seletor, não precisa tentar outros
      if (people.length > 0) break
    }

    return people
  }

  /**
   * Extrai pessoas dos resultados do Google Search (JSON - DEPRECATED)
   * Mantido para compatibilidade, mas não é mais usado
   */
  private extractPeopleFromSearchResults(data: any, role: string): RealPerson[] {
    const people: RealPerson[] = []

    // Percorrer resultados orgânicos
    const results = data.organic_results || data.results || []

    for (const result of results) {
      try {
        const title = result.title || ''
        const snippet = result.snippet || ''
        const link = result.link || ''

        // Tentar extrair nome do título ou snippet
        // Exemplos: "João Silva - CFO at PagBank", "Meet our CFO, Maria Santos"
        const nameMatch = this.extractNameFromText(title + ' ' + snippet)

        if (nameMatch) {
          // Tentar extrair email do snippet
          const emailMatch = snippet.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)

          // Tentar extrair telefone do snippet
          const phoneMatch = snippet.match(/\+?55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/)

          // Verificar se tem LinkedIn URL
          const linkedinUrl = link.includes('linkedin.com/in/') ? link : undefined

          people.push({
            name: nameMatch,
            role,
            email: emailMatch?.[0],
            phone: phoneMatch?.[0],
            linkedinUrl,
            source: 'google_search',
            confidence: emailMatch ? 'high' : 'medium',
          })
        }
      } catch (error) {
        console.error('   ⚠️  Erro ao extrair pessoa:', error)
      }
    }

    return people
  }

  /**
   * Estratégia 2: Scraping do site corporativo (About, Team, Leadership pages)
   */
  private async scrapeCompanyWebsite(websiteUrl: string): Promise<RealPerson[]> {
    if (!this.webUnlockerUrl || !websiteUrl) {
      console.warn('   ⚠️  Web Unlocker não configurado ou sem website')
      return []
    }

    const people: RealPerson[] = []

    try {
      // URLs comuns de páginas de equipe
      const teamPageUrls = this.generateTeamPageUrls(websiteUrl)

      for (const pageUrl of teamPageUrls) {
        try {
          console.log(`   🌐 Scraping: ${pageUrl}`)

          // Usar Web Unlocker da Bright Data
          const response = await fetch(this.webUnlockerUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
              zone: 'web_unlocker1',
              url: pageUrl,
              format: 'raw'
            }),
          })

          if (!response.ok) {
            console.warn(`   ⚠️  Web Unlocker error: ${response.status}`)
            continue
          }

          const html = await response.text()
          const $ = cheerio.load(html)

          // Extrair pessoas da página
          const extractedPeople = this.extractPeopleFromTeamPage($, pageUrl)
          people.push(...extractedPeople)

          console.log(`   ✅ Encontradas ${extractedPeople.length} pessoas em ${pageUrl}`)

          // Rate limit
          await this.sleep(2000)

        } catch (error) {
          console.error(`   ❌ Erro ao scraping ${pageUrl}:`, error)
        }
      }

    } catch (error) {
      console.error('   ❌ Erro geral ao scraping website:', error)
    }

    return people
  }

  /**
   * Gera URLs possíveis para páginas de equipe
   */
  private generateTeamPageUrls(baseUrl: string): string[] {
    const base = baseUrl.replace(/\/$/, '') // Remove trailing slash

    return [
      `${base}/about`,
      `${base}/about-us`,
      `${base}/sobre`,
      `${base}/sobre-nos`,
      `${base}/team`,
      `${base}/equipe`,
      `${base}/leadership`,
      `${base}/lideranca`,
      `${base}/diretoria`,
      `${base}/executivos`,
      `${base}/management`,
      `${base}/gestao`,
      `${base}/company`,
      `${base}/empresa`,
    ]
  }

  /**
   * Extrai pessoas de uma página de equipe
   */
  private extractPeopleFromTeamPage($: cheerio.CheerioAPI, pageUrl: string): RealPerson[] {
    const people: RealPerson[] = []

    // Seletores comuns para membros de equipe
    const teamSelectors = [
      '.team-member',
      '.member',
      '.employee',
      '.leadership-member',
      '[class*="team"]',
      '[class*="member"]',
      '[class*="leadership"]',
    ]

    for (const selector of teamSelectors) {
      $(selector).each((_, element) => {
        try {
          const $el = $(element)

          // Extrair nome
          const name = $el.find('h2, h3, h4, .name, [class*="name"]').first().text().trim()

          // Extrair cargo
          const role = $el.find('.role, .title, .position, [class*="role"], [class*="title"]').first().text().trim()

          // Extrair email
          const emailLink = $el.find('a[href^="mailto:"]').attr('href')
          const email = emailLink?.replace('mailto:', '')

          // Extrair telefone
          const phoneLink = $el.find('a[href^="tel:"]').attr('href')
          const phone = phoneLink?.replace('tel:', '')

          // Extrair LinkedIn
          const linkedinLink = $el.find('a[href*="linkedin.com"]').attr('href')

          if (name && role) {
            people.push({
              name,
              role,
              email,
              phone,
              linkedinUrl: linkedinLink,
              source: 'company_website',
              confidence: email ? 'high' : 'medium',
            })
          }
        } catch (error) {
          console.error('   ⚠️  Erro ao extrair membro:', error)
        }
      })

      // Se encontrou pessoas, não precisa tentar outros seletores
      if (people.length > 0) break
    }

    // Fallback: buscar emails em todo o HTML
    if (people.length === 0) {
      const allText = $.text()
      const emails = allText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []

      for (const email of emails.slice(0, 5)) { // Limitar a 5 emails
        people.push({
          name: 'Contato', // Placeholder
          role: 'Unknown',
          email,
          source: 'company_website_email_only',
          confidence: 'low',
        })
      }
    }

    return people
  }

  /**
   * Estratégia 3: Buscar em diretórios públicos (Crunchbase, AngelList)
   */
  private async searchInDirectories(
    companyName: string,
    companyWebsite: string
  ): Promise<RealPerson[]> {
    if (!this.webUnlockerUrl) {
      console.warn('   ⚠️  Web Unlocker não configurado')
      return []
    }

    const people: RealPerson[] = []

    try {
      // Crunchbase - página da empresa
      const crunchbaseUrl = `https://www.crunchbase.com/organization/${this.slugify(companyName)}`

      console.log(`   🔍 Buscando em Crunchbase...`)

      const response = await fetch(this.webUnlockerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          zone: 'web_unlocker1',
          url: crunchbaseUrl,
          format: 'raw'
        }),
      })

      if (response.ok) {
        const html = await response.text()
        const $ = cheerio.load(html)

        // Extrair executivos listados no Crunchbase
        $('.profile-card, .board-member').each((_, element) => {
          const $el = $(element)

          const name = $el.find('.name, h3').first().text().trim()
          const role = $el.find('.title, .role').first().text().trim()
          const linkedinLink = $el.find('a[href*="linkedin.com"]').attr('href')

          if (name && role) {
            people.push({
              name,
              role,
              linkedinUrl: linkedinLink,
              source: 'crunchbase',
              confidence: 'medium',
            })
          }
        })

        console.log(`   ✅ Encontradas ${people.length} pessoas no Crunchbase`)
      }

      await this.sleep(2000)

    } catch (error) {
      console.error('   ❌ Erro ao buscar em diretórios:', error)
    }

    return people
  }

  /**
   * Remove duplicatas - prioriza maior confidence
   */
  private deduplicatePeople(people: RealPerson[]): RealPerson[] {
    const map = new Map<string, RealPerson>()

    for (const person of people) {
      // Normalizar nome para comparação
      const key = person.email || person.name.toLowerCase().trim()

      const existing = map.get(key)

      if (!existing) {
        map.set(key, person)
      } else {
        // Manter o de maior confidence e mais completo
        const existingScore = this.getPersonScore(existing)
        const newScore = this.getPersonScore(person)

        if (newScore > existingScore) {
          map.set(key, person)
        }
      }
    }

    return Array.from(map.values())
  }

  /**
   * Score de qualidade de uma pessoa (quanto mais completo, melhor)
   */
  private getPersonScore(person: RealPerson): number {
    let score = 0

    if (person.email) score += 10
    if (person.phone) score += 5
    if (person.linkedinUrl) score += 3
    if (person.confidence === 'high') score += 5
    else if (person.confidence === 'medium') score += 2

    return score
  }

  /**
   * Extrai nome de um texto (ex: "João Silva - CFO" → "João Silva")
   */
  private extractNameFromText(text: string): string | null {
    // Blacklist: palavras que NÃO são nomes de pessoas
    const blacklist = [
      'phone', 'number', 'email', 'contact', 'information', 'request', 'notifications',
      'directors', 'director', 'officers', 'officer', 'management', 'team', 'committee',
      'composition', 'chief', 'financial', 'operating', 'executive', 'senior', 'junior',
      'company', 'profile', 'bank', 'home', 'page', 'imprensa', 'fale', 'seguro',
      'digital', 'emails', 'são', 'paulo', 'rio', 'janeiro', 'brasil', 'brazil',
      'finance', 'accounting', 'human', 'resources', 'technology', 'sales', 'marketing'
    ]

    // Padrão 1: Nome antes de " - " ou " | "
    const pattern1 = text.match(/([A-ZÀ-Ú][a-zà-ú]+(?:\s[A-ZÀ-Ú][a-zà-ú]+)+)\s*[-|]/)
    if (pattern1) {
      const name = pattern1[1].trim()
      if (!this.isBlacklisted(name, blacklist) && this.isValidPersonName(name)) {
        return name
      }
    }

    // Padrão 2: Nome após vírgula
    const pattern2 = text.match(/,\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s[A-ZÀ-Ú][a-zà-ú]+)+)/)
    if (pattern2) {
      const name = pattern2[1].trim()
      if (!this.isBlacklisted(name, blacklist) && this.isValidPersonName(name)) {
        return name
      }
    }

    // Padrão 3: Nome brasileiro (2-4 palavras começando com maiúscula)
    const pattern3 = text.match(/\b([A-ZÀ-Ú][a-zà-ú]+(?:\s[A-ZÀ-Ú][a-zà-ú]+){1,3})\b/)
    if (pattern3) {
      const name = pattern3[1].trim()
      if (!this.isBlacklisted(name, blacklist) && this.isValidPersonName(name)) {
        return name
      }
    }

    return null
  }

  /**
   * Verifica se o nome contém palavras da blacklist
   */
  private isBlacklisted(name: string, blacklist: string[]): boolean {
    const lowerName = name.toLowerCase()
    return blacklist.some(word => lowerName.includes(word))
  }

  /**
   * Valida se é um nome de pessoa válido
   */
  private isValidPersonName(name: string): boolean {
    // Deve ter pelo menos 2 palavras (nome + sobrenome)
    const words = name.split(/\s+/)
    if (words.length < 2) return false

    // Cada palavra deve ter pelo menos 2 caracteres
    if (words.some(word => word.length < 2)) return false

    // Não deve ter mais de 5 palavras (muito improvável ser um nome)
    if (words.length > 5) return false

    // Deve ter pelo menos uma vogal (todo nome tem vogal)
    if (!/[aeiouáéíóúàèìòùâêîôûãõAEIOUÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕ]/.test(name)) return false

    return true
  }

  /**
   * Extrai domínio de uma URL (ex: "https://www.solvi.com/about" → "solvi.com")
   */
  private extractDomain(url: string): string | undefined {
    if (!url) return undefined

    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace('www.', '')
    } catch {
      // Se não for uma URL válida, tentar extrair domínio simples
      const match = url.match(/([a-z0-9-]+\.[a-z]{2,})/i)
      return match ? match[1] : undefined
    }
  }

  /**
   * Converte nome para slug (ex: "PagBank" → "pagbank")
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const googlePeopleFinder = new GooglePeopleFinderService()
