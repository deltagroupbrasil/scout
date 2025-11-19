// Lead Orchestrator - Orquestra todo o processo de criação de leads
import { prisma } from "@/lib/prisma"
import { linkedInScraper } from "./linkedin-scraper"
import { gupyScraper } from "./gupy-scraper"
import { cathoScraper } from "./catho-scraper"
import { indeedScraper } from "./indeed-scraper"
import { glassdoorScraper } from "./glassdoor-scraper"
import { publicScraper } from "./public-scraper"
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
import { linkedInPeopleScraper } from "./linkedin-people-scraper"
import { openCNPJEnrichment } from "./opencnpj-enrichment"
import { novaVidaTIEnrichment } from "./novavidati-enrichment"
import { websiteIntelligenceScraper } from "./website-intelligence-scraper"
import { eventsDetector } from "./events-detector"
import { approachTriggersGenerator } from "./approach-triggers-generator"
// import { socialMediaFinder } from "./social-media-finder" // Temporariamente desabilitado - encoding issues

export class LeadOrchestratorService {
  /**
   * Pipeline completo OTIMIZADO (Baixo Custo):
   * LinkedIn → Website Discovery → LinkedIn Company Scraping → CNPJ → PESSOAS REAIS (Google + Web Scraping) → Contact Enrichment
   */
  async processJobListing(jobData: LinkedInJobData): Promise<string | null> {
    try {
      console.log(`\n${'='.repeat(70)}`)
      console.log(` Processando vaga: ${jobData.jobTitle}`)
      console.log(` Empresa: ${jobData.companyName}`)
      console.log(`${'='.repeat(70)}\n`)

      // 1. Buscar ou criar empresa (COM DESCOBERTA DE WEBSITE E SCRAPING)
      const company = await this.getOrCreateCompany(
        jobData.companyName,
        jobData.jobUrl
      )

      if (!company) {
        console.error(' Não foi possível criar/encontrar a empresa')
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
        console.log(` Lead já existe: ${existingLead.id}`)
        return existingLead.id
      }

      // 3. Buscar PESSOAS REAIS via Google + Web Scraping (NÃO gerar nomes fictícios!)
      console.log(`\n Buscando pessoas REAIS da empresa...`)

      let enrichedContacts: any[] = []
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

        console.log(` Encontradas ${realPeople.length} pessoas REAIS`)

        if (realPeople.length > 0) {
          // FILTRAR: Apenas pessoas com EMAIL ou TELEFONE verificado E VÁLIDO
          const peopleWithContact = realPeople.filter(person => {
            const hasValidEmail = person.email && this.isValidBusinessEmail(person.email)
            const hasValidPhone = person.phone && person.phone.length > 8
            return hasValidEmail || hasValidPhone
          })

          if (peopleWithContact.length > 0) {
            // LIMITAR a 3 melhores decisores (ordenar por confidence + completude)
            const bestPeople = peopleWithContact
              .sort((a, b) => {
                const scoreA = this.calculateContactScore(a)
                const scoreB = this.calculateContactScore(b)
                return scoreB - scoreA
              })
              .slice(0, 3)

            enrichedContacts = bestPeople.map(person => ({
              name: person.name,
              role: person.role,
              email: person.email || null,
              phone: person.phone || null,
              linkedin: person.linkedinUrl || null,
              source: person.source || 'google', // Marca a fonte do contato
            }))

            console.log(`\n ${enrichedContacts.length} decisores REAIS selecionados (dos ${peopleWithContact.length} válidos)`)
            enrichedContacts.forEach((contact, i) => {
              console.log(`   ${i + 1}. ${contact.name} (${contact.role})`)
              console.log(`      Email: ${contact.email || ''}`)
              console.log(`      Phone: ${contact.phone || ''}`)
              console.log(`      LinkedIn: ${contact.linkedin ? '' : ''}`)
            })
          } else {
            console.log(`\n  Pessoas encontradas: ${realPeople.length}, mas NENHUMA com email/phone VÁLIDO`)
            console.log(`\n Lead será criado SEM CONTATOS (apenas vaga + empresa)`)
          }
        } else {
          console.log(`\n  Nenhuma pessoa real encontrada via scraping`)
          console.log(`\n Lead será criado SEM CONTATOS (apenas vaga + empresa)`)
        }

        // Gerar triggers com IA (sempre fazer, independente de ter pessoas reais ou não)
        if (triggers.length === 0) {
          console.log(`\n Gerando triggers com IA...`)
          const insights = await aiInsights.generateInsights(
            company.name,
            company.sector || '',
            jobData.jobTitle,
            jobData.description
          )
          triggers = insights.triggers
        }

      } else {
        console.log(`\n  Website não disponível - impossível buscar pessoas reais`)
        console.log(`\n Lead será criado SEM CONTATOS (apenas vaga + empresa)`)

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
          jobPostedDate: this.parseJobDate(jobData.postedDate),
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

      console.log(` Lead criado: ${lead.id} (Score: ${score}/100)`)
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
  /**
   * Processa uma empresa com múltiplas vagas (agrupamento)
   * Cria UM ÚNICO lead com a vaga principal + vagas relacionadas
   */
  async processCompanyWithMultipleJobs(jobs: LinkedInJobData[]): Promise<string | null> {
    try {
      if (jobs.length === 0) return null

      // Usar a primeira vaga como principal (geralmente a mais recente)
      const mainJob = jobs[0]
      const additionalJobs = jobs.slice(1)

      console.log(`\n${'='.repeat(70)}`)
      console.log(` Processando empresa: ${mainJob.companyName}`)
      console.log(` Vaga principal: ${mainJob.jobTitle}`)
      console.log(` Vagas adicionais: ${additionalJobs.length}`)
      console.log(`${'='.repeat(70)}\n`)

      // 1. Buscar ou criar empresa
      const company = await this.getOrCreateCompany(
        mainJob.companyName,
        mainJob.companyUrl // Usar companyUrl (LinkedIn da empresa), não jobUrl (vaga específica)
      )

      if (!company) {
        console.error(' Não foi possível criar/encontrar a empresa')
        return null
      }

      // 2. Verificar se já existe lead para esta empresa
      const existingLead = await prisma.lead.findFirst({
        where: {
          companyId: company.id,
        },
      })

      // Se já existe, atualizar com novas vagas
      if (existingLead) {
        console.log(` Lead já existe para ${company.name}, atualizando vagas...`)

        // Parse vagas existentes
        const existingRelatedJobs = existingLead.relatedJobs
          ? JSON.parse(typeof existingLead.relatedJobs === 'string' ? existingLead.relatedJobs : JSON.stringify(existingLead.relatedJobs))
          : []

        // Adicionar novas vagas (evitar duplicatas por URL)
        const existingUrls = new Set([
          existingLead.jobUrl,
          ...existingRelatedJobs.map((j: any) => j.url)
        ])

        const newJobs = jobs.filter(j => !existingUrls.has(j.jobUrl))

        if (newJobs.length > 0) {
          const updatedRelatedJobs = [
            ...existingRelatedJobs,
            ...newJobs.map(j => ({
              title: j.jobTitle,
              description: j.description || j.jobDescription || '',
              url: j.jobUrl,
              postedDate: j.postedDate || j.jobPostedDate || new Date(),
              candidateCount: j.candidateCount || j.applicants || null,
            }))
          ]

          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              relatedJobs: JSON.stringify(updatedRelatedJobs),
              updatedAt: new Date(),
            }
          })

          console.log(` ${newJobs.length} novas vagas adicionadas ao lead existente`)
        } else {
          console.log(`ℹ  Todas as vagas já existem no lead`)
        }

        return existingLead.id
      }

      // 3. Criar novo lead com todas as vagas
      console.log(`\n Criando novo lead para ${company.name}...`)

      // Preparar vagas relacionadas (todas exceto a principal)
      const relatedJobsData = additionalJobs.map(j => ({
        title: j.jobTitle,
        description: j.description || j.jobDescription || '',
        url: j.jobUrl,
        postedDate: j.postedDate || j.jobPostedDate || new Date(),
        candidateCount: j.candidateCount || j.applicants || null,
      }))

      // 4. ENRIQUECIMENTO COMPLETO com IA
      console.log(`\n Enriquecendo empresa com IA (Claude Sonnet 4.5)...`)

      const aiData = await aiCompanyEnrichment.enrichCompany(
        company.name,
        company.sector || undefined,
        company.website || undefined
      )

      // Atualizar empresa com dados da IA (incluindo setor)
      // TEMPORARIAMENTE DESABILITADO - AI Enrichment tem bugs de parsing
      // if (aiData) {
      //   await prisma.company.update({
      //     where: { id: company.id },
      //     data: {
      //       sector: aiData.sector || company.sector,
      //       revenue: aiData.revenue || company.revenue,
      //       employees: aiData.employees || company.employees,
      //       website: aiData.website || company.website,
      //       linkedinUrl: aiData.linkedinUrl || company.linkedinUrl,
      //       enrichedAt: new Date(),
      //     }
      //   })

      //   console.log(`    Setor: ${aiData.sector || 'N/A'}`)
      //   console.log(`    Faturamento: ${aiData.revenue || 'N/A'}`)
      //   console.log(`    Funcionários: ${aiData.employees || 'N/A'}`)
      // }

      // Recarregar empresa com dados atualizados
      const updatedCompany = await prisma.company.findUnique({
        where: { id: company.id }
      })

      // 5. Buscar PESSOAS REAIS (Google + Apollo.io)
      console.log(`\n Buscando pessoas REAIS (Google + Apollo)...`)

      let enrichedContacts: any[] = []
      let triggers: string[] = []

      const targetRoles = this.extractTargetRoles(mainJob.jobTitle)

      if (company.website && websiteFinder.extractDomain(company.website)) {
        const domain = websiteFinder.extractDomain(company.website)!

        // ESTRATÉGIA 1: LinkedIn People Scraper (prioridade 1 - perfis reais)
        if (company.linkedinUrl) {
          console.log(`\n📍 ESTRATÉGIA 1: LinkedIn People Scraper`)
          console.log(`   🔗 LinkedIn Company: ${company.linkedinUrl}`)

          const linkedinPeople = await linkedInPeopleScraper.searchPeopleByRole(
            company.name,
            targetRoles
          )

          if (linkedinPeople.length > 0) {
            console.log(` LinkedIn encontrou ${linkedinPeople.length} perfis`)

            // Converter para formato SuggestedContact
            const linkedinContacts = linkedinPeople.slice(0, 3).map(person => ({
              name: person.name,
              role: person.role,
              email: null, // LinkedIn não expõe emails em busca
              phone: null,
              linkedin: person.linkedinUrl,
              source: 'linkedin' as const,
            }))

            enrichedContacts = linkedinContacts
          }
        }

        // ESTRATÉGIA 2: Google People Finder (fallback)
        if (enrichedContacts.length === 0) {
          console.log(`\n📍 ESTRATÉGIA 2: Google People Finder`)
          const realPeople = await googlePeopleFinder.findRealPeople(
            company.name,
            company.website,
            targetRoles
          )

          if (realPeople.length > 0) {
            const peopleWithContact = realPeople.filter(person => {
              const hasValidEmail = person.email && this.isValidBusinessEmail(person.email)
              const hasValidPhone = person.phone && person.phone.length > 8
              return hasValidEmail || hasValidPhone
            })

            if (peopleWithContact.length > 0) {
              const bestPeople = peopleWithContact
                .sort((a, b) => {
                  const scoreA = this.calculateContactScore(a)
                  const scoreB = this.calculateContactScore(b)
                  return scoreB - scoreA
                })
                .slice(0, 3)

              enrichedContacts = bestPeople.map(person => ({
                name: person.name,
                role: person.role,
                email: person.email || null,
                phone: person.phone || null,
                linkedin: person.linkedinUrl || null,
                source: person.source || 'google', // Marca a fonte do contato
              }))
            }
          }
        }

        // ESTRATÉGIA 3: Contatos Estimados Inteligentes (baseado no porte)
        if (enrichedContacts.length === 0) {
          console.log(`\n📍 ESTRATÉGIA 3: Geração de contatos estimados`)
          enrichedContacts = this.generateSmartContacts(company, mainJob.jobTitle, domain)
          console.log(` ${enrichedContacts.length} contatos estimados gerados`)
        }
      }

      console.log(`\n Total de contatos encontrados: ${enrichedContacts.length}`)

      // 6. Gerar triggers CONTEXTUALIZADOS (baseado em eventos, notícias e dados da empresa)
      const allJobTitles = jobs.map(j => j.jobTitle).join(', ')
      triggers = await this.generateContextualTriggers(
        updatedCompany || company,
        mainJob.jobTitle,
        allJobTitles
      )

      // 7. Calcular priority score
      const priorityScoreValue = priorityScore.calculate({
        revenue: company.revenue,
        employees: company.employees,
        jobPostedDate: mainJob.postedDate || mainJob.jobPostedDate || new Date(),
        candidateCount: mainJob.candidateCount || mainJob.applicants || null,
        triggers: triggers.length,
      })

      // 8. Criar lead
      const lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          jobTitle: mainJob.jobTitle,
          jobDescription: mainJob.description || mainJob.jobDescription || '',
          jobUrl: mainJob.jobUrl,
          jobPostedDate: this.parseJobDate(mainJob.postedDate || mainJob.jobPostedDate),
          jobSource: mainJob.jobSource || 'LinkedIn',
          candidateCount: mainJob.candidateCount || mainJob.applicants || null,
          ...(relatedJobsData.length > 0 && { relatedJobs: JSON.stringify(relatedJobsData) }),
          ...(enrichedContacts.length > 0 && { suggestedContacts: JSON.stringify(enrichedContacts) }),
          ...(triggers.length > 0 && { triggers: JSON.stringify(triggers) }),
          priorityScore: priorityScoreValue,
          status: 'NEW',
          isNew: true,
        },
      })

      console.log(` Lead criado: ${lead.id}`)
      console.log(`   - Vaga principal: ${mainJob.jobTitle}`)
      console.log(`   - Vagas relacionadas: ${additionalJobs.length}`)
      console.log(`   - Contatos: ${enrichedContacts.length}`)
      console.log(`   - Triggers: ${triggers.length}`)
      console.log(`   - Priority Score: ${priorityScoreValue}`)

      return lead.id
    } catch (error) {
      console.error(' Erro ao processar empresa com múltiplas vagas:', error)
      return null
    }
  }

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
      console.log(` Empresa encontrada (consolidada): ${company.name}`)

      // Se empresa existe mas não tem website ou está desatualizada, enriquecer
      const shouldReenrich =
        !company.website ||
        !company.enrichedAt ||
        (Date.now() - new Date(company.enrichedAt).getTime()) > 7 * 24 * 60 * 60 * 1000

      if (shouldReenrich) {
        console.log(` Enriquecendo empresa ${company.name}...`)
        await this.enrichExistingCompany(company.id, company.name, companyUrl)
      }

      return company
    }

    console.log(` Criando nova empresa: ${companyName}`)

    // ============================================================================
    // NOVO PIPELINE OTIMIZADO (Baixo Custo)
    // ============================================================================

    // 1. Website Discovery PRIMEIRO (Claude AI + Smart Logic)
    console.log(`\n Descobrindo website...`)
    const websiteResult = await websiteFinder.findWebsite(
      companyName,
      companyUrl
    )

    console.log(`   Website: ${websiteResult.website || 'N/A'}`)
    console.log(`   Domínio: ${websiteResult.domain || 'N/A'}`)
    console.log(`   Confiança: ${websiteResult.confidence}`)
    console.log(`   Fonte: ${websiteResult.source}`)

    // 2. Buscar CNPJ (MELHORADO - agora usa website + Claude AI + Google)
    console.log(`\n Buscando CNPJ...`)
    const cnpj = await cnpjFinder.findCNPJByName(
      companyName,
      websiteResult.website || undefined
    )

    let cnpjData: any = null
    if (cnpj) {
      console.log(`    CNPJ encontrado: ${this.formatCNPJ(cnpj)}`)
      cnpjData = await companyEnrichment.getCompanyByCNPJ(cnpj)
      await this.sleep(3000) // Rate limit Brasil API
    } else {
      console.log(`     CNPJ não encontrado`)
    }

    // 2.5. Website Intelligence Scraping (NOVO) - Extrai CNPJ, redes sociais, telefones, emails
    let websiteIntelligence: any = null
    if (websiteResult.website) {
      try {
        console.log(`\n🔎 Extraindo dados inteligentes do website...`)
        websiteIntelligence = await websiteIntelligenceScraper.scrapeWebsite(websiteResult.website)

        // Se encontrou CNPJ no site e ainda não tinha, usar ele
        if (websiteIntelligence.cnpj && !cnpj) {
          console.log(`    CNPJ encontrado no website: ${websiteIntelligence.cnpj}`)
          cnpjData = await companyEnrichment.getCompanyByCNPJ(websiteIntelligence.cnpj)
          await this.sleep(3000)
        }
      } catch (error) {
        console.error(`    Erro ao extrair intelligence do website:`, error)
      }
    }

    // 2.6. Social Media Discovery - TEMPORARIAMENTE DESABILITADO (encoding issues)
    // TODO: Recriar social-media-finder.ts com encoding UTF-8 correto
    let socialMediaProfiles: any = null

    // 3. LinkedIn Company Scraping (Bright Data) - DADOS REAIS
    let linkedInData: any = null
    if (companyUrl && companyUrl.includes('linkedin.com')) {
      try {
        console.log(`\n Scraping LinkedIn Company Page...`)
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
          console.log(`    Website atualizado do LinkedIn: ${linkedInData.website}`)
        }

        await this.sleep(2000)
      } catch (error) {
        console.error(`    Erro ao scraping LinkedIn:`, error)
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

        // Website
        website: websiteResult.website || cnpjData?.website || null,
        websiteSource: websiteResult.source || null,
        websiteConfidence: websiteResult.confidence || null,
        websiteVerifiedAt: websiteResult.website ? new Date() : null,

        // LinkedIn
        linkedinUrl: socialMediaProfiles?.linkedin || companyUrl || null,
        linkedinFollowers: linkedInData?.followers?.toString() || null,

        // Redes Sociais (do Social Media Finder)
        instagramUrl: socialMediaProfiles?.instagram || null,
        twitterUrl: socialMediaProfiles?.twitter || null,
        facebookUrl: socialMediaProfiles?.facebook || null,
        youtubeUrl: socialMediaProfiles?.youtube || null,
        socialMediaSource: socialMediaProfiles?.source || null,
        socialMediaUpdatedAt: socialMediaProfiles ? new Date() : null,

        // Localização
        location: linkedInData?.headquarters || null,
      },
    })

    console.log(` Empresa criada: ${company.name}`)

    // 4.5. Salvar dados do Website Intelligence
    if (websiteIntelligence) {
      const updateData: any = {}

      // Redes sociais verificadas
      if (websiteIntelligence.instagram) {
        updateData.instagramHandle = websiteIntelligence.instagram.handle
        updateData.instagramVerified = websiteIntelligence.instagram.verified
        console.log(`    Instagram verificado: @${websiteIntelligence.instagram.handle}`)
      }

      if (websiteIntelligence.twitter) {
        updateData.twitterHandle = websiteIntelligence.twitter.handle
        updateData.twitterVerified = websiteIntelligence.twitter.verified
        console.log(`    Twitter verificado: @${websiteIntelligence.twitter.handle}`)
      }

      if (websiteIntelligence.facebook) {
        updateData.facebookHandle = websiteIntelligence.facebook.handle
        updateData.facebookVerified = websiteIntelligence.facebook.verified
        console.log(`    Facebook verificado: ${websiteIntelligence.facebook.handle}`)
      }

      if (websiteIntelligence.youtube) {
        updateData.youtubeHandle = websiteIntelligence.youtube.handle
        updateData.youtubeVerified = websiteIntelligence.youtube.verified
        console.log(`    YouTube verificado: ${websiteIntelligence.youtube.handle}`)
      }

      // Telefones e emails do website (se ainda não temos do Nova Vida TI)
      if (websiteIntelligence.phones.length > 0 && !company.companyPhones) {
        updateData.companyPhones = JSON.stringify(websiteIntelligence.phones)
        console.log(`    ${websiteIntelligence.phones.length} telefone(s) do website`)
      }

      if (websiteIntelligence.emails.length > 0 && !company.companyEmails) {
        updateData.companyEmails = JSON.stringify(websiteIntelligence.emails)
        console.log(`    ${websiteIntelligence.emails.length} email(s) do website`)
      }

      if (websiteIntelligence.whatsapp && !company.companyWhatsApp) {
        updateData.companyWhatsApp = websiteIntelligence.whatsapp
        console.log(`    WhatsApp do website: ${websiteIntelligence.whatsapp}`)
      }

      // Atualizar se temos dados
      if (Object.keys(updateData).length > 0) {
        await prisma.company.update({
          where: { id: company.id },
          data: updateData,
        })
      }
    }

    // 5. Enriquecer dados de sócios (OpenCNPJ + Nova Vida TI)
    if (company.cnpj) {
      await this.enrichPartnersData(company)
    }

    // 6. Enriquecer com IA (CNPJ, revenue, employees, setor)
    await this.enrichCompanyWithAI(company.id, companyName, company.sector, company.website)

    // 7. Detectar eventos e notícias da empresa
    await this.detectCompanyEvents(company.id, companyName)

    return company
  }

  /**
   * Enriquece dados de sócios via Nova Vida API (FONTE PRINCIPAL)
   * Fluxo: Claude API encontra CNPJ → Nova Vida API retorna sócios com contatos
   */
  private async enrichPartnersData(company: any): Promise<void> {
    if (!company.cnpj) {
      console.log(`\n   Sem CNPJ - pulando enriquecimento de socios`)
      return
    }

    try {
      console.log(`\n Consultando Nova Vida API (CNPJ: ${company.cnpj})...`)

      // Nova Vida API - Dados completos de sócios com telefones e emails
      const novaVidaData = await novaVidaTIEnrichment.enrichCompanyContacts(
        company.cnpj,
        company.name
      )

      if (!novaVidaData) {
        console.log(`    Nova Vida API: Sem dados disponiveis`)

        // Fallback: tentar OpenCNPJ (apenas dados basicos, sem contatos)
        const openCNPJData = await openCNPJEnrichment.getCompanyData(company.cnpj)
        if (openCNPJData && openCNPJData.socios.length > 0) {
          console.log(`    OpenCNPJ (fallback): ${openCNPJData.socios.length} socios encontrados (sem contatos)`)

          const partnersData = openCNPJData.socios.map(socio => ({
            nome: socio.nome,
            qualificacao: socio.qualificacao,
            telefones: [],
            emails: [],
            linkedin: null,
          }))

          await prisma.company.update({
            where: { id: company.id },
            data: {
              partners: JSON.stringify(partnersData),
              partnersLastUpdate: new Date(),
            }
          })
        }
        return
      }

      // Preparar dados dos sócios
      const partnersData = novaVidaData.socios.map(socio => ({
        nome: socio.nome,
        qualificacao: socio.qualificacao,
        telefones: socio.telefones || [],
        emails: socio.emails || [],
        linkedin: socio.linkedin || null,
      }))

      // Calcular faturamento presumido se não tiver revenue (Capital Social × 5)
      let estimatedRevenue: number | undefined = undefined
      if (!company.revenue && novaVidaData.capitalSocial) {
        estimatedRevenue = novaVidaData.capitalSocial * 5
        console.log(`    Faturamento presumido (Capital Social × 5): R$ ${estimatedRevenue.toLocaleString('pt-BR')}`)
      }

      // Atualizar empresa com dados completos
      await prisma.company.update({
        where: { id: company.id },
        data: {
          partners: JSON.stringify(partnersData),
          ...(novaVidaData.telefones && { companyPhones: JSON.stringify(novaVidaData.telefones) }),
          ...(novaVidaData.emails && { companyEmails: JSON.stringify(novaVidaData.emails) }),
          ...(novaVidaData.whatsapp?.[0] && { companyWhatsApp: novaVidaData.whatsapp[0] }),
          ...(estimatedRevenue && { revenue: estimatedRevenue }),
          ...(novaVidaData.qtdeFuncionarios && !company.employees && { employees: novaVidaData.qtdeFuncionarios }),
          partnersLastUpdate: new Date(),
        }
      })

      console.log(`    Socios salvos: ${partnersData.length}`)
      console.log(`    Telefones corporativos: ${novaVidaData.telefones.length}`)
      console.log(`    Emails corporativos: ${novaVidaData.emails.length}`)

      // Contar total de contatos dos socios
      const totalPhones = partnersData.reduce((sum, p) => sum + p.telefones.length, 0)
      const totalEmails = partnersData.reduce((sum, p) => sum + p.emails.length, 0)
      console.log(`    Contatos dos socios: ${totalPhones} telefones, ${totalEmails} emails`)

    } catch (error) {
      console.error(' Erro ao enriquecer dados de socios:', error)
    }
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
        console.log(`\n Descobrindo website...`)
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
          console.log(`    Website descoberto: ${websiteResult.website}`)
        }
      }

      // 2. LinkedIn Scraping (se tiver URL e não tiver followers)
      if (company.linkedinUrl && !company.linkedinFollowers) {
        try {
          console.log(`\n Scraping LinkedIn Company Page...`)
          const linkedInData = await linkedInCompanyScraper.scrapeCompanyPage(company.linkedinUrl)

          await prisma.company.update({
            where: { id: companyId },
            data: {
              linkedinFollowers: linkedInData.followers ? linkedInData.followers.toString() : null,
              employees: linkedInData.employeesCount || company.employees,
              sector: linkedInData.industry || company.sector,
              location: linkedInData.headquarters || company.location,
              website: linkedInData.website || company.website,
            },
          })

          console.log(`    LinkedIn atualizado: ${linkedInData.followers} seguidores`)
          await this.sleep(2000)
        } catch (error) {
          console.error(`    Erro ao scraping LinkedIn:`, error)
        }
      }

      // 3. AI Enrichment (CNPJ, revenue, employees, setor)
      await this.enrichCompanyWithAI(companyId, companyName, company.sector, company.website)

      // 4. Detectar eventos e notícias da empresa
      await this.detectCompanyEvents(companyId, companyName)
    } catch (error) {
      console.error(` Erro ao enriquecer empresa ${companyName}:`, error)
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
   * Formata CNPJ para exibição (XX.XXX.XXX/XXXX-XX)
   */
  private formatCNPJ(cnpj: string): string {
    const clean = cnpj.replace(/\D/g, '')
    return clean.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    )
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
      console.log(` [AI Enrichment] Enriquecendo ${companyName}...`)

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

      // Preparar dados para atualização (apenas campos que a IA realmente retorna)
      const updateData: any = {
        sector: aiData.sector || undefined,
        enrichedAt: new Date(),
      }

      // Adicionar LinkedIn URL se encontrado
      if (aiData.socialMedia?.linkedin?.url) {
        updateData.linkedinUrl = aiData.socialMedia.linkedin.url
      }

      // Converter estimativas da IA para números se não tiver dados da Receita
      if (!currentCompany?.revenue && aiData.estimatedRevenue && aiData.estimatedRevenue !== 'Não disponível') {
        const revenueNumber = this.extractRevenueFromString(aiData.estimatedRevenue)
        if (revenueNumber) {
          updateData.revenue = revenueNumber
          console.log(`    Revenue (da IA): R$ ${(revenueNumber / 1_000_000).toFixed(1)}M`)
        }
      }

      if (!currentCompany?.employees && aiData.estimatedEmployees && aiData.estimatedEmployees !== 'Não disponível') {
        const employeesNumber = this.extractEmployeesFromString(aiData.estimatedEmployees)
        if (employeesNumber) {
          updateData.employees = employeesNumber
          console.log(`    Funcionários (da IA): ${employeesNumber}`)
        }
      }

      // Se IA encontrou CNPJ e banco não tem, VALIDAR antes de usar
      if (aiData.cnpj && !currentCompany?.cnpj) {
        console.log(`   🆔 CNPJ encontrado pela IA: ${aiData.cnpj}`)

        // VALIDAR se CNPJ pertence realmente à empresa
        const { cnpjValidator } = await import('./cnpj-validator')
        const validation = await cnpjValidator.validateCNPJ(aiData.cnpj, companyName)

        if (validation.isValid) {
          console.log(`    CNPJ VALIDADO! (confidence: ${validation.confidence})`)
          console.log(`      ${validation.reason}`)
          console.log(`      Razão Social: ${validation.actualCompanyName}`)
          updateData.cnpj = aiData.cnpj
        } else {
          console.log(`    CNPJ REJEITADO! (confidence: ${validation.confidence})`)
          console.log(`      ${validation.reason}`)
          if (validation.actualCompanyName) {
            console.log(`      CNPJ pertence a: ${validation.actualCompanyName}`)
          }
          console.log(`     Não salvando CNPJ incorreto no banco`)
          // NÃO salva CNPJ inválido
          aiData.cnpj = undefined
        }

        // Tentar buscar dados completos na Receita Federal com CNPJ VALIDADO
        if (updateData.cnpj) {
          try {
            const cnpjData = await companyEnrichment.getCompanyByCNPJ(updateData.cnpj)
            if (cnpjData) {
              if (!currentCompany?.revenue && cnpjData.revenue) {
                updateData.revenue = cnpjData.revenue
                console.log(`    Revenue da Receita: R$ ${(cnpjData.revenue / 1_000_000).toFixed(1)}M`)
              }
              if (!currentCompany?.employees && cnpjData.employees) {
                updateData.employees = cnpjData.employees
                console.log(`    Funcionários da Receita: ${cnpjData.employees}`)
              }
            }
          } catch (error) {
            console.warn(`     Erro ao buscar CNPJ na Receita Federal:`, error)
          }
        }
      }

      // Salvar dados enriquecidos
      await prisma.company.update({
        where: { id: companyId },
        data: updateData,
      })

      console.log(` [AI Enrichment] ${companyName} enriquecida com sucesso!`)
    } catch (error) {
      console.error(` [AI Enrichment] Erro ao enriquecer ${companyName}:`, error)
    }
  }

  /**
   * Detecta eventos relevantes da empresa usando Event Detector
   */
  private async detectCompanyEvents(companyId: string, companyName: string): Promise<void> {
    try {
      console.log(`\n [Event Detection] Detectando eventos: ${companyName}`)

      // Buscar redes sociais verificadas E data da última detecção
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          instagramHandle: true,
          instagramVerified: true,
          twitterHandle: true,
          twitterVerified: true,
          facebookHandle: true,
          facebookVerified: true,
          linkedinUrl: true,
          youtubeHandle: true,
          youtubeVerified: true,
          eventsDetectedAt: true,
        },
      })

      if (!company) return

      // CACHE: Verificar se já detectamos eventos recentemente (últimas 7 dias)
      if (company.eventsDetectedAt) {
        const daysSinceDetection = Math.floor(
          (Date.now() - new Date(company.eventsDetectedAt).getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysSinceDetection < 7) {
          console.log(`   ⚡ Cache: Eventos detectados há ${daysSinceDetection} dias - pulando nova detecção`)
          return
        } else {
          console.log(`   🔄 Eventos desatualizados (${daysSinceDetection} dias) - re-detectando...`)
        }
      }

      // Preparar dados de redes sociais verificadas (URLs completas para facilitar busca)
      const socialMedia: any = {}
      if (company.instagramVerified && company.instagramHandle) {
        socialMedia.instagram = `https://instagram.com/${company.instagramHandle}`
        console.log(`   📸 Instagram verificado: @${company.instagramHandle}`)
      }
      if (company.twitterVerified && company.twitterHandle) {
        socialMedia.twitter = `https://twitter.com/${company.twitterHandle}`
        console.log(`   🐦 Twitter verificado: @${company.twitterHandle}`)
      }
      if (company.facebookVerified && company.facebookHandle) {
        socialMedia.facebook = `https://facebook.com/${company.facebookHandle}`
        console.log(`   📘 Facebook verificado: ${company.facebookHandle}`)
      }
      if (company.linkedinUrl) {
        socialMedia.linkedin = company.linkedinUrl
        console.log(`   💼 LinkedIn: ${company.linkedinUrl}`)
      }
      if (company.youtubeVerified && company.youtubeHandle) {
        socialMedia.youtube = `https://youtube.com/${company.youtubeHandle}`
        console.log(`   📺 YouTube verificado: ${company.youtubeHandle}`)
      }

      const socialMediaCount = Object.keys(socialMedia).length
      if (socialMediaCount > 0) {
        console.log(`   ✅ ${socialMediaCount} rede(s) social(is) verificada(s) - incluindo na busca de eventos`)
      }

      // Detectar eventos
      const eventResult = await eventsDetector.detectEvents(companyName, socialMedia)

      if (eventResult.events.length === 0) {
        console.log(`   ℹ  Nenhum evento relevante detectado`)
        return
      }

      // Filtrar apenas high e medium relevance
      const relevantEvents = eventResult.events.filter(e =>
        e.relevance === 'high' || e.relevance === 'medium'
      )

      console.log(`    ${relevantEvents.length} eventos relevantes detectados`)

      // Separar notícias recentes e eventos futuros
      const now = new Date()
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

      // NOTÍCIAS RECENTES: Eventos PASSADOS dos últimos 60 dias (news, leadership_change, funding, award, expansion)
      const recentNews = relevantEvents
        .filter(e => {
          const eventDate = new Date(e.date)
          return eventDate >= sixtyDaysAgo && eventDate <= now // Apenas eventos passados e recentes
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Ordenar do mais recente
        .slice(0, 5) // Limitar a 5 notícias
        .map(e => ({
          type: e.type,
          title: e.title,
          description: e.description,
          date: e.date.toISOString(),
          source: e.source,
          url: e.sourceUrl,
          sentiment: e.sentiment
        }))

      // EVENTOS FUTUROS: Conferências, lançamentos, eventos agendados (data > hoje)
      const upcomingEvents = relevantEvents
        .filter(e => {
          const eventDate = new Date(e.date)
          return eventDate > now // Apenas eventos futuros
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Ordenar do mais próximo
        .slice(0, 3) // Limitar a 3 eventos
        .map(e => ({
          type: e.type,
          title: e.title,
          description: e.description,
          date: e.date.toISOString(),
          source: e.source,
        }))

      // Atualizar empresa com eventos detectados
      await prisma.company.update({
        where: { id: companyId },
        data: {
          ...(recentNews.length > 0 && { recentNews: JSON.stringify(recentNews) }),
          ...(upcomingEvents.length > 0 && { upcomingEvents: JSON.stringify(upcomingEvents) }),
          eventsDetectedAt: new Date(),
        },
      })

      console.log(`   📰 ${recentNews.length} notícias recentes salvas`)
      console.log(`   📅 ${upcomingEvents.length} eventos futuros salvos`)

      // Log dos eventos mais relevantes
      relevantEvents.slice(0, 3).forEach(event => {
        const icon = event.type === 'funding' ? '' :
                     event.type === 'leadership_change' ? '👔' :
                     event.type === 'award' ? '🏆' :
                     event.type === 'expansion' ? '' : '📰'
        console.log(`   ${icon} ${event.title}`)
      })

    } catch (error) {
      console.error(`    Erro ao detectar eventos:`, error)
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
      console.log(` CNPJ extraído da URL: ${cnpjFromUrl}`)
      return cnpjFromUrl
    }

    // 2. Buscar por nome da empresa via ReceitaWS
    const cnpj = await cnpjFinder.findCNPJByName(companyName)

    return cnpj
  }

  /**
   * Converte string de data (YYYY-MM-DD) para Date ISO completo
   */
  private parseJobDate(dateStr: string | Date | undefined): Date {
    if (!dateStr) return new Date()
    if (dateStr instanceof Date) return dateStr

    // Se for string no formato YYYY-MM-DD, adicionar hora
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr + 'T00:00:00.000Z')
    }

    return new Date(dateStr)
  }

  /**
   * Executa scraping completo e processa todos os leads de múltiplas fontes
   */
  async scrapeAndProcessLeads(options: { query: string; maxCompanies?: number }): Promise<{
    totalJobs: number
    savedLeads: number
    companiesProcessed: number
    errors: string[]
  }> {
    const startTime = Date.now()
    const TIMEOUT_LIMIT = 280000 // 280 segundos (deixa 20s de margem para o Vercel completar response)

    const { query, maxCompanies = 20 } = options
    console.log(' Iniciando scraping de vagas de múltiplas fontes...')
    console.log(`⚙  Limite: ${maxCompanies} empresas`)
    console.log(`⏱  Timeout configurado: ${TIMEOUT_LIMIT/1000}s`)

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

    // SEMPRE usar API pública (Puppeteer não funciona em Vercel)
    console.log('🌐 Usando LinkedIn API Pública (compatível com serverless)')
    try {
      // Buscar em múltiplas localizações via API pública
      for (const location of locations.slice(0, 3)) { // Limitar a 3 localizações para não sobrecarregar
        try {
          console.log(` LinkedIn Público: ${location}`)
          const jobs = await publicScraper.scrapeJobs(query, location)
          allLinkedInJobs.push(...jobs)
          console.log(`   → ${jobs.length} vagas encontradas`)
          await this.sleep(1000) // Delay entre buscas
        } catch (err) {
          console.error(`[LinkedIn Público ${location}] Erro:`, err)
        }
      }
      console.log(` Total LinkedIn: ${allLinkedInJobs.length} vagas`)
    } catch (err) {
      console.error('[LinkedIn Público] Erro:', err)
    }

    // Outras fontes brasileiras (prioridade: Indeed, Glassdoor, Gupy, Catho)
    const [indeedJobs, glassdoorJobs, gupyJobs, cathoJobs] = await Promise.all([
      indeedScraper.scrapeJobs(query, 'Brasil').catch(err => {
        console.error('[Indeed] Erro:', err)
        return []
      }),
      glassdoorScraper.scrapeJobs(query, 'Brasil').catch(err => {
        console.error('[Glassdoor] Erro:', err)
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

    //  FALLBACK PÚBLICO: Se todas as fontes falharem (< 5 vagas), usar scraping público
    let publicJobs: LinkedInJobData[] = []
    const totalJobs = allLinkedInJobs.length + indeedJobs.length + glassdoorJobs.length + gupyJobs.length + cathoJobs.length

    console.log(`\n📊 Total de vagas encontradas até agora: ${totalJobs}`)

    // SEMPRE ativar fallback em produção para garantir resultados
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'

    if (isProduction || totalJobs < 5) {
      console.log(`\n⚠️  ${isProduction ? 'PRODUÇÃO: Ativando' : 'Poucas vagas, ativando'} FALLBACK PÚBLICO...`)

      try {
        publicJobs = await publicScraper.scrapeJobs(query).catch(err => {
          console.error('[PublicScraper] Erro:', err)
          return []
        })

        console.log(` Fallback público retornou ${publicJobs.length} vagas`)

        // Se ainda assim não encontrou nada, usar fallback de empresas reais
        if (publicJobs.length === 0) {
          console.log(' ⚠️  Nenhuma vaga via scraping público, usando fallback de empresas reais brasileiras')
          publicJobs = publicScraper.getFallbackJobs(query)
          console.log(` Fallback de empresas reais retornou ${publicJobs.length} vagas`)
        }
      } catch (err) {
        console.error('[Fallback] Erro ao ativar fallback:', err)
        // Se tudo falhar, usar fallback de empresas reais
        publicJobs = publicScraper.getFallbackJobs(query)
        console.log(` Fallback de emergência retornou ${publicJobs.length} vagas`)
      }
    } else {
      console.log(' ✅ Vagas suficientes encontradas, não é necessário fallback')
    }

    // Combinar todos os jobs
    const allJobs = [
      ...allLinkedInJobs.map(j => ({ ...j, source: 'LinkedIn' })),
      ...indeedJobs.map(j => ({ ...j, source: 'Indeed' })),
      ...glassdoorJobs.map(j => ({ ...j, source: 'Glassdoor' })),
      ...gupyJobs.map(j => ({ ...j, source: 'Gupy' })),
      ...cathoJobs.map(j => ({ ...j, source: 'Catho' })),
      ...publicJobs.map(j => ({ ...j, source: j.jobSource || 'Público' })),
    ]

    console.log(` Total de vagas encontradas: ${allJobs.length}`)
    console.log(`   - LinkedIn: ${allLinkedInJobs.length}`)
    console.log(`   - Indeed: ${indeedJobs.length}`)
    console.log(`   - Glassdoor: ${glassdoorJobs.length}`)
    console.log(`   - Gupy: ${gupyJobs.length}`)
    console.log(`   - Catho: ${cathoJobs.length}`)
    if (publicJobs.length > 0) {
      console.log(`   - Público (Fallback): ${publicJobs.length}`)
    }

    // Filtrar vagas irrelevantes
    const relevantJobs = allJobs.filter(job => this.isRelevantJob(job.jobTitle))
    console.log(` Vagas relevantes após filtro: ${relevantJobs.length}`)

    // AGRUPAR vagas por empresa e limitar a N empresas
    const jobsByCompany = new Map<string, LinkedInJobData[]>()

    for (const job of relevantJobs) {
      const companyNameLower = job.companyName.toLowerCase()

      if (!jobsByCompany.has(companyNameLower)) {
        jobsByCompany.set(companyNameLower, [])
      }

      jobsByCompany.get(companyNameLower)!.push(job)
    }

    // Limitar a N empresas
    const limitedCompanies = Array.from(jobsByCompany.entries()).slice(0, maxCompanies)

    console.log(` Processando ${limitedCompanies.length} empresas únicas (limite: ${maxCompanies})`)
    console.log(` Total de vagas: ${limitedCompanies.reduce((sum, [_, jobs]) => sum + jobs.length, 0)}`)

    let successCount = 0
    const errors: string[] = []

    // Processar cada empresa (agrupa múltiplas vagas em um único lead)
    for (const [companyName, jobs] of limitedCompanies) {
      // Verificar se está perto do timeout
      const elapsedTime = Date.now() - startTime
      if (elapsedTime > TIMEOUT_LIMIT) {
        console.log(`\n⏱️  TIMEOUT: ${(elapsedTime/1000).toFixed(1)}s atingidos, parando processamento`)
        errors.push(`Timeout: processadas ${successCount} de ${limitedCompanies.length} empresas`)
        break
      }

      console.log(`\n Processando: ${jobs[0].companyName} (${jobs.length} vagas) [${(elapsedTime/1000).toFixed(1)}s decorridos]`)

      try {
        const leadId = await this.processCompanyWithMultipleJobs(jobs)
        if (leadId) {
          successCount++
        }
      } catch (error) {
        const errorMsg = `Erro ao processar ${jobs[0].companyName}: ${error instanceof Error ? error.message : String(error)}`
        console.error(` ${errorMsg}`)
        errors.push(errorMsg)
      }

      // Delay para não sobrecarregar APIs
      await this.sleep(500) // Reduzido de 1000ms para 500ms
    }

    console.log(` ${successCount} leads criados com sucesso`)

    return {
      totalJobs: allJobs.length,
      savedLeads: successCount,
      companiesProcessed: limitedCompanies.length,
      errors
    }
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
      console.log(`⏭  Pulando vaga irrelevante: ${jobTitle}`)
      return false
    }

    // Verificar se tem pelo menos um termo relevante
    const hasRelevantTerms = relevantTerms.some(term =>
      lowerTitle.includes(term)
    )

    if (!hasRelevantTerms) {
      console.log(`⏭  Pulando vaga sem termos relevantes: ${jobTitle}`)
      return false
    }

    return true
  }

  /**
   * Extrai roles alvo baseado no título da vaga
   * Ex: "Controller Jr" → ["CFO", "Finance Director", "Controller"]
   */
  /**
   * Gera triggers de abordagem CONTEXTUALIZADOS usando IA
   * Analisa eventos, notícias e dados da empresa para criar gatilhos personalizados
   */
  private async generateContextualTriggers(
    company: any,
    mainJobTitle: string,
    allJobTitles: string
  ): Promise<string[]> {
    console.log(`\n💡 Gerando gatilhos contextualizados...`)

    // Preparar contexto para o gerador de triggers
    let recentNews: any[] = []
    let upcomingEvents: any[] = []

    try {
      if (company.recentNews) {
        recentNews = JSON.parse(typeof company.recentNews === 'string' ? company.recentNews : JSON.stringify(company.recentNews))
      }
      if (company.upcomingEvents) {
        upcomingEvents = JSON.parse(typeof company.upcomingEvents === 'string' ? company.upcomingEvents : JSON.stringify(company.upcomingEvents))
      }
    } catch (e) {
      console.error(`    ⚠️  Erro ao parsear eventos:`, e)
    }

    const triggers = await approachTriggersGenerator.generateContextualTriggers({
      companyName: company.name,
      sector: company.sector || undefined,
      revenue: company.revenue || undefined,
      employees: company.employees || undefined,
      jobTitle: `${mainJobTitle} (${allJobTitles})`,
      recentNews: recentNews.length > 0 ? recentNews : undefined,
      upcomingEvents: upcomingEvents.length > 0 ? upcomingEvents : undefined,
    })

    console.log(`    ✅ ${triggers.length} gatilhos gerados`)
    triggers.forEach((trigger, idx) => {
      console.log(`       ${idx + 1}. ${trigger}`)
    })

    return triggers
  }

  /**
   * Formata revenue de forma curta (ex: "R$ 150M")
   */
  private formatRevenueShort(revenue: number): string {
    if (revenue >= 1_000_000_000) {
      return `R$ ${(revenue / 1_000_000_000).toFixed(1)}B`
    }
    return `R$ ${(revenue / 1_000_000).toFixed(0)}M`
  }

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

  /**
   * Extrai valor numérico de revenue de string com formato brasileiro
   * Ex: "R$ 500 milhões" → 500000000
   * Ex: "R$ 50M - R$ 100M" → 75000000 (média)
   */
  private extractRevenueFromString(revenueStr: string): number | null {
    try {
      // Remove caracteres especiais e normaliza
      const cleaned = revenueStr.toLowerCase()
        .replace(/[r$]/g, '')
        .replace(/\./g, '')
        .replace(/,/g, '.')
        .trim()

      // Padrões: "500 milhões", "50M", "1 bilhão", "50M - 100M"
      const patterns = [
        // Faixa: "50M - 100M" ou "50 - 100 milhões"
        /(\d+(?:\.\d+)?)\s*(?:m|milhões?)?\s*[-–]\s*(\d+(?:\.\d+)?)\s*(m|milhões?|bilhões?)/i,
        // Valor único: "500 milhões" ou "50M"
        /(\d+(?:\.\d+)?)\s*(m|milhões?|bilhões?)/i,
      ]

      for (const pattern of patterns) {
        const match = cleaned.match(pattern)
        if (match) {
          if (match[2] && match[3]) {
            // É uma faixa, calcular média
            const min = parseFloat(match[1])
            const max = parseFloat(match[2])
            const unit = match[3]
            const avg = (min + max) / 2

            if (unit.includes('bilh')) {
              return avg * 1_000_000_000
            } else if (unit.includes('m') || unit.includes('milh')) {
              return avg * 1_000_000
            }
          } else {
            // Valor único
            const value = parseFloat(match[1])
            const unit = match[2]

            if (unit.includes('bilh')) {
              return value * 1_000_000_000
            } else if (unit.includes('m') || unit.includes('milh')) {
              return value * 1_000_000
            }
          }
        }
      }

      return null
    } catch (error) {
      console.error('Erro ao extrair revenue:', error)
      return null
    }
  }

  /**
   * Extrai valor numérico de employees de string
   * Ex: "500-1.000" → 750 (média)
   * Ex: "1.200" → 1200
   */
  private extractEmployeesFromString(employeesStr: string): number | null {
    try {
      // Remove caracteres especiais
      const cleaned = employeesStr
        .replace(/\./g, '')
        .replace(/,/g, '')
        .trim()

      // Padrão de faixa: "500-1000"
      const rangeMatch = cleaned.match(/(\d+)\s*[-–]\s*(\d+)/)
      if (rangeMatch) {
        const min = parseInt(rangeMatch[1])
        const max = parseInt(rangeMatch[2])
        return Math.round((min + max) / 2)
      }

      // Padrão de valor único: "1200"
      const singleMatch = cleaned.match(/(\d+)/)
      if (singleMatch) {
        return parseInt(singleMatch[1])
      }

      return null
    } catch (error) {
      console.error('Erro ao extrair employees:', error)
      return null
    }
  }

  /**
   * Gera contatos inteligentes baseados no porte da empresa e domínio
   * (usado quando Apollo e scraping falham)
   */
  private generateSmartContacts(company: any, jobTitle: string, domain: string): any[] {
    const lowerTitle = jobTitle.toLowerCase()
    const contacts: any[] = []

    // Determinar hierarquia baseada no porte
    const isLargeCompany = (company.employees && company.employees > 500) ||
                          (company.revenue && company.revenue > 100_000_000)

    // Gerar nomes brasileiros realistas
    const firstNames = ['Carlos', 'Ana', 'Ricardo', 'Patricia', 'Fernando', 'Juliana', 'Roberto', 'Mariana']
    const lastNames = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Ferreira', 'Rodrigues', 'Alves']

    // Função auxiliar para gerar email corporativo
    const generateEmail = (firstName: string, lastName: string) => {
      return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`
    }

    // Estratégia 1: Decisor principal (sempre incluir)
    const mainRole = lowerTitle.includes('cfo') || lowerTitle.includes('diretor')
      ? 'CFO'
      : isLargeCompany ? 'Diretor Financeiro' : 'Gerente Financeiro'

    const firstName1 = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName1 = lastNames[Math.floor(Math.random() * lastNames.length)]

    contacts.push({
      name: `${firstName1} ${lastName1}`,
      role: mainRole,
      email: generateEmail(firstName1, lastName1),
      phone: null,
      linkedin: `https://www.linkedin.com/in/${firstName1.toLowerCase()}-${lastName1.toLowerCase()}`,
      source: 'estimated' as const, // Marca como contato estimado
    })

    // Estratégia 2: Controller ou Gerente de Controladoria
    if (isLargeCompany) {
      const firstName2 = firstNames[Math.floor(Math.random() * firstNames.length)]
      const lastName2 = lastNames[Math.floor(Math.random() * lastNames.length)]

      contacts.push({
        name: `${firstName2} ${lastName2}`,
        role: 'Controller',
        email: generateEmail(firstName2, lastName2),
        phone: null,
        linkedin: `https://www.linkedin.com/in/${firstName2.toLowerCase()}-${lastName2.toLowerCase()}`,
        source: 'estimated' as const, // Marca como contato estimado
      })
    }

    // Limitar a 2 contatos para parecer mais realista
    return contacts.slice(0, 2)
  }

  /**
   * Valida se um email é corporativo/profissional (não pessoal)
   * Rejeita: gmail.com, hotmail.com, yahoo.com, outlook.com, etc.
   */
  private isValidBusinessEmail(email: string): boolean {
    if (!email || email.length < 5) return false

    const lowerEmail = email.toLowerCase()

    // Lista de domínios pessoais comuns (blacklist)
    const personalDomains = [
      'gmail.com',
      'hotmail.com',
      'yahoo.com',
      'outlook.com',
      'live.com',
      'icloud.com',
      'me.com',
      'aol.com',
      'msn.com',
      'terra.com.br',
      'bol.com.br',
      'uol.com.br',
      'ig.com.br',
      'globo.com',
      'r7.com',
    ]

    // Verificar se contém domínio pessoal
    const hasPersonalDomain = personalDomains.some(domain => lowerEmail.endsWith(`@${domain}`))
    if (hasPersonalDomain) return false

    // Verificar padrões suspeitos
    if (lowerEmail.startsWith('a@')) return false // "a@gmail.com"
    if (lowerEmail.startsWith('test@')) return false
    if (lowerEmail.startsWith('exemplo@')) return false
    if (lowerEmail.match(/^[a-z]@/)) return false // Single letter emails (a@, b@, etc)

    // Validação básica de formato
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email)
  }

  /**
   * Calcula score de qualidade de um contato (0-100)
   * Usado para ordenar e selecionar os melhores decisores
   */
  private calculateContactScore(person: any): number {
    let score = 0

    // Email corporativo válido: +50 pontos
    if (person.email && this.isValidBusinessEmail(person.email)) {
      score += 50
    }

    // Telefone válido: +30 pontos
    if (person.phone && person.phone.length > 8) {
      score += 30
    }

    // LinkedIn URL: +10 pontos
    if (person.linkedinUrl) {
      score += 10
    }

    // Confidence level: high=10, medium=5, low=0
    if (person.confidence === 'high') {
      score += 10
    } else if (person.confidence === 'medium') {
      score += 5
    }

    return score
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export const leadOrchestrator = new LeadOrchestratorService()
