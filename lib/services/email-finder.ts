// Email Finder Service usando Hunter.io
export class EmailFinderService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.HUNTER_IO_API_KEY || ''
  }

  /**
   * Busca e-mail corporativo usando Hunter.io
   * @param fullName - Nome completo da pessoa
   * @param domain - Domínio da empresa (ex: "ambev.com.br")
   */
  async findEmail(fullName: string, domain: string): Promise<string | null> {
    if (!this.apiKey) {
      console.warn('HUNTER_IO_API_KEY não configurada')
      return null
    }

    try {
      const [firstName, ...lastNameParts] = fullName.split(' ')
      const lastName = lastNameParts.join(' ')

      const url = new URL('https://api.hunter.io/v2/email-finder')
      url.searchParams.set('domain', domain)
      url.searchParams.set('first_name', firstName)
      url.searchParams.set('last_name', lastName)
      url.searchParams.set('api_key', this.apiKey)

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`Hunter.io API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.data?.email && data.data?.score > 50) {
        return data.data.email
      }

      return null
    } catch (error) {
      console.error('Erro ao buscar e-mail:', error)
      return null
    }
  }

  /**
   * Busca padrão de e-mail da empresa
   */
  async getEmailPattern(domain: string): Promise<string | null> {
    if (!this.apiKey) {
      console.warn('HUNTER_IO_API_KEY não configurada')
      return null
    }

    try {
      const url = new URL('https://api.hunter.io/v2/domain-search')
      url.searchParams.set('domain', domain)
      url.searchParams.set('api_key', this.apiKey)

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`Hunter.io API error: ${response.status}`)
      }

      const data = await response.json()

      return data.data?.pattern || null
    } catch (error) {
      console.error('Erro ao buscar padrão de e-mail:', error)
      return null
    }
  }

  /**
   * Gera e-mail usando padrão comum brasileiro
   */
  guessEmail(fullName: string, domain: string): string {
    const [firstName, ...lastNameParts] = fullName.toLowerCase().split(' ')
    const lastName = lastNameParts[lastNameParts.length - 1] || ''

    // Padrões comuns no Brasil
    const patterns = [
      `${firstName}.${lastName}@${domain}`,
      `${firstName}@${domain}`,
      `${firstName.charAt(0)}${lastName}@${domain}`,
    ]

    return patterns[0] // Retorna o mais comum
  }
}

export const emailFinder = new EmailFinderService()
