// Script para enriquecer empresas que já têm CNPJ mas não têm revenue/employees
import { prisma } from '../lib/prisma'
import { companyEnrichment } from '../lib/services/company-enrichment'

async function enrichCompanies() {
  console.log('🔄 Enriquecendo empresas com CNPJ...\n')

  // Buscar empresas que têm CNPJ mas não têm revenue ou employees
  const companies = await prisma.company.findMany({
    where: {
      cnpj: { not: null },
      OR: [
        { revenue: null },
        { employees: null },
      ],
    },
  })

  console.log(`📊 Encontradas ${companies.length} empresas para enriquecer\n`)

  let successCount = 0
  let failCount = 0

  for (const company of companies) {
    console.log(`\n📍 Processando: ${company.name}`)
    console.log(`   CNPJ: ${company.cnpj}`)

    try {
      // Buscar dados na Receita Federal
      const enrichmentData = await companyEnrichment.getCompanyByCNPJ(company.cnpj!)

      if (enrichmentData && (enrichmentData.revenue || enrichmentData.employees)) {
        // Atualizar empresa com novos dados
        await prisma.company.update({
          where: { id: company.id },
          data: {
            revenue: enrichmentData.revenue,
            employees: enrichmentData.employees,
            sector: enrichmentData.sector || company.sector,
            website: enrichmentData.website || company.website,
          },
        })

        console.log(`   ✅ Enriquecido:`)
        console.log(`      Revenue: R$ ${enrichmentData.revenue ? (enrichmentData.revenue / 1000000).toFixed(1) + 'M' : 'N/A'}`)
        console.log(`      Employees: ${enrichmentData.employees || 'N/A'}`)
        console.log(`      Sector: ${enrichmentData.sector?.substring(0, 50) || 'N/A'}...`)

        successCount++
      } else {
        console.log(`   ⚠️  Dados não disponíveis (rate limit ou CNPJ inválido)`)
        failCount++
      }

      // Delay de 2 segundos entre requisições para evitar rate limit
      await sleep(2000)
    } catch (error) {
      console.error(`   ❌ Erro ao enriquecer:`, error)
      failCount++

      // Delay maior em caso de erro
      await sleep(5000)
    }
  }

  console.log(`\n\n📊 Resumo:`)
  console.log(`   ✅ Sucesso: ${successCount}`)
  console.log(`   ❌ Falha: ${failCount}`)
  console.log(`   📈 Total: ${companies.length}`)

  await prisma.$disconnect()
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

enrichCompanies()
