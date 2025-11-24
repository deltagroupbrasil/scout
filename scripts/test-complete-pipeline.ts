import { prisma } from "../lib/prisma"
import { linkedInScraper } from "../lib/services/linkedin-scraper"
import { publicScraper } from "../lib/services/public-scraper"
import { websiteFinder } from "../lib/services/website-finder"
import { cnpjFinder } from "../lib/services/cnpj-finder"

async function testPipeline() {
  console.log('🧪 TEST RUNNER - Pipeline Completo\n')
  console.log('============================================================')

  try {
    // ETAPA 1: Conectar ao banco
    console.log('\n📊 ETAPA 1: Testar conexão com PostgreSQL Neon...')
    const startDb = Date.now()
    const testQuery = await prisma.$queryRaw`SELECT 1 as result`
    console.log(`✅ Conexão OK (${Date.now() - startDb}ms)`)
    console.log(`   Resultado: ${JSON.stringify(testQuery)}`)

    // ETAPA 2: Contar dados existentes
    console.log('\n📊 ETAPA 2: Verificar dados existentes...')
    const leadCount = await prisma.lead.count()
    const companyCount = await prisma.company.count()
    console.log(`✅ Leads existentes: ${leadCount}`)
    console.log(`✅ Companies existentes: ${companyCount}`)

    // ETAPA 3: Scraping de vagas
    console.log('\n📊 ETAPA 3: Testar scraping de vagas...')
    const startScrape = Date.now()
    const jobs = await publicScraper.scrapeJobs('Controller', 'São Paulo, SP')
    console.log(`✅ Scraping OK (${Date.now() - startScrape}ms)`)
    console.log(`   Vagas encontradas: ${jobs.length}`)

    if (jobs.length === 0) {
      console.error('❌ FALHA: Nenhuma vaga encontrada!')
      return
    }

    const testJob = jobs[0]
    console.log(`   Vaga teste: ${testJob.companyName} - ${testJob.jobTitle}`)

    // ETAPA 4: Buscar ou criar empresa
    console.log('\n📊 ETAPA 4: Buscar/Criar empresa no banco...')
    const startCompany = Date.now()

    let company = await prisma.company.findFirst({
      where: { name: testJob.companyName }
    })

    if (!company) {
      console.log('   Empresa não existe, criando...')
      company = await prisma.company.create({
        data: {
          name: testJob.companyName,
          website: null,
          cnpj: null,
        }
      })
      console.log(`✅ Empresa criada: ${company.id}`)
    } else {
      console.log(`✅ Empresa encontrada: ${company.id}`)
    }
    console.log(`   Tempo: ${Date.now() - startCompany}ms`)

    // ETAPA 5: Buscar website
    console.log('\n📊 ETAPA 5: Buscar website da empresa...')
    const startWebsite = Date.now()
    const websiteResult = await websiteFinder.findWebsite(company.name)
    console.log(`✅ Website finder OK (${Date.now() - startWebsite}ms)`)

    // Website finder retorna objeto {website, domain, confidence, source} ou string
    const websiteUrl = typeof websiteResult === 'string' ? websiteResult : websiteResult?.website
    console.log(`   Website: ${websiteUrl || 'Não encontrado'}`)

    if (websiteUrl) {
      await prisma.company.update({
        where: { id: company.id },
        data: { website: websiteUrl }
      })
      console.log(`✅ Website salvo no banco`)
    }

    // ETAPA 6: Buscar CNPJ
    console.log('\n📊 ETAPA 6: Buscar CNPJ da empresa...')
    const startCnpj = Date.now()
    const cnpj = await cnpjFinder.findCNPJByName(company.name)
    console.log(`✅ CNPJ finder OK (${Date.now() - startCnpj}ms)`)
    console.log(`   CNPJ: ${cnpj || 'Não encontrado'}`)

    if (cnpj) {
      await prisma.company.update({
        where: { id: company.id },
        data: { cnpj }
      })
      console.log(`✅ CNPJ salvo no banco`)
    }

    // ETAPA 7: Criar lead
    console.log('\n📊 ETAPA 7: Criar lead no banco...')
    const startLead = Date.now()

    // Verificar se lead já existe
    const existingLead = await prisma.lead.findFirst({
      where: {
        jobUrl: testJob.jobUrl,
        companyId: company.id
      }
    })

    let lead
    if (existingLead) {
      console.log(`   Lead já existe: ${existingLead.id}`)
      lead = existingLead
    } else {
      lead = await prisma.lead.create({
        data: {
          companyId: company.id,
          jobTitle: testJob.jobTitle,
          jobDescription: testJob.jobDescription || testJob.description || 'Descrição não disponível',
          jobUrl: testJob.jobUrl,
          jobPostedDate: testJob.jobPostedDate || testJob.postedDate || new Date(),
          jobSource: testJob.jobSource || 'LinkedIn',
          candidateCount: testJob.candidateCount || testJob.applicants || null,
          priorityScore: 50,
          suggestedContacts: JSON.stringify([]),
          triggers: JSON.stringify([]),
        }
      })
      console.log(`✅ Lead criado: ${lead.id}`)
    }
    console.log(`   Tempo: ${Date.now() - startLead}ms`)

    // ETAPA 8: Verificar salvamento
    console.log('\n📊 ETAPA 8: Verificar se lead foi salvo corretamente...')
    const savedLead = await prisma.lead.findUnique({
      where: { id: lead.id },
      include: { company: true }
    })

    if (!savedLead) {
      console.error('❌ FALHA: Lead não foi encontrado após criação!')
      return
    }

    console.log(`✅ Lead verificado no banco:`)
    console.log(`   ID: ${savedLead.id}`)
    console.log(`   Company: ${savedLead.company.name}`)
    console.log(`   Job: ${savedLead.jobTitle}`)
    console.log(`   Created: ${savedLead.createdAt}`)

    // RESUMO FINAL
    console.log('\n============================================================')
    console.log('🎉 TESTE COMPLETO - TODOS OS PASSOS FUNCIONANDO!')
    console.log('============================================================')
    console.log(`\n✅ Pipeline testado com sucesso`)
    console.log(`✅ Lead salvo no PostgreSQL: ${lead.id}`)
    console.log(`✅ Empresa: ${company.name}`)
    console.log(`✅ Website: ${company.website || 'N/A'}`)
    console.log(`✅ CNPJ: ${company.cnpj || 'N/A'}`)

    // Contar novamente
    const newLeadCount = await prisma.lead.count()
    const newCompanyCount = await prisma.company.count()
    console.log(`\n📊 Total no banco agora:`)
    console.log(`   Leads: ${newLeadCount} (antes: ${leadCount})`)
    console.log(`   Companies: ${newCompanyCount} (antes: ${companyCount})`)

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A')
  } finally {
    await prisma.$disconnect()
    console.log('\n✅ Desconectado do banco')
  }
}

testPipeline()
