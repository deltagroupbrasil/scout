// Lead Orchestrator - Orquestra todo o processo de criação de leads
import { prisma } from "@/lib/prisma"
import { linkedInScraper } from "./linkedin-scraper"
import { gupyScraper } from "./gupy-scraper"
import { cathoScraper } from "./catho-scraper"
import { companyEnrichment } from "./company-enrichment"
import { aiInsights } from "./ai-insights"
import { aiCompanyEnrichment } from "./ai-company-enrichment"
import { contactEnrichment } from "./contact-enrichment"
import { websiteFinder } from "./website-finder"
import { linkedInCompanyScraper } from "./linkedin-company-scraper"
import { priorityScore } from "./priority-score"
import { LinkedInJobData } from "@/types"
import { cnpjFinder } from "./cnpj-finder"

export class LeadOrchestratorService {
  /**
   * Pipeline completo OTIMIZADO (Baixo Custo):
   * LinkedIn → Website Discovery → LinkedIn Company Scraping → CNPJ → AI Insights → Contact Enrichment
   */
  async processJobListing(jobData: LinkedInJobData): Promise<string | null> {
    try {
      console.log(`\n${'='.repeat(70)}`)
      console.log(`📋 Processando vaga: ${jobData.jobTitle}`)
      console.log(`🏢 Empresa: ${jobData.companyName}`)
      console.log(`${'='.repeat(70)}\n`)

      // 1. Buscar ou criar empresa (COM DESCOBERTA DE WEBSITE E SCRAPING)
      const company = await this.getOrCreateCompany(
        jobData.companyName,
        jobData.jobUrl
      )

      if (!company) {
        console.error('❌ Não foi possível criar/encontrar a empresa')
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
        console.log(`✅ Lead já existe: ${existingLead.id}`)
        return existingLead.id
      }

      // 3. Gerar insights com IA (contatos sugeridos + triggers)
      console.log(`\n🤖 Gerando insights com IA...`)
      const insights = await aiInsights.generateInsights(
        company.name,
        company.sector || '',
        jobData.jobTitle,
        jobData.description
      )

      console.log(`✅ IA gerou ${insights.suggestedContacts.length} contatos sugeridos`)

      // 4. Enriquecer contatos com MULTI-SOURCE (Hunter → Apollo → Pattern)
      let enrichedContacts = []

      if (company.website && websiteFinder.extractDomain(company.website)) {
        const domain = websiteFinder.extractDomain(company.website)!

        console.log(`\n📧 Enriquecendo contatos para domínio: ${domain}`)

        for (const contact of insights.suggestedContacts) {
          console.log(`\n🔍 Enriquecendo: ${contact.name} (${contact.role})`)

          const enriched = await contactEnrichment.enrichContact(
            contact.name,
            contact.role,
            company.name,
            domain,
            contact.linkedin || undefined
          )

          enrichedContacts.push({
            name: enriched.name,
            role: enriched.role,
            email: enriched.email,
            phone: enriched.phone,
            linkedin: enriched.linkedin,
          })

          console.log(`   Source: ${enriched.source}`)
          console.log(`   Confidence: ${enriched.confidence}`)
          console.log(`   📧 ${enriched.email || 'N/A'}`)
          console.log(`   📱 ${enriched.phone || 'N/A'}`)

          // Rate limit para evitar sobrecarga de APIs
          await this.sleep(1000)
        }

        console.log(`\n✅ ${enrichedContacts.length} contatos enriquecidos`)
      } else {
        console.log(`\n⚠️  Website não disponível, usando contatos da IA sem enriquecimento`)
        enrichedContacts = insights.suggestedContacts
                contact.phone = apolloContact.phone
                contact.linkedin = apolloContact.linkedin_url || contact.linkedin
                console.log(`  ✅ ${contact.name}: ${apolloContact.email || 'N/A'} | ${apolloContact.phone || 'N/A'}`)
              }

              await this.sleep(1000) // Rate limit
            } catch (error) {
              console.error(`  ❌ Erro ao enriquecer ${contact.name}:`, error)
            }
          }
        }
      }

      // 5. Criar lead com contatos enriquecidos
      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          jobTitle: jobData.jobTitle,
          jobDescription: jobData.description,
          jobUrl: jobData.jobUrl,
          jobPostedDate: new Date(jobData.postedDate),
          jobSource: 'LinkedIn',
          candidateCount: jobData.applicants,
          suggestedContacts: JSON.stringify(enrichedContacts), // Contatos REAIS do Apollo
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
   * Consolida empresas duplicadas por nome normalizado
   */
  private async getOrCreateCompany(
    companyName: string,
    companyUrl?: string
  ): Promise<any> {
    // Normalizar nome da empresa para busca (remove acentos, lowercase, trim)
    const normalizedName = this.normalizeCompanyName(companyName)

    // Buscar todas as empresas e verificar se alguma corresponde ao nome normalizado
    const allCompanies = await prisma.company.findMany()
    let company = allCompanies.find(
      c => this.normalizeCompanyName(c.name) === normalizedName
    )

    if (company) {
      console.log(`✅ Empresa encontrada (consolidada): ${company.name}`)

      // Se empresa existe mas não foi enriquecida com IA há mais de 7 dias, enriquecer novamente
      const shouldReenrich =
        !company.enrichedAt ||
        (Date.now() - new Date(company.enrichedAt).getTime()) > 7 * 24 * 60 * 60 * 1000

      if (shouldReenrich) {
        console.log(`🔄 Re-enriquecendo empresa ${company.name} com IA...`)
        await this.enrichCompanyWithAI(company.id, company.name, company.sector, company.website)
      }

      return company
    }

    console.log(`🆕 Criando nova empresa: ${companyName}`)

    // Criar nova empresa
    // 1. Tentar enriquecer com CNPJ (Brasil API)
    const cnpj = await this.findCNPJ(companyName, companyUrl)
    let enrichmentData = null

    if (cnpj) {
      enrichmentData = await companyEnrichment.getCompanyByCNPJ(cnpj)
      await this.sleep(3000) // Rate limit Brasil API
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

    // 3. Enriquecer com IA (notícias, eventos, Instagram)
    await this.enrichCompanyWithAI(company.id, companyName, company.sector, company.website)

    return company
  }

  /**
   * Normaliza nome da empresa para comparação
   * Remove acentos, caracteres especiais, lowercase
   */
  private normalizeCompanyName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, ' ') // Remove espaços duplos
      .trim()
  }

  /**
   * Enriquece empresa com dados de IA (notícias, Instagram, eventos)
   */
  private async enrichCompanyWithAI(
    companyId: string,
    companyName: string,
    sector?: string | null,
    website?: string | null
  ): Promise<void> {
    try {
      console.log(`🤖 [AI Enrichment] Enriquecendo ${companyName}...`)

      const aiData = await aiCompanyEnrichment.enrichCompany(
        companyName,
        sector || undefined,
        website || undefined
      )

      // Salvar dados enriquecidos
      await prisma.company.update({
        where: { id: companyId },
        data: {
          estimatedRevenue: aiData.estimatedRevenue,
          estimatedEmployees: aiData.estimatedEmployees,
          location: aiData.location,
          recentNews: aiData.recentNews.length > 0
            ? JSON.stringify(aiData.recentNews)
            : null,
          upcomingEvents: aiData.upcomingEvents.length > 0
            ? JSON.stringify(aiData.upcomingEvents)
            : null,
          instagramHandle: aiData.socialMedia.instagram?.handle,
          instagramFollowers: aiData.socialMedia.instagram?.followers,
          linkedinFollowers: aiData.socialMedia.linkedin?.followers,
          industryPosition: aiData.industryPosition,
          keyInsights: aiData.keyInsights.length > 0
            ? JSON.stringify(aiData.keyInsights)
            : null,
          enrichedAt: new Date(),
        },
      })

      console.log(`✅ [AI Enrichment] ${companyName} enriquecida com sucesso!`)
      console.log(`   📊 Revenue: ${aiData.estimatedRevenue || 'N/A'}`)
      console.log(`   👥 Employees: ${aiData.estimatedEmployees || 'N/A'}`)
      console.log(`   📍 Localização: ${aiData.location || 'N/A'}`)
      console.log(`   📰 Notícias: ${aiData.recentNews.length}`)
      console.log(`   📅 Eventos: ${aiData.upcomingEvents.length}`)
      console.log(`   📱 Instagram: ${aiData.socialMedia.instagram?.handle || 'N/A'}`)
    } catch (error) {
      console.error(`❌ [AI Enrichment] Erro ao enriquecer ${companyName}:`, error)
    }
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

    // Buscar em múltiplas localizações para ter mais resultados
    const locations = [
      'São Paulo, Brazil',
      'Rio de Janeiro, Brazil',
      'Belo Horizonte, Brazil',
      'Curitiba, Brazil',
      'Porto Alegre, Brazil',
      'Brasília, Brazil',
      'Brazil', // Busca nacional
    ]

    // Scraping de todas as fontes em paralelo com múltiplas localizações
    console.log(`📍 Buscando em ${locations.length} localizações...`)

    const allLinkedInJobs: LinkedInJobData[] = []

    // Buscar LinkedIn em todas as localizações (7 dias de vagas)
    for (const location of locations) {
      try {
        console.log(`🔍 LinkedIn: ${location}`)
        const jobs = await linkedInScraper.searchJobs(query, location, 7) // 7 dias
        allLinkedInJobs.push(...jobs)
        await this.sleep(2000) // Delay entre buscas
      } catch (err) {
        console.error(`[LinkedIn ${location}] Erro:`, err)
      }
    }

    // Outras fontes (mock por enquanto)
    const [gupyJobs, cathoJobs] = await Promise.all([
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
      ...allLinkedInJobs.map(j => ({ ...j, source: 'LinkedIn' })),
      ...gupyJobs.map(j => ({ ...j, source: 'Gupy' })),
      ...cathoJobs.map(j => ({ ...j, source: 'Catho' })),
    ]

    console.log(`📊 Total de vagas encontradas: ${allJobs.length}`)
    console.log(`   - LinkedIn: ${allLinkedInJobs.length}`)
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
