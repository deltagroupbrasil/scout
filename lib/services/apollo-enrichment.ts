// Apollo.io Contact Enrichment Service
// Busca emails corporativos e telefones de decisores

interface ApolloContact {
  email: string | null
  phone: string | null
  title: string
  name: string
  linkedin_url: string | null
  organization_name: string
}

interface ApolloSearchResponse {
  people: ApolloContact[]
  total_results: number
}

export class ApolloEnrichmentService {
  private apiKey: string | null = null
  private baseUrl = 'https://api.apollo.io/v1'

  constructor() {
    this.apiKey = process.env.APOLLO_API_KEY || null
    if (!this.apiKey) {
      console.warn('⚠️ APOLLO_API_KEY não configurada - Apollo enrichment desabilitado')
    }
  }

  /**
   * Busca contatos de decisores (C-level, Directors) em uma empresa
   */
  async findContacts(
    companyName: string,
    companyDomain?: string,
    titles: string[] = ['CFO', 'Controller', 'Finance Director', 'Diretor Financeiro']
  ): Promise<ApolloContact[]> {
    if (!this.apiKey) {
      console.log('❌ [Apollo] API Key não configurada')
      return []
    }

    try {
      console.log(`🔍 [Apollo] Buscando contatos em: ${companyName}`)

      const response = await fetch(`${this.baseUrl}/mixed_people/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          // Filtro por empresa
          q_organization_name: companyName,
          ...(companyDomain && { q_organization_domains: [companyDomain] }),

          // Filtro por cargo (decisores financeiros)
          person_titles: titles,

          // Apenas pessoas com email
          contact_email_status: ['verified', 'guessed', 'unavailable'],

          // Localização Brasil
          person_locations: ['Brazil'],

          // Limitar a 5 contatos principais
          per_page: 5,
          page: 1,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ [Apollo] Erro ${response.status}:`, errorText)
        return []
      }

      const data: ApolloSearchResponse = await response.json()

      console.log(`✅ [Apollo] Encontrados ${data.people?.length || 0} contatos`)

      return data.people || []
    } catch (error) {
      console.error('[Apollo] Erro ao buscar contatos:', error)
      return []
    }
  }

  /**
   * Enriquece um contato específico com mais detalhes
   */
  async enrichContact(
    name: string,
    companyName: string,
    companyDomain?: string
  ): Promise<ApolloContact | null> {
    if (!this.apiKey) {
      return null
    }

    try {
      console.log(`🔍 [Apollo] Enriquecendo contato: ${name} @ ${companyName}`)

      const response = await fetch(`${this.baseUrl}/people/match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          first_name: name.split(' ')[0],
          last_name: name.split(' ').slice(1).join(' '),
          organization_name: companyName,
          ...(companyDomain && { domain: companyDomain }),
        }),
      })

      if (!response.ok) {
        console.log(`⚠️ [Apollo] Contato não encontrado: ${name}`)
        return null
      }

      const data = await response.json()

      if (data.person) {
        console.log(`✅ [Apollo] Contato enriquecido: ${data.person.email || 'sem email'}`)
        return {
          email: data.person.email,
          phone: data.person.phone_numbers?.[0]?.raw_number || null,
          title: data.person.title,
          name: data.person.name,
          linkedin_url: data.person.linkedin_url,
          organization_name: data.person.organization?.name || companyName,
        }
      }

      return null
    } catch (error) {
      console.error(`[Apollo] Erro ao enriquecer ${name}:`, error)
      return null
    }
  }

  /**
   * Busca decisores financeiros em uma empresa
   */
  async findFinancialDecisionMakers(
    companyName: string,
    companyDomain?: string
  ): Promise<Array<{ name: string; role: string; email: string | null; phone: string | null; linkedin?: string }>> {
    const contacts = await this.findContacts(companyName, companyDomain, [
      'CFO',
      'Chief Financial Officer',
      'Controller',
      'Controlador',
      'Controllership Manager',
      'Gerente de Controladoria',
      'Finance Director',
      'Diretor Financeiro',
      'Financial Manager',
      'Gerente Financeiro',
      'VP Finance',
      'Vice President Finance',
    ])

    return contacts.map(contact => ({
      name: contact.name,
      role: contact.title,
      email: contact.email,
      phone: contact.phone,
      linkedin: contact.linkedin_url || undefined,
    }))
  }
}

export const apolloEnrichment = new ApolloEnrichmentService()
