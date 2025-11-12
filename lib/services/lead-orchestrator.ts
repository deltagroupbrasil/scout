// Lead Orchestrator - Orquestra todo o processo de criação de leads
import { prisma } from "@/lib/prisma"
import { linkedInScraper } from "./linkedin-scraper"
import { gupyScraper } from "./gupy-scraper"
import { cathoScraper } from "./catho-scraper"
import { companyEnrichment } from "./company-enrichment"
import { aiInsights } from "./ai-insights"
import { emailFinder } from "./email-finder"
import { priorityScore } from "./priority-score"
import { LinkedInJobData } from "@/types"
import { cnpjFinder } from "./cnpj-finder"

export class LeadOrchestratorService {
  /**
   * Pipeline completo: LinkedIn → CNPJ → IA → Email → Salvar
   */
  async processJobListing(jobData: LinkedInJobData): Promise<string | null> {
    try {
      console.log(`Processando vaga: ${jobData.jobTitle} - ${jobData.companyName}`)

      // 1. Buscar ou criar empresa
      const company = await this.getOrCreateCompany(
        jobData.companyName,
        jobData.jobUrl
      )

      if (!company) {
        console.error('Não foi possível criar/encontrar a empresa')
        return null
      }

      // 2. Verificar se lead já existe (mesma vaga)
      const existingLead = await prisma.lead.findFirst({
        where: {
          jobUrl: jobData.jobUrl,
          companyId: company.id,
        },
      })

      if (existingLead) {
        console.log('Lead já existe:', existingLead.id)
        return existingLead.id
      }

      // 3. Gerar insights com IA
      const insights = await aiInsights.generateInsights(
        company.name,
        company.sector || '',
        jobData.jobTitle,
        jobData.description
      )

      // 4. Enriquecer e-mails dos contatos (se tiver domínio)
      if (company.website && insights.suggestedContacts.length > 0) {
        const domain = new URL(company.website).hostname.replace('www.', '')

        for (const contact of insights.suggestedContacts) {
          if (!contact.email) {
            const email = await emailFinder.findEmail(contact.name, domain)
            if (email) {
              contact.email = email
            } else {
              // Fallback: gerar e-mail usando padrão comum
              contact.email = emailFinder.guessEmail(contact.name, domain) + ' (validar)'
            }
          }
        }
      }

      // 5. Criar lead
      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          jobTitle: jobData.jobTitle,
          jobDescription: jobData.description,
          jobUrl: jobData.jobUrl,
          jobPostedDate: new Date(jobData.postedDate),
          jobSource: 'LinkedIn',
          candidateCount: jobData.applicants,
          suggestedContacts: JSON.stringify(insights.suggestedContacts),
          triggers: JSON.stringify(insights.triggers),
          status: 'NEW',
          isNew: true,
          priorityScore: 0, // Será calculado abaixo
        },
        include: {
          company: true,
        },
      })

      // 6. Calcular e atualizar score de prioridade
      const score = priorityScore.calculateScore(lead as any)
      await prisma.lead.update({
        where: { id: lead.id },
        data: { priorityScore: score },
      })

      console.log(`✅ Lead criado: ${lead.id} (Score: ${score}/100)`)
      return lead.id
    } catch (error) {
      console.error('Erro ao processar vaga:', error)
      return null
    }
  }

  /**
   * Busca ou cria empresa no banco de dados
   */
  private async getOrCreateCompany(
    companyName: string,
    companyUrl?: string
  ): Promise<any> {
    // Buscar empresa existente (SQLite não suporta mode: insensitive)
    let company = await prisma.company.findFirst({
      where: {
        name: companyName,
      },
    })

    if (company) {
      return company
    }

    // Criar nova empresa
    // 1. Tentar enriquecer com CNPJ
    const cnpj = await this.findCNPJ(companyName, companyUrl)
    let enrichmentData = null

    if (cnpj) {
      enrichmentData = await companyEnrichment.getCompanyByCNPJ(cnpj)

      // Delay de 3 segundos após enriquecimento para evitar rate limit
      // Brasil API tem limite de requisições por minuto
      await this.sleep(3000)
    }

    // 2. Criar empresa
    company = await prisma.company.create({
      data: {
        name: companyName,
        cnpj: enrichmentData?.cnpj || cnpj || null,
        revenue: enrichmentData?.revenue || null,
        employees: enrichmentData?.employees || null,
        sector: enrichmentData?.sector || null,
        website: enrichmentData?.website || companyUrl || null,
        linkedinUrl: companyUrl || null,
      },
    })

    return company
  }

  /**
   * Tenta encontrar CNPJ da empresa
   */
  private async findCNPJ(
    companyName: string,
    companyUrl?: string
  ): Promise<string | null> {
    // 1. Tentar extrair da URL (LinkedIn às vezes tem CNPJ na URL)
    const cnpjFromUrl = cnpjFinder.extractCNPJFromURL(companyUrl)
    if (cnpjFromUrl) {
      console.log(`✅ CNPJ extraído da URL: ${cnpjFromUrl}`)
      return cnpjFromUrl
    }

    // 2. Buscar por nome da empresa via ReceitaWS
    const cnpj = await cnpjFinder.findCNPJByName(companyName)

    return cnpj
  }

  /**
   * Executa scraping completo e processa todos os leads de múltiplas fontes
   */
  async scrapeAndProcessLeads(query: string): Promise<number> {
    console.log('🔍 Iniciando scraping de vagas de múltiplas fontes...')

    // Scraping de todas as fontes em paralelo
    const [linkedInJobs, gupyJobs, cathoJobs] = await Promise.all([
      linkedInScraper.searchJobs(query).catch(err => {
        console.error('[LinkedIn] Erro:', err)
        return []
      }),
      gupyScraper.scrapeJobs(query).catch(err => {
        console.error('[Gupy] Erro:', err)
        return []
      }),
      cathoScraper.scrapeJobs(query).catch(err => {
        console.error('[Catho] Erro:', err)
        return []
      }),
    ])

    // Combinar todos os jobs
    const allJobs = [
      ...linkedInJobs.map(j => ({ ...j, source: 'LinkedIn' })),
      ...gupyJobs.map(j => ({ ...j, source: 'Gupy' })),
      ...cathoJobs.map(j => ({ ...j, source: 'Catho' })),
    ]

    console.log(`📊 Total de vagas encontradas: ${allJobs.length}`)
    console.log(`   - LinkedIn: ${linkedInJobs.length}`)
    console.log(`   - Gupy: ${gupyJobs.length}`)
    console.log(`   - Catho: ${cathoJobs.length}`)

    // Filtrar vagas irrelevantes
    const relevantJobs = allJobs.filter(job => this.isRelevantJob(job.jobTitle))
    console.log(`🔍 Vagas relevantes após filtro: ${relevantJobs.length}`)

    let successCount = 0

    for (const job of relevantJobs) {
      const leadId = await this.processJobListing(job)
      if (leadId) {
        successCount++
      }

      // Delay para não sobrecarregar APIs
      await this.sleep(1000)
    }

    console.log(`✅ ${successCount} leads criados com sucesso`)

    return successCount
  }

  /**
   * Verifica se a vaga é relevante para Controladoria/BPO Financeiro
   */
  private isRelevantJob(jobTitle: string): boolean {
    const lowerTitle = jobTitle.toLowerCase()

    // Termos que DEVEM estar presentes
    const relevantTerms = [
      'controller',
      'controladoria',
      'financeiro',
      'financeira',
      'contábil',
      'contabilidade',
      'cfo',
      'bpo',
      'fiscal',
      'tesouraria',
      'contas a pagar',
      'contas a receber',
      'faturamento',
      'budget',
      'planejamento financeiro'
    ]

    // Termos que NÃO devem estar presentes (vagas irrelevantes)
    const irrelevantTerms = [
      'marketing',
      'vendas',
      'comercial',
      'ti',
      'tecnologia',
      'desenvolvedor',
      'engenheiro',
      'designer',
      'produtor',
      'eventos',
      'rh',
      'recursos humanos',
      'logística',
      'operações',
      'atendimento',
      'customer success',
      'suporte'
    ]

    // Verificar se tem termos irrelevantes
    const hasIrrelevantTerms = irrelevantTerms.some(term =>
      lowerTitle.includes(term)
    )

    if (hasIrrelevantTerms) {
      console.log(`⏭️  Pulando vaga irrelevante: ${jobTitle}`)
      return false
    }

    // Verificar se tem pelo menos um termo relevante
    const hasRelevantTerms = relevantTerms.some(term =>
      lowerTitle.includes(term)
    )

    if (!hasRelevantTerms) {
      console.log(`⏭️  Pulando vaga sem termos relevantes: ${jobTitle}`)
      return false
    }

    return true
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export const leadOrchestrator = new LeadOrchestratorService()
