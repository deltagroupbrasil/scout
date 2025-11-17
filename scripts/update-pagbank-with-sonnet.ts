// Atualizar PagBank com dados do Sonnet 4.5
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { aiCompanyEnrichment } from '../lib/services/ai-company-enrichment'

const prisma = new PrismaClient()

function extractRevenueFromString(revenueStr: string): number | null {
  try {
    const cleaned = revenueStr
      .toLowerCase()
      .replace(/[r$]/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .trim()

    // "3.2 bilhões" ou "32 bilhao"
    const bilhaoMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:bilh[õo]es?|b)/i)
    if (bilhaoMatch) {
      const value = parseFloat(bilhaoMatch[1])
      return value * 1_000_000_000
    }

    // "500 milhões" ou "500m"
    const milhaoMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:milh[õo]es?|m)/i)
    if (milhaoMatch) {
      const value = parseFloat(milhaoMatch[1])
      return value * 1_000_000
    }

    return null
  } catch (error) {
    console.error('Erro ao extrair revenue:', error)
    return null
  }
}

function extractEmployeesFromString(employeesStr: string): number | null {
  try {
    const cleaned = employeesStr
      .replace(/\./g, '')
      .replace(/,/g, '')
      .trim()

    // "3.500-4.000" → média
    const rangeMatch = cleaned.match(/(\d+)\s*[-–]\s*(\d+)/)
    if (rangeMatch) {
      const min = parseInt(rangeMatch[1])
      const max = parseInt(rangeMatch[2])
      return Math.round((min + max) / 2)
    }

    // Valor único
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

async function updatePagBank() {
  console.log('🔄 ATUALIZANDO PAGBANK COM SONNET 4.5\n')
  console.log('='.repeat(70))

  try {
    // Buscar empresa PagBank
    const company = await prisma.company.findFirst({
      where: { name: 'PagBank' }
    })

    if (!company) {
      console.log('❌ PagBank não encontrada no banco')
      return
    }

    console.log(`\n🏢 Company encontrada: ${company.name} (ID: ${company.id})`)

    // Fazer enrichment com Sonnet 4.5
    console.log('\n🤖 Executando AI Enrichment com Claude Sonnet 4.5...\n')

    const enrichment = await aiCompanyEnrichment.enrichCompany(
      'PagBank',
      'Serviços Financeiros',
      'https://pagbank.com.br'
    )

    console.log('✅ Enrichment concluído!\n')

    // Converter valores
    const revenueNumber = enrichment.estimatedRevenue
      ? extractRevenueFromString(enrichment.estimatedRevenue)
      : null

    const employeesNumber = enrichment.estimatedEmployees
      ? extractEmployeesFromString(enrichment.estimatedEmployees)
      : null

    console.log('💰 DADOS FINANCEIROS:')
    console.log('='.repeat(70))
    console.log(`   estimatedRevenue (string): "${enrichment.estimatedRevenue}"`)
    console.log(`   revenue (número): ${revenueNumber ? `R$ ${(revenueNumber / 1_000_000_000).toFixed(2)} bilhões` : 'NULL'}`)
    console.log(`   estimatedEmployees (string): "${enrichment.estimatedEmployees}"`)
    console.log(`   employees (número): ${employeesNumber || 'NULL'}`)

    // Atualizar no banco
    const updateData: any = {
      cnpj: enrichment.cnpj || company.cnpj,
      location: enrichment.location || company.location,
      estimatedRevenue: enrichment.estimatedRevenue || 'Não disponível',
      estimatedEmployees: enrichment.estimatedEmployees || 'Não disponível',
      instagramHandle: enrichment.socialMedia.instagram?.handle || company.instagramHandle,
      linkedinUrl: enrichment.socialMedia.linkedin?.url || company.linkedinUrl,
      industryPosition: enrichment.industryPosition || company.industryPosition,
      keyInsights: enrichment.keyInsights.length > 0
        ? JSON.stringify(enrichment.keyInsights)
        : company.keyInsights,
      enrichedAt: new Date(),
    }

    // Adicionar números convertidos
    if (revenueNumber) {
      updateData.revenue = revenueNumber
    }
    if (employeesNumber) {
      updateData.employees = employeesNumber
    }

    await prisma.company.update({
      where: { id: company.id },
      data: updateData
    })

    console.log('\n✅ Dados atualizados no banco!')

    // Buscar novamente para confirmar
    const updated = await prisma.company.findUnique({
      where: { id: company.id }
    })

    console.log('\n' + '='.repeat(70))
    console.log('📊 DADOS FINAIS NO BANCO:')
    console.log('='.repeat(70))
    console.log(`   Nome: ${updated?.name}`)
    console.log(`   CNPJ: ${updated?.cnpj}`)
    console.log(`   Revenue: ${updated?.revenue ? `R$ ${(updated.revenue / 1_000_000_000).toFixed(2)} bi` : '❌'}`)
    console.log(`   Employees: ${updated?.employees || '❌'}`)
    console.log(`   Location: ${updated?.location}`)
    console.log(`   Instagram: ${updated?.instagramHandle}`)
    console.log(`   LinkedIn: ${updated?.linkedinUrl}`)
    console.log(`   Industry Position: ${updated?.industryPosition}`)

    console.log('\n💡 PRÓXIMOS PASSOS:')
    console.log('   1. Acesse: http://localhost:3000/dashboard')
    console.log('   2. Encontre o lead do PagBank')
    console.log('   3. AGORA deve mostrar:')
    console.log(`      - Faturamento: R$ ${updated?.revenue ? (updated.revenue / 1_000_000_000).toFixed(2) + ' bi' : 'N/A'}`)
    console.log(`      - Funcionários: ${updated?.employees || 'N/A'}`)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updatePagBank()
  .then(() => {
    console.log('\n✅ Atualização concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
