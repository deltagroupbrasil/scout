// Script para enriquecer empresas existentes com novo pipeline
// Descobre websites + Scraping LinkedIn + Contact enrichment
import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { websiteFinder } from '../lib/services/website-finder'
import { linkedInCompanyScraper } from '../lib/services/linkedin-company-scraper'

async function enrichExistingCompanies() {
  console.log('\n' + '='.repeat(70))
  console.log('🔄 ENRIQUECENDO EMPRESAS EXISTENTES COM NOVO PIPELINE')
  console.log('='.repeat(70) + '\n')

  // Buscar empresas sem website ou com website do LinkedIn
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { website: null },
        { website: { contains: 'linkedin.com' } },
        { linkedinFollowers: null }, // Sem dados de LinkedIn
      ],
    },
  })

  console.log(`📊 Encontradas ${companies.length} empresas para enriquecer\n`)

  let successCount = 0
  let failCount = 0

  for (const company of companies) {
    try {
      console.log('\n' + '-'.repeat(70))
      console.log(`🏢 Empresa: ${company.name}`)
      console.log('-'.repeat(70))

      let websiteUpdated = false
      let linkedInUpdated = false

      // 1. Website Discovery (se não tiver ou for do LinkedIn)
      if (!company.website || company.website.includes('linkedin.com')) {
        console.log(`\n🌐 Descobrindo website...`)

        try {
          const websiteResult = await websiteFinder.findWebsite(
            company.name,
            company.linkedinUrl || undefined,
            company.website || undefined
          )

          if (websiteResult.website && !websiteResult.website.includes('linkedin.com')) {
            await prisma.company.update({
              where: { id: company.id },
              data: { website: websiteResult.website },
            })

            console.log(`   ✅ Website descoberto: ${websiteResult.website}`)
            console.log(`   Confiança: ${websiteResult.confidence}`)
            console.log(`   Fonte: ${websiteResult.source}`)
            websiteUpdated = true
          } else {
            console.log(`   ⚠️  Não encontrou website corporativo`)
          }

          await sleep(1000) // Rate limit
        } catch (error) {
          console.error(`   ❌ Erro ao descobrir website:`, error)
        }
      } else {
        console.log(`\n✅ Website já cadastrado: ${company.website}`)
      }

      // 2. LinkedIn Company Scraping (se tiver URL e não tiver followers)
      if (company.linkedinUrl && !company.linkedinFollowers) {
        console.log(`\n📊 Scraping LinkedIn Company Page...`)

        try {
          const linkedInData = await linkedInCompanyScraper.scrapeCompanyPage(company.linkedinUrl)

          await prisma.company.update({
            where: { id: company.id },
            data: {
              linkedinFollowers: linkedInData.followers,
              employees: linkedInData.employeesCount || company.employees,
              sector: linkedInData.industry || company.sector,
              location: linkedInData.headquarters || company.location,
              website: linkedInData.website || company.website,
            },
          })

          console.log(`   ✅ LinkedIn atualizado:`)
          console.log(`      Seguidores: ${linkedInData.followers?.toLocaleString() || 'N/A'}`)
          console.log(`      Funcionários: ${linkedInData.employees || 'N/A'} (${linkedInData.employeesCount?.toLocaleString() || 'N/A'})`)
          console.log(`      Indústria: ${linkedInData.industry || 'N/A'}`)
          console.log(`      Sede: ${linkedInData.headquarters || 'N/A'}`)

          linkedInUpdated = true
          await sleep(2000) // Rate limit LinkedIn
        } catch (error) {
          console.error(`   ❌ Erro ao scraping LinkedIn:`, error)
        }
      } else if (company.linkedinFollowers) {
        console.log(`\n✅ Dados do LinkedIn já atualizados (${company.linkedinFollowers?.toLocaleString()} seguidores)`)
      } else {
        console.log(`\n⚠️  Sem URL do LinkedIn`)
      }

      if (websiteUpdated || linkedInUpdated) {
        successCount++
        console.log(`\n✅ Empresa "${company.name}" enriquecida com sucesso!`)
      } else {
        console.log(`\n⏭️  Nenhuma atualização necessária para "${company.name}"`)
      }

    } catch (error) {
      console.error(`\n❌ Erro ao enriquecer ${company.name}:`, error)
      failCount++
    }

    // Delay entre empresas
    await sleep(1000)
  }

  // Resumo final
  console.log('\n\n' + '='.repeat(70))
  console.log('📊 RESUMO DO ENRIQUECIMENTO')
  console.log('='.repeat(70))
  console.log(`\n✅ Empresas enriquecidas: ${successCount}`)
  console.log(`❌ Erros: ${failCount}`)
  console.log(`📊 Total processado: ${companies.length}`)

  // Verificar empresas atualizadas
  const updatedCompanies = await prisma.company.findMany({
    where: {
      AND: [
        { website: { not: null } },
        { website: { not: { contains: 'linkedin.com' } } },
      ],
    },
  })

  console.log(`\n🌐 Empresas com websites reais: ${updatedCompanies.length}`)

  const withFollowers = await prisma.company.count({
    where: { linkedinFollowers: { not: null } },
  })

  console.log(`📊 Empresas com dados LinkedIn: ${withFollowers}`)

  console.log('\n✅ Enriquecimento concluído!')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

enrichExistingCompanies()
  .then(() => {
    console.log('\n🎉 Script finalizado com sucesso!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro no script:', error)
    process.exit(1)
  })
