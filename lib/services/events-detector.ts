// Event Detection Service
// Detecta eventos importantes nas redes sociais e notícias da empresa

import Anthropic from '@anthropic-ai/sdk'

export interface CompanyEvent {
  type: 'news' | 'leadership_change' | 'funding' | 'award' | 'product_launch' | 'conference' | 'expansion'
  title: string
  description: string
  date: Date
  source: string
  sourceUrl?: string
  relevance: 'high' | 'medium' | 'low'
  sentiment: 'positive' | 'neutral' | 'negative'
}

export interface EventDetectionResult {
  events: CompanyEvent[]
  detectedAt: Date
  sources: string[]
}

export class EventsDetectorService {
  private anthropic: Anthropic | null = null
  private serpApiKey: string | null = null
  private initialized: boolean = false

  constructor() {
    // Não inicializar aqui - fazer lazy init
  }

  /**
   * Inicialização lazy - garante que .env está carregado
   */
  private ensureInitialized() {
    if (this.initialized) return

    const apiKey = process.env.CLAUDE_API_KEY
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey })
      console.log(`    [Event Detector] Anthropic cliente inicializado`)
    } else {
      console.error(`    [Event Detector] CLAUDE_API_KEY não encontrada no process.env`)
    }

    this.serpApiKey = process.env.BRIGHT_DATA_SERP_KEY || null
    this.initialized = true
  }

  /**
   * Detecta eventos relevantes da empresa usando Claude API com web search
   */
  async detectEvents(
    companyName: string,
    socialMedia?: {
      instagram?: string
      twitter?: string
      facebook?: string
      linkedin?: string
      youtube?: string
    }
  ): Promise<EventDetectionResult> {
    console.log(`\n [Event Detector] Detectando eventos: ${companyName}`)

    // Garantir que está inicializado
    this.ensureInitialized()

    if (!this.anthropic) {
      console.error('    ❌ ERRO: Claude API nao configurada!')
      console.error('    CLAUDE_API_KEY presente:', !!process.env.CLAUDE_API_KEY)
      console.error('    process.env keys:', Object.keys(process.env).filter(k => k.includes('CLAUDE')))
      return { events: [], detectedAt: new Date(), sources: [] }
    }

    try {
      console.log(`    🔍 Buscando noticias via Claude API com web search...`)

      // Preparar informações de redes sociais
      const socialMediaInfo: string[] = []
      if (socialMedia?.instagram) {
        socialMediaInfo.push(`Instagram: ${socialMedia.instagram}`)
      }
      if (socialMedia?.linkedin) {
        socialMediaInfo.push(`LinkedIn: ${socialMedia.linkedin}`)
      }
      if (socialMedia?.twitter) {
        socialMediaInfo.push(`Twitter: ${socialMedia.twitter}`)
      }
      if (socialMedia?.facebook) {
        socialMediaInfo.push(`Facebook: ${socialMedia.facebook}`)
      }

      const socialMediaPrompt = socialMediaInfo.length > 0
        ? `\n\nREDES SOCIAIS OFICIAIS DA EMPRESA:\n${socialMediaInfo.join('\n')}\nIMPORTANTE: Priorize buscar posts recentes nestas redes sociais para encontrar anúncios e notícias diretas da empresa.`
        : ''

      // Usar Claude API com web search para buscar noticias e eventos
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 7 // Aumentado para cobrir redes sociais também
          }
        ],
        messages: [
          {
            role: 'user',
            content: `Encontre os eventos e notícias mais recentes e relevantes sobre a empresa "${companyName}" no Brasil.${socialMediaPrompt}

PRIORIDADES DE BUSCA (em ordem de relevância para prospecção B2B):
1. ALTA PRIORIDADE:
   - Mudanças de liderança (novo CEO, CFO, Diretor Financeiro, Controller)
   - Rodadas de investimento, aporte de capital, IPO
   - Fusões, aquisições ou expansões significativas
   - Prêmios ou reconhecimentos importantes do setor

2. MÉDIA PRIORIDADE:
   - Lançamentos de produtos/serviços relevantes
   - Participação em eventos do setor (feiras, conferências)
   - Abertura de novas unidades ou filiais
   - Crescimento significativo de receita ou funcionários

3. BAIXA PRIORIDADE (apenas se não houver eventos prioritários):
   - Notícias corporativas gerais
   - Campanhas de marketing

FONTES PARA BUSCAR (use web_search):
1. REDES SOCIAIS OFICIAIS (PRIORIDADE SE DISPONÍVEIS):
   - Instagram da empresa (posts, stories salvos, anúncios)
   - LinkedIn da empresa (posts, artigos, atualizações)
   - Twitter/X da empresa (tweets recentes)
   - Facebook da empresa (publicações, eventos)

2. SITES DE NOTÍCIAS E PORTAIS:
   - Sites de notícias financeiras (Valor Econômico, InfoMoney, Bloomberg Brasil)
   - Portais de tecnologia e startups (NeoFeed, StartSe, B2B Stack)
   - Site oficial da empresa (seção de notícias/imprensa)
   - CVM (para empresas de capital aberto)

FORMATO DE RETORNO (JSON):
{
  "events": [
    {
      "type": "news|leadership_change|funding|award|product_launch|conference|expansion",
      "title": "Título claro e objetivo (máx 80 caracteres)",
      "description": "Resumo focado em como isso impacta a empresa (máx 150 caracteres)",
      "date": "YYYY-MM-DD",
      "source": "Nome da fonte (ex: Valor Econômico, LinkedIn)",
      "sourceUrl": "URL completa e verificada da notícia",
      "relevance": "high|medium|low",
      "sentiment": "positive|neutral|negative"
    }
  ]
}

REGRAS:
- Priorize eventos dos últimos 60 dias
- Retorne NO MÁXIMO 8 eventos (priorizando alta relevância)
- Se não encontrar eventos relevantes, retorne: {"events": []}
- SEMPRE inclua sourceUrl quando disponível
- Para eventos futuros (conferências, lançamentos), use a data futura no campo "date"

Empresa: ${companyName}`
          }
        ]
      })

      console.log(`    ✅ Resposta recebida do Claude`)

      // Parse resposta
      for (const block of message.content) {
        if (block.type === 'text') {
          const text = block.text
          console.log(`    📝 Resposta (primeiros 200 chars): ${text.substring(0, 200)}...`)

          // Buscar JSON na resposta
          const jsonMatch = text.match(/\{[\s\S]*"events"[\s\S]*\}/)
          if (jsonMatch) {
            try {
              const response = JSON.parse(jsonMatch[0])

              if (!response.events || !Array.isArray(response.events)) {
                console.log(`    ⚠️  JSON invalido: events nao eh array`)
                continue
              }

              const events: CompanyEvent[] = response.events.map((e: any) => ({
                type: e.type || 'news',
                title: e.title,
                description: e.description,
                date: e.date ? new Date(e.date) : new Date(),
                source: e.source || 'Web Search',
                sourceUrl: e.sourceUrl,
                relevance: e.relevance || 'medium',
                sentiment: e.sentiment || 'neutral'
              }))

              console.log(`    ✅ ${events.length} eventos encontrados`)

              return {
                events,
                detectedAt: new Date(),
                sources: ['Claude AI + Web Search']
              }
            } catch (parseError) {
              console.error(`    ❌ Erro ao parsear JSON:`, parseError)
              console.error(`    JSON tentado:`, jsonMatch[0].substring(0, 300))
            }
          } else {
            console.log(`    ⚠️  Nenhum JSON encontrado na resposta`)
          }
        }
      }

      console.log('    ❌ Nenhum evento encontrado apos processar resposta')
      return { events: [], detectedAt: new Date(), sources: [] }

    } catch (error) {
      console.error('    ❌ ERRO ao detectar eventos:')
      console.error('    Tipo:', error instanceof Error ? error.constructor.name : typeof error)
      console.error('    Mensagem:', error instanceof Error ? error.message : String(error))
      if (error instanceof Error && error.stack) {
        console.error('    Stack:', error.stack.split('\n').slice(0, 3).join('\n'))
      }
      return { events: [], detectedAt: new Date(), sources: [] }
    }
  }

  /**
   * Busca notícias da empresa via Google News (Bright Data SERP API)
   */
  private async searchCompanyNews(companyName: string): Promise<CompanyEvent[]> {
    if (!this.serpApiKey) {
      console.log('     SERP API não configurada')
      return []
    }

    try {
      // Buscar notícias dos últimos 30 dias
      const query = `"${companyName}" (novidades OR notícias OR anuncia OR lança)`
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=nws`

      const response = await fetch('https://api.brightdata.com/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.serpApiKey}`
        },
        body: JSON.stringify({
          zone: 'serp_api1',
          url: searchUrl,
          format: 'raw'
        })
      })

      if (!response.ok) {
        console.log(`     SERP API retornou ${response.status}`)
        return []
      }

      const data = await response.json()
      const html = data.body || ''

      // Parse simples de títulos de notícias
      // Nota: Em produção, usar parser mais robusto ou resposta JSON da API
      const events: CompanyEvent[] = []
      const titleRegex = /<h3[^>]*>(.*?)<\/h3>/gi
      const urlRegex = /href="(https?:\/\/[^"]+)"/gi

      let match
      let count = 0
      while ((match = titleRegex.exec(html)) !== null && count < 10) {
        const title = match[1].replace(/<[^>]*>/g, '').trim()

        if (title && title.length > 10) {
          events.push({
            type: 'news',
            title,
            description: '',
            date: new Date(), // Seria parseado do HTML em implementação completa
            source: 'Google News',
            relevance: 'medium',
            sentiment: 'neutral'
          })
          count++
        }
      }

      console.log(`    ${events.length} notícias encontradas`)
      return events

    } catch (error) {
      console.error('    Erro ao buscar notícias:', error)
      return []
    }
  }

  /**
   * Categoriza e filtra eventos usando Claude AI
   */
  private async categorizeEventsWithAI(
    companyName: string,
    events: CompanyEvent[]
  ): Promise<CompanyEvent[]> {
    if (!this.anthropic) return events

    try {
      const eventsText = events.map((e, i) => `${i + 1}. ${e.title}`).join('\n')

      const prompt = `Você é um analista de inteligência comercial B2B.

Analise as seguintes notícias sobre a empresa "${companyName}" e categorize cada uma.

NOTÍCIAS:
${eventsText}

Para cada notícia, retorne um JSON com:
{
  "events": [
    {
      "index": 1,
      "type": "news|leadership_change|funding|award|product_launch|conference|expansion",
      "relevance": "high|medium|low",
      "sentiment": "positive|neutral|negative",
      "description": "Breve resumo (max 100 chars)",
      "approachTrigger": "Como usar isso numa abordagem comercial (max 150 chars)"
    }
  ]
}

CRITÉRIOS DE RELEVÂNCIA:
- HIGH: Mudanças de liderança, rodadas de investimento, prêmios importantes, expansões
- MEDIUM: Lançamentos de produtos, participação em eventos, notícias do setor
- LOW: Notícias genéricas ou irrelevantes para prospecção B2B

Retorne APENAS o JSON, sem markdown.`

      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })

      const responseText = message.content[0].type === 'text'
        ? message.content[0].text
        : ''

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.log('     IA não retornou JSON válido')
        return events
      }

      const aiResponse = JSON.parse(jsonMatch[0])

      // Mesclar dados da IA com eventos originais
      const categorizedEvents: CompanyEvent[] = []

      for (const aiEvent of aiResponse.events) {
        const originalEvent = events[aiEvent.index - 1]
        if (!originalEvent) continue

        categorizedEvents.push({
          ...originalEvent,
          type: aiEvent.type || 'news',
          relevance: aiEvent.relevance || 'medium',
          sentiment: aiEvent.sentiment || 'neutral',
          description: aiEvent.description || originalEvent.description,
        })
      }

      // Filtrar apenas high e medium relevance
      const filtered = categorizedEvents.filter(e =>
        e.relevance === 'high' || e.relevance === 'medium'
      )

      console.log(`    ${filtered.length} eventos relevantes após análise IA`)
      return filtered

    } catch (error) {
      console.error('    Erro ao categorizar com IA:', error)
      return events
    }
  }

  /**
   * Detecta mudanças de liderança específicas
   */
  async detectLeadershipChanges(companyName: string): Promise<CompanyEvent[]> {
    if (!this.serpApiKey) return []

    console.log(`\n👔 [Event Detector] Detectando mudanças de liderança: ${companyName}`)

    try {
      const query = `"${companyName}" (novo OR nova) (CEO OR CFO OR "Diretor Financeiro" OR Controller OR CTO)`
      const events = await this.searchCompanyNews(companyName)

      // Filtrar apenas eventos de mudança de liderança
      const leadershipEvents = events.filter(e => {
        const text = e.title.toLowerCase()
        return text.includes('ceo') ||
               text.includes('cfo') ||
               text.includes('diretor') ||
               text.includes('controller') ||
               text.includes('nomeado') ||
               text.includes('promovido')
      })

      leadershipEvents.forEach(e => {
        e.type = 'leadership_change'
        e.relevance = 'high'
      })

      console.log(`    ${leadershipEvents.length} mudanças de liderança detectadas`)
      return leadershipEvents

    } catch (error) {
      console.error('    Erro ao detectar mudanças de liderança:', error)
      return []
    }
  }

  /**
   * Detecta rodadas de investimento e expansões
   */
  async detectFundingEvents(companyName: string): Promise<CompanyEvent[]> {
    if (!this.serpApiKey) return []

    console.log(`\n [Event Detector] Detectando investimentos: ${companyName}`)

    try {
      const query = `"${companyName}" (investimento OR rodada OR "Series A" OR "Series B" OR IPO OR aporte OR expansão)`
      const events = await this.searchCompanyNews(companyName)

      const fundingEvents = events.filter(e => {
        const text = e.title.toLowerCase()
        return text.includes('investimento') ||
               text.includes('rodada') ||
               text.includes('series') ||
               text.includes('ipo') ||
               text.includes('aporte') ||
               text.includes('expansão')
      })

      fundingEvents.forEach(e => {
        if (e.title.toLowerCase().includes('ipo')) {
          e.type = 'funding'
          e.relevance = 'high'
        } else if (e.title.toLowerCase().includes('expansão')) {
          e.type = 'expansion'
          e.relevance = 'high'
        } else {
          e.type = 'funding'
          e.relevance = 'high'
        }
      })

      console.log(`    ${fundingEvents.length} eventos de investimento detectados`)
      return fundingEvents

    } catch (error) {
      console.error('    Erro ao detectar investimentos:', error)
      return []
    }
  }

  /**
   * Gera gatilhos de abordagem baseados em eventos
   */
  generateApproachTriggers(events: CompanyEvent[]): string[] {
    const triggers: string[] = []

    for (const event of events) {
      if (event.relevance === 'low') continue

      switch (event.type) {
        case 'leadership_change':
          triggers.push(`Nova liderança financeira: momento ideal para apresentar soluções de BPO`)
          break

        case 'funding':
          triggers.push(`Rodada de investimento recente: empresa em crescimento e aberta a novos parceiros`)
          break

        case 'expansion':
          triggers.push(`Expansão da empresa: provável necessidade de reforço em Controladoria`)
          break

        case 'award':
          triggers.push(`Empresa premiada: parabenizar conquista e oferecer suporte ao crescimento`)
          break

        case 'product_launch':
          triggers.push(`Lançamento de produto: momento de crescimento que demanda suporte financeiro`)
          break

        default:
          if (event.sentiment === 'positive') {
            triggers.push(`Notícia positiva recente: empresa em momento favorável para parcerias`)
          }
      }
    }

    return triggers.slice(0, 3) // Máximo 3 triggers
  }
}

export const eventsDetector = new EventsDetectorService()
