// Contact Enrichment Service
// Enriquece contatos com emails corporativos reais e telefones
// Integra: Hunter.io, Apollo.io, RocketReach, e estratégias inteligentes

import { prisma } from "@/lib/prisma"

export interface EnrichedContact {
  name: string
  role: string
  email: string | null
  phone: string | null
  linkedin: string | null
  confidence: 'high' | 'medium' | 'low'
  source: 'hunter' | 'apollo' | 'rocketreach' | 'linkedin_scrape' | 'pattern' | 'ai_generated'
}

export class ContactEnrichmentService {
  private hunterApiKey: string
  private apolloApiKey: string
  private rocketReachApiKey: string

  constructor() {
    this.hunterApiKey = process.env.HUNTER_IO_API_KEY || ''
    this.apolloApiKey = process.env.APOLLO_API_KEY || ''
    this.rocketReachApiKey = process.env.ROCKETREACH_API_KEY || ''
  }

  /**
   * Enriquece contato com email corporativo e telefone REAIS
   * Tenta múltiplas fontes em ordem de confiabilidade
   */
  async enrichContact(
    name: string,
    role: string,
    companyName: string,
    companyDomain: string,
    linkedinUrl?: string
  ): Promise<EnrichedContact> {
    console.log(`🔍 [Contact Enrichment] Enriquecendo: ${name} (${role}) @ ${companyName}`)

    const contact: EnrichedContact = {
      name,
      role,
      email: null,
      phone: null,
      linkedin: linkedinUrl || null,
      confidence: 'low',
      source: 'ai_generated',
    }

    // 1. Tentar Apollo.io (melhor fonte, dados B2B verificados)
    if (this.apolloApiKey) {
      const apolloData = await this.enrichViaApollo(name, companyDomain)
      if (apolloData) {
        contact.email = apolloData.email
        contact.phone = apolloData.phone
        contact.linkedin = apolloData.linkedin || contact.linkedin
        contact.confidence = 'high'
        contact.source = 'apollo'
        console.log(`✅ [Apollo] Contato enriquecido: ${apolloData.email}`)
        return contact
      }
    }

    // 2. Tentar RocketReach (ótimo para telefones)
    if (this.rocketReachApiKey && linkedinUrl) {
      const rocketData = await this.enrichViaRocketReach(linkedinUrl)
      if (rocketData) {
        contact.email = rocketData.email || contact.email
        contact.phone = rocketData.phone || contact.phone
        contact.confidence = 'high'
        contact.source = 'rocketreach'
        console.log(`✅ [RocketReach] Contato enriquecido`)
        return contact
      }
    }

    // 3. Tentar Hunter.io (bom para emails verificados)
    if (this.hunterApiKey) {
      const hunterEmail = await this.findEmailViaHunter(name, companyDomain)
      if (hunterEmail) {
        contact.email = hunterEmail
        contact.confidence = 'medium'
        contact.source = 'hunter'
        console.log(`✅ [Hunter.io] Email encontrado: ${hunterEmail}`)
        return contact
      }
    }

    // 4. Tentar scraping do LinkedIn (se tiver URL)
    if (linkedinUrl) {
      const linkedinData = await this.scrapeLinkedInProfile(linkedinUrl)
      if (linkedinData.email || linkedinData.phone) {
        contact.email = linkedinData.email || contact.email
        contact.phone = linkedinData.phone || contact.phone
        contact.confidence = 'medium'
        contact.source = 'linkedin_scrape'
        console.log(`✅ [LinkedIn Scrape] Dados extraídos`)
        return contact
      }
    }

    // 5. Fallback: Gerar email baseado em padrão da empresa
    if (!contact.email) {
      const pattern = await this.getCompanyEmailPattern(companyDomain)
      const generatedEmail = this.generateEmailFromPattern(name, companyDomain, pattern)
      contact.email = generatedEmail
      contact.confidence = 'low'
      contact.source = 'pattern'
      console.log(`⚠️  [Pattern] Email gerado por padrão: ${generatedEmail} (validar!)`)
    }

    return contact
  }

  /**
   * Apollo.io - Melhor fonte para dados B2B verificados
   * API: https://www.apollo.io/api
   * Plano Free: 50 créditos/mês
   */
  private async enrichViaApollo(
    name: string,
    companyDomain: string
  ): Promise<{ email: string; phone: string; linkedin?: string } | null> {
    if (!this.apolloApiKey) return null

    try {
      const [firstName, ...lastNameParts] = name.split(' ')
      const lastName = lastNameParts.join(' ')

      const response = await fetch('https://api.apollo.io/v1/people/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apolloApiKey,
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          domain: companyDomain,
          reveal_personal_emails: true,
          reveal_phone_number: true,
        }),
      })

      if (!response.ok) {
        console.warn(`[Apollo] API error: ${response.status}`)
        return null
      }

      const data = await response.json()

      if (data.person) {
        return {
          email: data.person.email,
          phone: data.person.phone_numbers?.[0],
          linkedin: data.person.linkedin_url,
        }
      }

      return null
    } catch (error) {
      console.error('[Apollo] Erro:', error)
      return null
    }
  }

  /**
   * RocketReach - Excelente para telefones e emails
   * API: https://rocketreach.co/api
   * Plano Free: 5 lookups/mês
   */
  private async enrichViaRocketReach(
    linkedinUrl: string
  ): Promise<{ email: string; phone: string } | null> {
    if (!this.rocketReachApiKey) return null

    try {
      const response = await fetch('https://api.rocketreach.co/v2/api/lookupProfile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': this.rocketReachApiKey,
        },
        body: JSON.stringify({
          linkedin_url: linkedinUrl,
        }),
      })

      if (!response.ok) {
        console.warn(`[RocketReach] API error: ${response.status}`)
        return null
      }

      const data = await response.json()

      return {
        email: data.emails?.[0]?.email,
        phone: data.phones?.[0]?.number,
      }
    } catch (error) {
      console.error('[RocketReach] Erro:', error)
      return null
    }
  }

  /**
   * Hunter.io - Busca email verificado
   */
  private async findEmailViaHunter(
    fullName: string,
    domain: string
  ): Promise<string | null> {
    if (!this.hunterApiKey) return null

    try {
      const [firstName, ...lastNameParts] = fullName.split(' ')
      const lastName = lastNameParts.join(' ')

      const url = new URL('https://api.hunter.io/v2/email-finder')
      url.searchParams.set('domain', domain)
      url.searchParams.set('first_name', firstName)
      url.searchParams.set('last_name', lastName)
      url.searchParams.set('api_key', this.hunterApiKey)

      const response = await fetch(url.toString())

      if (!response.ok) {
        console.warn(`[Hunter.io] API error: ${response.status}`)
        return null
      }

      const data = await response.json()

      // Só retornar emails com score > 70 (alta confiança)
      if (data.data?.email && data.data?.score > 70) {
        return data.data.email
      }

      return null
    } catch (error) {
      console.error('[Hunter.io] Erro:', error)
      return null
    }
  }

  /**
   * Scraping de perfil do LinkedIn (usando Bright Data)
   * Extrai email e telefone se disponíveis publicamente
   */
  private async scrapeLinkedInProfile(
    linkedinUrl: string
  ): Promise<{ email: string | null; phone: string | null }> {
    // TODO: Implementar scraping via Bright Data Puppeteer
    // Por enquanto, retornar null
    console.log(`[LinkedIn Scrape] TODO: implementar scraping de ${linkedinUrl}`)
    return { email: null, phone: null }
  }

  /**
   * Busca padrão de email da empresa via Hunter.io
   */
  private async getCompanyEmailPattern(domain: string): Promise<string | null> {
    if (!this.hunterApiKey) return null

    try {
      // Verificar cache primeiro
      const cached = await this.getEmailPatternFromCache(domain)
      if (cached) return cached

      const url = new URL('https://api.hunter.io/v2/domain-search')
      url.searchParams.set('domain', domain)
      url.searchParams.set('limit', '1')
      url.searchParams.set('api_key', this.hunterApiKey)

      const response = await fetch(url.toString())

      if (!response.ok) return null

      const data = await response.json()
      const pattern = data.data?.pattern || null

      // Salvar no cache
      if (pattern) {
        await this.saveEmailPatternToCache(domain, pattern)
      }

      return pattern
    } catch (error) {
      console.error('[Hunter.io Pattern] Erro:', error)
      return null
    }
  }

  /**
   * Gera email baseado no padrão da empresa
   */
  private generateEmailFromPattern(
    fullName: string,
    domain: string,
    pattern: string | null
  ): string {
    const [firstName, ...lastNameParts] = fullName.toLowerCase().split(' ')
    const lastName = lastNameParts[lastNameParts.length - 1] || ''
    const firstLetter = firstName.charAt(0)

    // Normalizar nome (remover acentos)
    const normalizeString = (str: string) => str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()

    const firstNameClean = normalizeString(firstName)
    const lastNameClean = normalizeString(lastName)
    const firstLetterClean = firstNameClean.charAt(0)

    // Se tiver padrão da Hunter.io, usar
    if (pattern) {
      return pattern
        .replace('{first}', firstNameClean)
        .replace('{last}', lastNameClean)
        .replace('{f}', firstLetterClean)
        .replace('{l}', lastNameClean.charAt(0))
    }

    // Padrões comuns brasileiros (ordem de probabilidade)
    const brazilianPatterns = [
      `${firstNameClean}.${lastNameClean}@${domain}`, // 60% das empresas
      `${firstNameClean}${lastNameClean}@${domain}`, // 20%
      `${firstLetterClean}${lastNameClean}@${domain}`, // 10%
      `${firstNameClean}@${domain}`, // 5%
      `${firstLetterClean}.${lastNameClean}@${domain}`, // 5%
    ]

    return brazilianPatterns[0]
  }

  /**
   * Cache de padrões de email por empresa
   */
  private async getEmailPatternFromCache(domain: string): Promise<string | null> {
    try {
      const cache = await prisma.enrichmentCache.findFirst({
        where: {
          website: domain,
          success: true,
        },
      })

      return cache?.sector || null // Usando campo sector temporariamente para padrão
    } catch (error) {
      return null
    }
  }

  private async saveEmailPatternToCache(domain: string, pattern: string): Promise<void> {
    try {
      await prisma.enrichmentCache.upsert({
        where: { cnpj: `pattern_${domain}` },
        update: {
          sector: pattern,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 dias
        },
        create: {
          cnpj: `pattern_${domain}`,
          website: domain,
          sector: pattern,
          success: true,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      })
    } catch (error) {
      console.error('[Cache] Erro ao salvar padrão:', error)
    }
  }

  /**
   * Valida se email existe (usando verificação SMTP)
   */
  async validateEmail(email: string): Promise<boolean> {
    // TODO: Implementar validação SMTP ou usar serviço como ZeroBounce
    // Por enquanto, validação básica de formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
}

export const contactEnrichment = new ContactEnrichmentService()
