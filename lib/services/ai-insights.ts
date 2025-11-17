// AI Insights Service usando Claude API
import Anthropic from '@anthropic-ai/sdk'
import { AIInsights } from "@/types"

export class AIInsightsService {
  private client: Anthropic | null = null

  constructor() {
    const apiKey = process.env.CLAUDE_API_KEY
    if (apiKey) {
      this.client = new Anthropic({ apiKey })
    }
  }

  /**
   * Gera decisores sugeridos e gatilhos de abordagem usando Claude AI
   */
  async generateInsights(
    companyName: string,
    sector: string,
    jobTitle: string,
    jobDescription: string
  ): Promise<AIInsights> {
    if (!this.client) {
      console.warn('CLAUDE_API_KEY não configurada, retornando insights padrão')
      return this.getDefaultInsights(companyName, jobTitle)
    }

    try {
      const prompt = this.buildPrompt(companyName, sector, jobTitle, jobDescription)

      const message = await this.client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      // Extrair texto da resposta
      const responseText = message.content[0].type === 'text'
        ? message.content[0].text
        : ''

      // Tentar parsear JSON da resposta
      const insights = this.parseInsightsFromResponse(responseText)

      if (insights) {
        console.log(' Insights gerados com IA para:', companyName)
        return insights
      }

      // Fallback se parsing falhar
      console.warn('Não foi possível parsear resposta da IA, usando fallback')
      return this.getDefaultInsights(companyName, jobTitle)
    } catch (error) {
      console.error('Erro ao gerar insights:', error)
      return this.getDefaultInsights(companyName, jobTitle)
    }
  }

  /**
   * Constrói o prompt para a IA
   */
  private buildPrompt(
    companyName: string,
    sector: string,
    jobTitle: string,
    jobDescription: string
  ): string {
    return `
Você é um especialista em prospecção B2B para serviços de Controladoria e BPO Financeiro no Brasil.

**CONTEXTO IMPORTANTE**: A empresa ${companyName} está contratando para a vaga "${jobTitle}".
Isso indica uma oportunidade para vender serviços de Controladoria/BPO para a EMPRESA (não para o candidato).

Analise e forneça:

1. **Decisores-chave na empresa** (2 pessoas) - Quem pode COMPRAR serviços de Controladoria/BPO:
   - Nome fictício brasileiro realista (ex: "Carlos Mendes", "Ana Paula Silva")
   - Cargo de decisão (CFO, Diretor Financeiro, CEO, COO, VP Finanças)
   - LinkedIn: deixe vazio
   - **NÃO sugira cargos relacionados à vaga (ex: se a vaga é Controller, NÃO sugira Controller)**

2. **Gatilhos de abordagem** (3-4 insights) - Por que a empresa pode precisar de serviços terceirizados:
   - Sinais de expansão que podem sobrecarregar o time atual
   - Oportunidades de terceirizar processos repetitivos
   - Momentos de transformação que demandam expertise externa
   - Pontos de dor que serviços de Controladoria/BPO podem resolver

**Informações da empresa:**
- Nome: ${companyName}
- Setor: ${sector || 'Não informado'}
- Vaga aberta: ${jobTitle}
- Descrição da vaga: ${jobDescription.substring(0, 500)}

**IMPORTANTE: Retorne APENAS o JSON válido abaixo, sem texto adicional:**

{
  "suggestedContacts": [
    {
      "name": "Nome Completo",
      "role": "Cargo/Função"
    }
  ],
  "triggers": [
    "Gatilho 1 - específico e acionável",
    "Gatilho 2 - relacionado ao momento da empresa",
    "Gatilho 3 - oportunidade de valor"
  ]
}
`.trim()
  }

  /**
   * Parseia a resposta da IA e extrai os insights
   */
  private parseInsightsFromResponse(response: string): AIInsights | null {
    try {
      // Tentar encontrar JSON na resposta
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        return null
      }

      const parsed = JSON.parse(jsonMatch[0])

      // Validar estrutura
      if (!parsed.suggestedContacts || !parsed.triggers) {
        return null
      }

      return {
        suggestedContacts: parsed.suggestedContacts.map((contact: any) => ({
          name: contact.name || 'Decisor',
          role: contact.role || 'Cargo não especificado',
          linkedin: contact.linkedin,
          email: contact.email,
          phone: contact.phone
        })),
        triggers: parsed.triggers
      }
    } catch (error) {
      console.error('Erro ao parsear resposta da IA:', error)
      return null
    }
  }

  /**
   * Retorna insights padrão quando a IA não está disponível
   */
  private getDefaultInsights(companyName: string, jobTitle: string): AIInsights {
    // Inferir decisores baseado no título da vaga
    const role = this.extractRole(jobTitle)

    return {
      suggestedContacts: [
        {
          name: `Diretor Financeiro`,
          role: "CFO",
        },
        {
          name: `Gerente de ${role}`,
          role: `Gerente de ${role}`,
        },
      ],
      triggers: [
        `Empresa está contratando para ${jobTitle} - sinal de expansão`,
        `Oportunidade de apresentar soluções de ${role.toLowerCase()}`,
        `Momento ideal para prospecção ativa`,
      ],
    }
  }

  /**
   * Extrai a área/role do título da vaga
   */
  private extractRole(jobTitle: string): string {
    if (jobTitle.toLowerCase().includes('control')) return 'Controladoria'
    if (jobTitle.toLowerCase().includes('financ')) return 'Financeiro'
    if (jobTitle.toLowerCase().includes('contab')) return 'Contabilidade'
    if (jobTitle.toLowerCase().includes('bpo')) return 'BPO'
    return 'Administrativo'
  }
}

export const aiInsights = new AIInsightsService()
