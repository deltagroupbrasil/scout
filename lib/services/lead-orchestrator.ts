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
import { googlePeopleFinder } from "./google-people-finder"

export class LeadOrchestratorService {
  /**
   * Pipeline completo OTIMIZADO (Baixo Custo):
   * LinkedIn → Website Discovery → LinkedIn Company Scraping → CNPJ → PESSOAS REAIS (Google + Web Scraping) → Contact Enrichment
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

      // 3. Buscar PESSOAS REAIS via Google + Web Scraping (NÃO gerar nomes fictícios!)
      console.log(`\n🔍 Buscando pessoas REAIS da empresa...`)

      let enrichedContacts = []
      let triggers: string[] = []

      // Definir roles relevantes para busca
      const targetRoles = this.extractTargetRoles(jobData.jobTitle)
      console.log(`   Roles alvo: ${targetRoles.join(', ')}`)

      if (company.website && websiteFinder.extractDomain(company.website)) {
        const domain = websiteFinder.extractDomain(company.website)!

        // ETAPA 1: Buscar pessoas REAIS via Google Search + Web Scraping
        console.log(`\n📍 ETAPA 1: Buscar pessoas reais (Google + Website + Diretórios)`)

        const realPeople = await googlePeopleFinder.findRealPeople(
          company.name,
          company.website,
          targetRoles
        )

        console.log(`✅ Encontradas ${realPeople.length} pessoas REAIS`)

        if (realPeople.length > 0) {
          // FILTRAR: Apenas pessoas com EMAIL ou TELEFONE verificado
          const peopleWithContact = realPeople.filter(person => person.email || person.phone)

          if (peopleWithContact.length > 0) {
            enrichedContacts = peopleWithContact.map(person => ({
              name: person.name,
              role: person.role,
              email: person.email || null,
              phone: person.phone || null,
              linkedin: person.linkedinUrl || null,
            }))

            console.log(`\n✅ ${enrichedContacts.length} contatos REAIS com email/phone prontos!`)
          } else {
            console.log(`\n⚠️  Pessoas encontradas, mas NENHUMA com email ou telefone verificado`)
            console.log(`\n❌ Lead será criado SEM CONTATOS (apenas vaga + empresa)`)
          }
        } else {
          console.log(`\n⚠️  Nenhuma pessoa real encontrada via scraping`)
          console.log(`\n❌ Lead será criado SEM CONTATOS (apenas vaga + empresa)`)
        }

        // Gerar triggers com IA (sempre fazer, independente de ter pessoas reais ou não)
        if (triggers.length === 0) {
          console.log(`\n🤖 Gerando triggers com IA...`)
          const insights = await aiInsights.generateInsights(
            company.name,
            company.sector || '',
            jobData.jobTitle,
            jobData.description
          )
          triggers = insights.triggers
        }

      } else {
        console.log(`\n⚠️  Website não disponível - impossível buscar pessoas reais`)
        console.log(`\n❌ Lead será criado SEM CONTATOS (apenas vaga + empresa)`)

        // Gerar apenas triggers com IA (sem contatos fictícios)
        const insights = await aiInsights.generateInsights(
          company.name,
          company.sector || '',
          jobData.jobTitle,
          jobData.description
        )

        triggers = insights.triggers
        // enrichedContacts permanece vazio - NUNCA inventar contatos!
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
          suggestedContacts: JSON.stringify(enrichedContacts), // Contatos REAIS via scraping
          triggers: JSON.stringify(triggers),
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
   * Pipeline OTIMIZADO: Website Discovery → LinkedIn Scraping → CNPJ → AI Enrichment
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

      // Se empresa existe mas não tem website ou está desatualizada, enriquecer
      const shouldReenrich =
        !company.website ||
        !company.enrichedAt ||
        (Date.now() - new Date(company.enrichedAt).getTime()) > 7 * 24 * 60 * 60 * 1000

      if (shouldReenrich) {
        console.log(`🔄 Enriquecendo empresa ${company.name}...`)
        await this.enrichExistingCompany(company.id, company.name, companyUrl)
      }

      return company
    }

    console.log(`🆕 Criando nova empresa: ${companyName}`)

    // ============================================================================
    // NOVO PIPELINE OTIMIZADO (Baixo Custo)
    // ============================================================================

    // 1. Buscar CNPJ
    const cnpj = await this.findCNPJ(companyName, companyUrl)
    let cnpjData = null

    if (cnpj) {
      console.log(`📋 CNPJ encontrado: ${cnpj}`)
      cnpjData = await companyEnrichment.getCompanyByCNPJ(cnpj)
      await this.sleep(3000) // Rate limit Brasil API
    }

    // 2. Website Discovery (Claude AI + Smart Logic)
    console.log(`\n🌐 Descobrindo website...`)
    const websiteResult = await websiteFinder.findWebsite(
      companyName,
      companyUrl,
      cnpjData?.website
    )

    console.log(`   Website: ${websiteResult.website || 'N/A'}`)
    console.log(`   Domínio: ${websiteResult.domain || 'N/A'}`)
    console.log(`   Confiança: ${websiteResult.confidence}`)
    console.log(`   Fonte: ${websiteResult.source}`)

    // 3. LinkedIn Company Scraping (Bright Data) - DADOS REAIS
    let linkedInData = null
    if (companyUrl && companyUrl.includes('linkedin.com')) {
      try {
        console.log(`\n📊 Scraping LinkedIn Company Page...`)
        linkedInData = await linkedInCompanyScraper.scrapeCompanyPage(companyUrl)

        console.log(`   Seguidores: ${linkedInData.followers?.toLocaleString() || 'N/A'}`)
        console.log(`   Funcionários: ${linkedInData.employees || 'N/A'} (${linkedInData.employeesCount || 'N/A'})`)
        console.log(`   Indústria: ${linkedInData.industry || 'N/A'}`)
        console.log(`   Sede: ${linkedInData.headquarters || 'N/A'}`)

        // Se LinkedIn retornou website melhor, usar ele
        if (linkedInData.website && websiteResult.confidence !== 'high') {
          websiteResult.website = linkedInData.website
          websiteResult.domain = websiteFinder.extractDomain(linkedInData.website) || websiteResult.domain
          websiteResult.confidence = 'high'
          websiteResult.source = 'linkedin_scraping'
          console.log(`   ✅ Website atualizado do LinkedIn: ${linkedInData.website}`)
        }

        await this.sleep(2000)
      } catch (error) {
        console.error(`   ❌ Erro ao scraping LinkedIn:`, error)
      }
    }

    // 4. Criar empresa com dados consolidados
    company = await prisma.company.create({
      data: {
        name: companyName,
        cnpj: cnpjData?.cnpj || cnpj || null,
        revenue: cnpjData?.revenue || null,
        employees: linkedInData?.employeesCount || cnpjData?.employees || null, // Prioriza LinkedIn real
        sector: linkedInData?.industry || cnpjData?.sector || null,
        website: websiteResult.website || cnpjData?.website || null,
        linkedinUrl: companyUrl || null,
        linkedinFollowers: linkedInData?.followers || null, // REAL do LinkedIn
        location: linkedInData?.headquarters || null,
      },
    })

    console.log(`✅ Empresa criada: ${company.name}`)

    // 5. Enriquecer com IA (notícias, eventos, Instagram)
    await this.enrichCompanyWithAI(company.id, companyName, company.sector, company.website)

    return company
  }

  /**
   * Enriquece empresa existente (apenas se desatualizada)
   */
  private async enrichExistingCompany(
    companyId: string,
    companyName: string,
    companyUrl?: string
  ): Promise<void> {
    try {
      const company = await prisma.company.findUnique({ where: { id: companyId } })
      if (!company) return

      // 1. Website Discovery (se não tiver)
      if (!company.website && companyUrl) {
        console.log(`\n🌐 Descobrindo website...`)
        const websiteResult = await websiteFinder.findWebsite(
          companyName,
          companyUrl,
          company.website || undefined
        )

        if (websiteResult.website) {
          await prisma.company.update({
            where: { id: companyId },
            data: { website: websiteResult.website },
          })
          console.log(`   ✅ Website descoberto: ${websiteResult.website}`)
        }
      }

      // 2. LinkedIn Scraping (se tiver URL e não tiver followers)
      if (company.linkedinUrl && !company.linkedinFollowers) {
        try {
          console.log(`\n📊 Scraping LinkedIn Company Page...`)
          const linkedInData = await linkedInCompanyScraper.scrapeCompanyPage(company.linkedinUrl)

          await prisma.company.update({
            where: { id: companyId },
            data: {
              linkedinFollowers: linkedInData.followers,
              employees: linkedInData.employeesCount || company.employees,
              sector: linkedInData.industry || company.sector,
              location: linkedInData.headquarters || company.location,
              website: linkedInData.website || company.website,
            },
          })

          console.log(`   ✅ LinkedIn atualizado: ${linkedInData.followers} seguidores`)
          await this.sleep(2000)
        } catch (error) {
          console.error(`   ❌ Erro ao scraping LinkedIn:`, error)
        }
      }

      // 3. AI Enrichment
      await this.enrichCompanyWithAI(companyId, companyName, company.sector, company.website)
    } catch (error) {
      console.error(`❌ Erro ao enriquecer empresa ${companyName}:`, error)
    }
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

      // Buscar empresa atual para verificar campos faltantes
      const currentCompany = await prisma.company.findUnique({
        where: { id: companyId },
        select: { cnpj: true, revenue: true, employees: true },
      })

      // Preparar dados para atualização
      const updateData: any = {
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
      }

      // Se IA encontrou CNPJ e banco não tem, usar o da IA
      if (aiData.cnpj && !currentCompany?.cnpj) {
        updateData.cnpj = aiData.cnpj
        console.log(`   🆔 CNPJ encontrado pela IA: ${aiData.cnpj}`)

        // Tentar buscar dados completos na Receita Federal com CNPJ da IA
        try {
          const cnpjData = await companyEnrichment.getCompanyByCNPJ(aiData.cnpj)
          if (cnpjData) {
            if (!currentCompany?.revenue && cnpjData.revenue) {
              updateData.revenue = cnpjData.revenue
              console.log(`   💰 Revenue da Receita: R$ ${(cnpjData.revenue / 1_000_000).toFixed(1)}M`)
            }
            if (!currentCompany?.employees && cnpjData.employees) {
              updateData.employees = cnpjData.employees
              console.log(`   👥 Funcionários da Receita: ${cnpjData.employees}`)
            }
          }
        } catch (error) {
          console.warn(`   ⚠️  Erro ao buscar CNPJ na Receita Federal:`, error)
        }
      }

      // Salvar dados enriquecidos
      await prisma.company.update({
        where: { id: companyId },
        data: updateData,
      })

      console.log(`✅ [AI Enrichment] ${companyName} enriquecida com sucesso!`)
      console.log(`   📊 Revenue estimado: ${aiData.estimatedRevenue || 'N/A'}`)
      console.log(`   👥 Employees estimado: ${aiData.estimatedEmployees || 'N/A'}`)
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

  /**
   * Extrai roles alvo baseado no título da vaga
   * Ex: "Controller Jr" → ["CFO", "Finance Director", "Controller"]
   */
  private extractTargetRoles(jobTitle: string): string[] {
    const lowerTitle = jobTitle.toLowerCase()

    // Se é vaga de Controller/Controladoria, buscar CFO e Finance Directors
    if (lowerTitle.includes('controller') || lowerTitle.includes('controladoria')) {
      return [
        'CFO',
        'Chief Financial Officer',
        'Finance Director',
        'Diretor Financeiro',
        'Controller',
        'Gerente de Controladoria'
      ]
    }

    // Se é vaga de BPO, buscar CFO e diretores
    if (lowerTitle.includes('bpo') || lowerTitle.includes('financeiro')) {
      return [
        'CFO',
        'Finance Director',
        'Diretor Financeiro',
        'Gerente Financeiro',
        'Controller'
      ]
    }

    // Default: buscar CFO e Finance Director
    return [
      'CFO',
      'Chief Financial Officer',
      'Finance Director',
      'Diretor Financeiro'
    ]
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export const leadOrchestrator = new LeadOrchestratorService()
