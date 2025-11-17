// AI Company Enrichment Service
// Usa Claude AI para buscar informações detalhadas sobre empresas via web search

import Anthropic from '@anthropic-ai/sdk'

interface CompanyEnrichmentData {
  cnpj?: string // CNPJ encontrado pela IA (14 dígitos)
  sector?: string // Setor de atuação da empresa
  estimatedRevenue?: string
  estimatedEmployees?: string
  location?: string
  recentNews: Array<{
    title: string
    date: string
    source: string
    url?: string
  }>
  upcomingEvents: Array<{
    name: string
    date: string
    type: string
  }>
  socialMedia: {
    instagram?: {
      handle: string
      followers?: string
      lastPost?: string
    }
    linkedin?: {
      url: string
      followers?: string
    }
  }
  industryPosition?: string
  keyInsights: string[]
}

export class AICompanyEnrichmentService {
  private client: Anthropic | null = null

  constructor() {
    const apiKey = process.env.CLAUDE_API_KEY
    if (apiKey) {
      this.client = new Anthropic({
        apiKey,
      })
    } else {
      console.warn('⚠️ CLAUDE_API_KEY não configurada - AI enrichment desabilitado')
    }
  }

  /**
   * Enriquece dados da empresa usando IA e pesquisa web
   */
  async enrichCompany(
    companyName: string,
    companySector?: string,
    companyWebsite?: string
  ): Promise<CompanyEnrichmentData> {
    if (!this.client) {
      return this.getFallbackEnrichment(companyName)
    }

    try {
      console.log(`🔍 [AI Enrichment] Buscando dados sobre ${companyName}`)

      const prompt = this.buildEnrichmentPrompt(companyName, companySector, companyWebsite)

      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4000,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      const content = message.content[0]
      if (content.type === 'text') {
        return this.parseEnrichmentResponse(content.text, companyName)
      }

      return this.getFallbackEnrichment(companyName)
    } catch (error) {
      console.error('[AI Enrichment] Erro:', error)
      return this.getFallbackEnrichment(companyName)
    }
  }

  /**
   * Constrói prompt para enriquecimento de dados
   */
  private buildEnrichmentPrompt(
    companyName: string,
    sector?: string,
    website?: string
  ): string {
    return `Você é um especialista em pesquisa de empresas brasileiras com acesso à internet. Busque informações REAIS e ATUALIZADAS sobre a empresa "${companyName}".

${sector ? `Setor: ${sector}` : ''}
${website ? `Website: ${website}` : ''}

IMPORTANTE: Use dados REAIS encontrados na internet (Glassdoor, LinkedIn, site da empresa, notícias, relatórios). Não invente ou estime arbitrariamente.

Por favor, pesquise e forneça:

1. **CNPJ**: Busque o CNPJ REAL da empresa (14 dígitos, formato: 00.000.000/0000-00).
   - CRÍTICO: Verifique se o CNPJ é REALMENTE da empresa solicitada
   - Busque no site oficial, Wikipedia, ou Receita Federal
   - CUIDADO: Empresas com nomes parecidos têm CNPJs diferentes
   - Exemplo: PagBank ≠ Mercado Pago ≠ PagSeguro (são empresas distintas!)
   - Se não tiver 100% de certeza, use "Não disponível"

2. **Faturamento Anual**:
   - CRÍTICO: Busque DADOS REAIS de faturamento/receita. Faça múltiplas buscas na web se necessário.
   - PRIORIDADE 1: Site oficial - seção "Sobre", "Investor Relations", "Resultados Financeiros"
   - PRIORIDADE 2: Notícias recentes (últimos 12 meses) sobre resultados financeiros, balanços
   - PRIORIDADE 3: Sites especializados: Valor Econômico, InfoMoney, Exame, Forbes Brasil
   - PRIORIDADE 4: Relatórios setoriais, Glassdoor, páginas "Sobre a empresa"
   - PRIORIDADE 5: Se for empresa de capital aberto, busque relatórios CVM/B3
   - PRIORIDADE 6: Para fintechs/startups, busque rodadas de investimento e valuation
   - ÚLTIMA OPÇÃO: Estimativa baseada em número de funcionários + setor (especifique que é estimativa)
   - Formato: "R$ X milhões" ou "R$ X bilhão" ou "R$ X - R$ Y milhões" (faixa)
   - NUNCA deixe "Não disponível" sem antes fazer PELO MENOS 3 buscas diferentes na web
   - Se realmente não encontrar NADA, aí sim use "Não disponível"

3. **Número de Funcionários**:
   - PRIORIDADE 1: LinkedIn da empresa (número exato de funcionários)
   - PRIORIDADE 2: Glassdoor (seção "Overview")
   - PRIORIDADE 3: Site oficial da empresa
   - PRIORIDADE 4: Notícias recentes sobre contratações/demissões
   - Formato: número exato (ex: "1.200") ou faixa (ex: "500-1.000")
   - Se não encontrar, use "Não disponível"

4. **Localização Sede**:
   - Cidade e estado da sede principal (ex: "São Paulo, SP")
   - Busque no LinkedIn, Google Maps, site oficial

5. **Notícias Recentes** (últimos 6 meses):
   - Busque notícias REAIS em sites de notícias brasileiros
   - 2-3 notícias mais relevantes com título, data exata, fonte
   - Priorize: expansão, contratação, resultados financeiros, novos produtos
   - Se não encontrar notícias, deixe array vazio

6. **Eventos** (futuros ou recentes):
   - Busque participações em feiras, conferências confirmadas
   - Apenas eventos CONFIRMADOS
   - Se não encontrar, deixe array vazio

7. **Redes Sociais**:
   - Instagram: Busque o @usuario REAL (não invente)
   - LinkedIn: URL REAL da página da empresa
   - Número de seguidores REAL (se encontrar)

8. **Posição no Mercado**:
   - Baseado em informações reais (porte, relevância, market share)
   - Exemplo: "Líder no segmento de coleta de resíduos urbanos", "Entre as 10 maiores do setor"

9. **Insights Chave**:
   - 2-3 pontos REAIS sobre a empresa encontrados em notícias ou site oficial
   - Foque em: expansão, situação financeira, contratações, inovações

IMPORTANTE: Retorne a resposta em JSON válido seguindo esta estrutura:

{
  "cnpj": "00.000.000/0000-00" ou "Não disponível",
  "sector": "Setor de atuação (ex: Fintech, Varejo, Tecnologia, Indústria)",
  "estimatedRevenue": "R$ X - R$ Y" ou "Não disponível",
  "estimatedEmployees": "X-Y" ou "Não disponível",
  "location": "Cidade, UF",
  "recentNews": [
    {
      "title": "Título da notícia",
      "date": "2025-01-10",
      "source": "Portal/Jornal",
      "url": "https://... (opcional)"
    }
  ],
  "upcomingEvents": [
    {
      "name": "Nome do evento",
      "date": "2025-02-15",
      "type": "feira/webinar/lançamento"
    }
  ],
  "socialMedia": {
    "instagram": {
      "handle": "@empresa",
      "followers": "10k",
      "lastPost": "Há 2 dias"
    },
    "linkedin": {
      "url": "https://linkedin.com/company/empresa",
      "followers": "50k"
    }
  },
  "industryPosition": "Líder no segmento X",
  "keyInsights": [
    "Insight 1",
    "Insight 2",
    "Insight 3"
  ]
}

Se não souber uma informação específica, use "N/A" ou omita o campo.
ATENÇÃO: Retorne APENAS o JSON, sem texto adicional antes ou depois.`
  }

  /**
   * Parse da resposta da IA
   */
  private parseEnrichmentResponse(
    response: string,
    companyName: string
  ): CompanyEnrichmentData {
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('JSON não encontrado na resposta')
      }

      const data = JSON.parse(jsonMatch[0])

      // Limpar CNPJ se retornado
      let cleanedCnpj: string | undefined = undefined
      if (data.cnpj && data.cnpj !== 'Não disponível' && data.cnpj !== 'N/A') {
        const cleaned = data.cnpj.replace(/\D/g, '') // Remove tudo exceto dígitos
        if (cleaned.length === 14) {
          cleanedCnpj = cleaned
        } else {
          console.warn(`[AI Enrichment] CNPJ inválido retornado: ${data.cnpj}`)
        }
      }

      // Validar e retornar (match CompanyEnrichmentData interface)
      return {
        cnpj: cleanedCnpj,
        revenue: data.estimatedRevenue || undefined,
        employees: data.estimatedEmployees || undefined,
        sector: data.sector || undefined,
        website: data.website || undefined,
        linkedinUrl: data.socialMedia?.linkedin?.url || undefined,
      }
    } catch (error) {
      console.error('[AI Enrichment] Erro ao parsear resposta:', error)
      return this.getFallbackEnrichment(companyName)
    }
  }

  /**
   * Fallback quando IA não está disponível
   */
  private getFallbackEnrichment(companyName: string): CompanyEnrichmentData {
    return {
      cnpj: undefined,
      revenue: undefined,
      employees: undefined,
      sector: undefined,
      website: undefined,
      linkedinUrl: undefined,
    }
  }

  /**
   * Busca apenas informações de redes sociais (mais rápido)
   * DEPRECATED: CompanyEnrichmentData não tem campo socialMedia
   */
  /*
  async enrichSocialMedia(
    companyName: string,
    companyWebsite?: string
  ): Promise<any> {
    if (!this.client) {
      return {}
    }

    try {
      const prompt = `Encontre os perfis de redes sociais da empresa "${companyName}" ${companyWebsite ? `(${companyWebsite})` : ''}:

1. Instagram: @usuario
2. LinkedIn: URL completa

Retorne em JSON:
{
  "instagram": {
    "handle": "@empresa",
    "followers": "estimativa"
  },
  "linkedin": {
    "url": "https://linkedin.com/company/...",
    "followers": "estimativa"
  }
}

Apenas o JSON, sem texto extra.`

      const message = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      })

      const content = message.content[0]
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0])
        }
      }

      return {}
    } catch (error) {
      console.error('[AI Enrichment] Erro ao buscar redes sociais:', error)
      return {}
    }
  }
  */
}

export const aiCompanyEnrichment = new AICompanyEnrichmentService()
