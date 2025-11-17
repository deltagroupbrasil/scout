// Script para corrigir o lead do PagBank convertendo strings para números
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function extractEmployeesFromString(employeesStr: string): number | null {
  try {
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

async function fixPagBankLead() {
  console.log('🔧 CORRIGINDO LEAD DO PAGBANK\n')
  console.log('='.repeat(70))

  try {
    // Buscar company PagBank
    const company = await prisma.company.findFirst({
      where: {
        name: 'PagBank'
      }
    })

    if (!company) {
      console.log('❌ Company PagBank não encontrada')
      return
    }

    console.log(`\n🏢 Company ID: ${company.id}`)
    console.log(`   Nome: ${company.name}`)
    console.log(`   Estimated Employees: ${company.estimatedEmployees}`)
    console.log(`   Employees (atual): ${company.employees}`)

    // Converter estimatedEmployees para employees
    if (company.estimatedEmployees && company.estimatedEmployees !== 'Não disponível') {
      const employeesNumber = extractEmployeesFromString(company.estimatedEmployees)

      if (employeesNumber) {
        console.log(`\n✅ Conversão: "${company.estimatedEmployees}" → ${employeesNumber}`)

        // Atualizar no banco
        await prisma.company.update({
          where: { id: company.id },
          data: {
            employees: employeesNumber
          }
        })

        console.log(`✅ Employees atualizado para: ${employeesNumber}`)
      } else {
        console.log(`❌ Não foi possível converter: "${company.estimatedEmployees}"`)
      }
    } else {
      console.log('⚠️  estimatedEmployees não está disponível ou é "Não disponível"')
    }

    // Verificar revenue
    if (!company.revenue) {
      console.log('\n⚠️  Revenue ainda não está disponível')
      console.log('   estimatedRevenue:', company.estimatedRevenue)
      console.log('   Para corrigir, rodar novamente o enrichment com melhor prompt da IA')
    } else {
      console.log(`\n✅ Revenue já está salvo: R$ ${(company.revenue / 1_000_000).toFixed(1)}M`)
    }

    console.log('\n' + '='.repeat(70))
    console.log('📊 RESULTADO FINAL:')
    console.log('='.repeat(70))

    // Buscar novamente para confirmar
    const updatedCompany = await prisma.company.findUnique({
      where: { id: company.id }
    })

    console.log(`\n   CNPJ: ${updatedCompany?.cnpj || '❌'}`)
    console.log(`   Revenue: ${updatedCompany?.revenue ? `R$ ${(updatedCompany.revenue / 1_000_000).toFixed(1)}M` : '❌ Não disponível'}`)
    console.log(`   Employees: ${updatedCompany?.employees || '❌ Não disponível'}`)
    console.log(`   Location: ${updatedCompany?.location || '❌'}`)
    console.log(`   Website: ${updatedCompany?.website || '❌'}`)
    console.log(`   Instagram: ${updatedCompany?.instagramHandle || '❌'}`)

    console.log('\n💡 PRÓXIMOS PASSOS:')
    console.log('   1. Acesse: http://localhost:3000/dashboard')
    console.log('   2. Encontre o lead do PagBank')
    console.log('   3. Verifique se agora mostra "Funcionários: 750"')
    console.log('   4. Revenue ainda estará "Não informado" (IA não encontrou)')
    console.log('   5. Para melhorar, ajustar prompt da IA ou usar Sonnet ao invés de Haiku')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixPagBankLead()
  .then(() => {
    console.log('\n✅ Correção concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
