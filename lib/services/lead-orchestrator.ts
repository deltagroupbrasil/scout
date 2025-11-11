// Lead Orchestrator - Orquestra todo o processo de criação de leads
import { prisma } from "@/lib/prisma"
import { linkedInScraper } from "./linkedin-scraper"
import { companyEnrichment } from "./company-enrichment"
import { aiInsights } from "./ai-insights"
import { emailFinder } from "./email-finder"
import { LinkedInJobData } from "@/types"

export class LeadOrchestratorService {
  /**
   * Pipeline completo: LinkedIn → CNPJ → IA → Email → Salvar
   */
  async processJobListing(jobData: LinkedInJobData): Promise<string | null> {
    try {
      console.log(`Processando vaga: ${jobData.title} - ${jobData.company}`)

      // 1. Buscar ou criar empresa
      const company = await this.getOrCreateCompany(
        jobData.company,
        jobData.companyUrl
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
        jobData.title,
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
          jobTitle: jobData.title,
          jobDescription: jobData.description,
          jobUrl: jobData.jobUrl,
          jobPostedDate: jobData.postedDate,
          jobSource: 'LinkedIn',
          candidateCount: jobData.candidateCount,
          suggestedContacts: JSON.stringify(insights.suggestedContacts),
          triggers: JSON.stringify(insights.triggers),
          status: 'NEW',
          isNew: true,
        },
      })

      console.log(`✅ Lead criado: ${lead.id}`)
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
    // Buscar empresa existente
    let company = await prisma.company.findFirst({
      where: {
        name: {
          equals: companyName,
          mode: 'insensitive',
        },
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
    // TODO: Implementar busca de CNPJ
    // Opções:
    // 1. Extrair do LinkedIn (às vezes aparece)
    // 2. Buscar na Receita Federal
    // 3. Scraping do site da empresa

    return null
  }

  /**
   * Executa scraping completo e processa todos os leads
   */
  async scrapeAndProcessLeads(query: string): Promise<number> {
    console.log('🔍 Iniciando scraping de vagas...')

    const jobs = await linkedInScraper.searchJobs(query)

    console.log(`📊 ${jobs.length} vagas encontradas`)

    let successCount = 0

    for (const job of jobs) {
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export const leadOrchestrator = new LeadOrchestratorService()
