// Website Finder Service
// Descobre website oficial de empresas usando múltiplas estratégias

import Anthropic from '@anthropic-ai/sdk'

interface WebsiteFinderResult {
  website: string | null
  domain: string | null
  confidence: 'high' | 'medium' | 'low'
  source: 'linkedin_scraping' | 'ai_search' | 'pattern_guess' | 'cnpj_data'
}

export class WebsiteFinderService {
  private claude: Anthropic

  constructor() {
    const apiKey = process.env.CLAUDE_API_KEY
    if (!apiKey) {
      console.warn(' CLAUDE_API_KEY não configurada - Website finder limitado')
    }
    this.claude = new Anthropic({ apiKey: apiKey || 'dummy' })
  }

  /**
   * Encontra website oficial da empresa usando múltiplas estratégias
   */
  async findWebsite(
    companyName: string,
    linkedinUrl?: string,
    cnpjWebsite?: string
  ): Promise<WebsiteFinderResult> {
    console.log(` [Website Finder] Buscando website para: ${companyName}`)

    // Estratégia 1: Se já tem website do CNPJ, validar
    if (cnpjWebsite && this.isValidWebsite(cnpjWebsite)) {
      const domain = this.extractDomain(cnpjWebsite)
      console.log(` [CNPJ] Website encontrado: ${cnpjWebsite}`)
      return {
        website: this.normalizeWebsite(cnpjWebsite),
        domain,
        confidence: 'high',
        source: 'cnpj_data',
      }
    }

    // Estratégia 2: Tentar extrair de LinkedIn URL
    if (linkedinUrl) {
      const fromLinkedIn = this.extractWebsiteFromLinkedInUrl(linkedinUrl)
      if (fromLinkedIn) {
        console.log(` [LinkedIn URL] Website inferido: ${fromLinkedIn}`)
        return {
          website: fromLinkedIn,
          domain: this.extractDomain(fromLinkedIn),
          confidence: 'medium',
          source: 'linkedin_scraping',
        }
      }
    }

    // Estratégia 3: Usar Claude AI para buscar website oficial
    try {
      const aiWebsite = await this.searchWithAI(companyName)
      if (aiWebsite && this.isValidWebsite(aiWebsite)) {
        console.log(` [AI Search] Website encontrado: ${aiWebsite}`)
        return {
          website: this.normalizeWebsite(aiWebsite),
          domain: this.extractDomain(aiWebsite),
          confidence: 'high',
          source: 'ai_search',
        }
      }
    } catch (error) {
      console.error(` [AI Search] Erro:`, error)
    }

    // Estratégia 4: Guess pattern (última tentativa)
    const guessedWebsite = this.guessWebsitePattern(companyName)
    console.log(` [Pattern Guess] Tentativa: ${guessedWebsite}`)
    return {
      website: guessedWebsite,
      domain: this.extractDomain(guessedWebsite),
      confidence: 'low',
      source: 'pattern_guess',
    }
  }

  /**
   * Usa Claude AI para buscar website oficial da empresa
   */
  private async searchWithAI(companyName: string): Promise<string | null> {
    if (!process.env.CLAUDE_API_KEY) {
      return null
    }

    try {
      const prompt = `Você é um assistente especializado em pesquisa empresarial no Brasil.

Tarefa: Encontre o website oficial da empresa "${companyName}".

IMPORTANTE:
- Retorne APENAS a URL do website oficial (ex: https://magazineluiza.com.br)
- Se a empresa tiver website brasileiro (.com.br), prefira ele
- NÃO retorne URLs do LinkedIn, Facebook, Instagram
- Se não tiver certeza, retorne "NÃO ENCONTRADO"

Website oficial:`

      const response = await this.claude.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 200,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = response.content[0]
      if (content.type === 'text') {
        const website = content.text.trim()

        // Validar resposta
        if (
          website === 'NÃO ENCONTRADO' ||
          website.includes('não encontr') ||
          website.includes('sem informação')
        ) {
          return null
        }

        // Limpar e validar URL
        const cleanedWebsite = this.cleanWebsiteUrl(website)
        if (this.isValidWebsite(cleanedWebsite)) {
          return cleanedWebsite
        }
      }

      return null
    } catch (error) {
      console.error('[AI Search] Erro ao buscar website:', error)
      return null
    }
  }

  /**
   * Extrai website de uma URL do LinkedIn (ex: linkedin.com/company/pagbank → pagbank.com)
   */
  private extractWebsiteFromLinkedInUrl(linkedinUrl: string): string | null {
    try {
      // Extrair slug da empresa do LinkedIn
      const match = linkedinUrl.match(/linkedin\.com\/company\/([^/?]+)/)
      if (!match) return null

      const slug = match[1]

      // Empresas brasileiras geralmente usam .com.br
      // Tentar padrões comuns
      const patterns = [
        `https://${slug}.com.br`,
        `https://${slug}.com`,
        `https://www.${slug}.com.br`,
        `https://www.${slug}.com`,
      ]

      // Retornar primeiro padrão (será validado depois)
      return patterns[0]
    } catch {
      return null
    }
  }

  /**
   * Tenta adivinhar o website baseado em padrões comuns
   */
  private guessWebsitePattern(companyName: string): string {
    // Normalizar nome da empresa (remover espaços, acentos, etc)
    const normalized = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, '') // Remove caracteres especiais

    // Empresas brasileiras geralmente usam .com.br
    return `https://${normalized}.com.br`
  }

  /**
   * Valida se uma string é um website válido
   */
  private isValidWebsite(url: string): boolean {
    try {
      const parsed = new URL(url)

      // Rejeitar URLs que não são websites corporativos
      const blacklist = [
        'linkedin.com',
        'facebook.com',
        'instagram.com',
        'twitter.com',
        'youtube.com',
        'gmail.com',
        'hotmail.com',
        'outlook.com',
      ]

      const hostname = parsed.hostname.toLowerCase()
      if (blacklist.some(domain => hostname.includes(domain))) {
        return false
      }

      // Deve ter protocolo http(s)
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return false
      }

      return true
    } catch {
      return false
    }
  }

  /**
   * Limpa e normaliza URL do website
   */
  private cleanWebsiteUrl(url: string): string {
    // Remover espaços, quebras de linha, etc
    let cleaned = url.trim().replace(/[\n\r\t]/g, '')

    // Adicionar https:// se não tiver protocolo
    if (!cleaned.startsWith('http')) {
      cleaned = `https://${cleaned}`
    }

    // Remover trailing slash
    cleaned = cleaned.replace(/\/$/, '')

    return cleaned
  }

  /**
   * Normaliza website para formato padrão
   */
  private normalizeWebsite(url: string): string {
    try {
      const parsed = new URL(url)

      // Remover www. e trailing slash
      const hostname = parsed.hostname.replace(/^www\./, '')

      return `https://${hostname}`
    } catch {
      return url
    }
  }

  /**
   * Extrai domínio limpo do website (ex: https://www.magazineluiza.com.br → magazineluiza.com.br)
   */
  extractDomain(url: string): string | null {
    try {
      const parsed = new URL(url)
      return parsed.hostname.replace(/^www\./, '')
    } catch {
      return null
    }
  }

  /**
   * Valida se um domínio está ativo (faz request HTTP HEAD)
   */
  async isDomainActive(domain: string): Promise<boolean> {
    try {
      const url = domain.startsWith('http') ? domain : `https://${domain}`
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'LeapScout/1.0' },
        signal: AbortSignal.timeout(5000), // 5s timeout
      })

      return response.ok || response.status === 301 || response.status === 302
    } catch {
      return false
    }
  }
}

export const websiteFinder = new WebsiteFinderService()
