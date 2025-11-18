// Approach Triggers Generator - Gera gatilhos de abordagem contextualizados
// Analisa eventos, notícias e dados da empresa para criar gatilhos personalizados

import Anthropic from '@anthropic-ai/sdk'

export interface TriggerContext {
  companyName: string
  sector?: string
  revenue?: number
  employees?: number
  jobTitle: string
  recentNews?: Array<{
    type: string
    title: string
    description?: string
    date: string
    sentiment?: string
  }>
  upcomingEvents?: Array<{
    type: string
    title: string
    description?: string
    date: string
  }>
}

export interface ApproachTrigger {
  trigger: string
  reasoning: string
  priority: 'high' | 'medium' | 'low'
}

export class ApproachTriggersGeneratorService {
  private anthropic: Anthropic | null = null
  private initialized: boolean = false

  constructor() {
    // Lazy initialization
  }

  private ensureInitialized() {
    if (this.initialized) return

    const apiKey = process.env.CLAUDE_API_KEY
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey })
      console.log(`    [Triggers Generator] Claude API inicializada`)
    } else {
      console.warn(`    [Triggers Generator] CLAUDE_API_KEY não encontrada`)
    }

    this.initialized = true
  }

  /**
   * Gera gatilhos de abordagem contextualizados usando Claude AI
   */
  async generateContextualTriggers(context: TriggerContext): Promise<string[]> {
    console.log(`\n💡 [Triggers Generator] Gerando gatilhos para ${context.companyName}`)

    this.ensureInitialized()

    if (!this.anthropic) {
      console.warn(`    ⚠️  Claude API não disponível - usando gatilhos genéricos`)
      return this.generateFallbackTriggers(context)
    }

    try {
      // Preparar contexto para o prompt
      const hasEvents = (context.recentNews && context.recentNews.length > 0) ||
                       (context.upcomingEvents && context.upcomingEvents.length > 0)

      const prompt = this.buildPrompt(context)

      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022', // Haiku para reduzir custo
        max_tokens: 1500,
        temperature: 0.7, // Um pouco de criatividade, mas não muito
        messages: [{
          role: 'user',
          content: prompt
        }]
      })

      const responseText = message.content[0].type === 'text'
        ? message.content[0].text
        : ''

      // Parse resposta JSON
      const jsonMatch = responseText.match(/\{[\s\S]*"triggers"[\s\S]*\}/)
      if (!jsonMatch) {
        console.warn(`    ⚠️  Resposta sem JSON válido - usando fallback`)
        return this.generateFallbackTriggers(context)
      }

      const response = JSON.parse(jsonMatch[0])

      if (!response.triggers || !Array.isArray(response.triggers)) {
        console.warn(`    ⚠️  JSON sem array de triggers - usando fallback`)
        return this.generateFallbackTriggers(context)
      }

      // Filtrar apenas triggers de prioridade alta e média
      const priorityTriggers = response.triggers
        .filter((t: ApproachTrigger) => t.priority === 'high' || t.priority === 'medium')
        .sort((a: ApproachTrigger, b: ApproachTrigger) => {
          // Ordenar por prioridade (high primeiro)
          if (a.priority === 'high' && b.priority !== 'high') return -1
          if (a.priority !== 'high' && b.priority === 'high') return 1
          return 0
        })
        .slice(0, 5) // Máximo 5 triggers
        .map((t: ApproachTrigger) => t.trigger)

      console.log(`    ✅ ${priorityTriggers.length} gatilhos contextualizados gerados`)

      return priorityTriggers
    } catch (error) {
      console.error(`    ❌ Erro ao gerar triggers:`, error)
      return this.generateFallbackTriggers(context)
    }
  }

  /**
   * Constrói o prompt para Claude API
   */
  private buildPrompt(context: TriggerContext): string {
    const parts: string[] = []

    parts.push(`Você é um especialista em prospecção B2B para serviços de BPO Financeiro e Controladoria.`)
    parts.push(``)
    parts.push(`Analise o contexto da empresa abaixo e gere gatilhos de abordagem ESPECÍFICOS e CONTEXTUALIZADOS.`)
    parts.push(``)
    parts.push(`EMPRESA: ${context.companyName}`)

    if (context.sector) {
      parts.push(`SETOR: ${context.sector}`)
    }

    if (context.revenue) {
      const revenueFormatted = this.formatRevenue(context.revenue)
      parts.push(`FATURAMENTO: ${revenueFormatted}`)
    }

    if (context.employees) {
      parts.push(`FUNCIONÁRIOS: ${context.employees.toLocaleString('pt-BR')}`)
    }

    parts.push(`VAGA ABERTA: ${context.jobTitle}`)
    parts.push(``)

    // Adicionar notícias recentes se houver
    if (context.recentNews && context.recentNews.length > 0) {
      parts.push(`NOTÍCIAS E EVENTOS RECENTES:`)
      context.recentNews.forEach((news, idx) => {
        parts.push(`${idx + 1}. [${news.type.toUpperCase()}] ${news.title}`)
        if (news.description) {
          parts.push(`   ${news.description}`)
        }
        const date = new Date(news.date)
        const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
        parts.push(`   Data: ${date.toLocaleDateString('pt-BR')} (${daysAgo} dias atrás)`)
        if (news.sentiment) {
          parts.push(`   Sentimento: ${news.sentiment}`)
        }
        parts.push(``)
      })
    }

    // Adicionar eventos futuros se houver
    if (context.upcomingEvents && context.upcomingEvents.length > 0) {
      parts.push(`PRÓXIMOS EVENTOS AGENDADOS:`)
      context.upcomingEvents.forEach((event, idx) => {
        parts.push(`${idx + 1}. [${event.type.toUpperCase()}] ${event.title}`)
        if (event.description) {
          parts.push(`   ${event.description}`)
        }
        const date = new Date(event.date)
        const daysUntil = Math.floor((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        parts.push(`   Data: ${date.toLocaleDateString('pt-BR')} (em ${daysUntil} dias)`)
        parts.push(``)
      })
    }

    parts.push(``)
    parts.push(`INSTRUÇÕES:`)
    parts.push(``)
    parts.push(`1. Gere 3-5 gatilhos de abordagem ESPECÍFICOS e CONTEXTUALIZADOS para esta empresa`)
    parts.push(`2. Cada gatilho deve:`)
    parts.push(`   - Ser específico para ESTA empresa (mencionar dados concretos)`)
    parts.push(`   - Referenciar eventos/notícias quando relevante`)
    parts.push(`   - Mostrar como o BPO Financeiro/Controladoria pode ajudar AGORA`)
    parts.push(`   - Ser direto e objetivo (máx 150 caracteres)`)
    parts.push(`   - Ter um tom consultivo e não vendedor`)
    parts.push(``)
    parts.push(`3. Priorize gatilhos baseados em:`)
    parts.push(`   - HIGH: Mudanças de liderança, investimentos, expansões, crises`)
    parts.push(`   - MEDIUM: Lançamentos, eventos do setor, crescimento`)
    parts.push(`   - LOW: Informações genéricas`)
    parts.push(``)
    parts.push(`4. EVITE frases genéricas como:`)
    parts.push(`   ❌ "Empresa em crescimento precisa de suporte"`)
    parts.push(`   ❌ "Momento ideal para parceria"`)
    parts.push(`   ❌ "Vaga recente indica oportunidade"`)
    parts.push(``)
    parts.push(`5. PREFIRA gatilhos específicos como:`)
    parts.push(`   ✅ "Investimento de R$ 50M em tecnologia demanda controladoria para governança de novos projetos"`)
    parts.push(`   ✅ "Expansão para 3 novas filiais em 2025 requer processos financeiros padronizados"`)
    parts.push(`   ✅ "Novo CFO pode estar revisando stack de fornecedores - janela para apresentar BPO"`)
    parts.push(``)
    parts.push(`FORMATO DE RETORNO (JSON):`)
    parts.push(`{`)
    parts.push(`  "triggers": [`)
    parts.push(`    {`)
    parts.push(`      "trigger": "Texto do gatilho (máx 150 chars)",`)
    parts.push(`      "reasoning": "Por que este gatilho é relevante (máx 100 chars)",`)
    parts.push(`      "priority": "high|medium|low"`)
    parts.push(`    }`)
    parts.push(`  ]`)
    parts.push(`}`)
    parts.push(``)
    parts.push(`GERE OS GATILHOS AGORA (apenas JSON, sem markdown):`)

    return parts.join('\n')
  }

  /**
   * Gera triggers genéricos como fallback
   */
  private generateFallbackTriggers(context: TriggerContext): string[] {
    const triggers: string[] = []
    const lowerTitle = context.jobTitle.toLowerCase()

    // Trigger baseado na vaga
    if (lowerTitle.includes('cfo') || lowerTitle.includes('diretor')) {
      triggers.push('Vaga de alta liderança indica possível reestruturação financeira')
    } else if (lowerTitle.includes('controller') || lowerTitle.includes('controladoria')) {
      triggers.push('Contratação de Controller sugere necessidade de processos mais robustos')
    } else {
      triggers.push('Expansão da equipe financeira pode indicar sobrecarga operacional')
    }

    // Trigger baseado em revenue
    if (context.revenue && context.revenue > 100_000_000) {
      triggers.push(`Faturamento de ${this.formatRevenue(context.revenue)} demanda controladoria especializada`)
    }

    // Trigger baseado em employees
    if (context.employees && context.employees > 200) {
      triggers.push(`${context.employees}+ funcionários requer processos financeiros escaláveis`)
    }

    // Trigger baseado em notícias
    if (context.recentNews && context.recentNews.length > 0) {
      triggers.push('Empresa com movimentações recentes - momento oportuno para abordagem')
    }

    return triggers.slice(0, 4)
  }

  /**
   * Formata revenue para exibição
   */
  private formatRevenue(revenue: number): string {
    if (revenue >= 1_000_000_000) {
      return `R$ ${(revenue / 1_000_000_000).toFixed(1)}B`
    }
    return `R$ ${(revenue / 1_000_000).toFixed(0)}M`
  }
}

export const approachTriggersGenerator = new ApproachTriggersGeneratorService()
