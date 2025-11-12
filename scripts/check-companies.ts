// Script para verificar dados das empresas
import { prisma } from '../lib/prisma'

async function checkCompanies() {
  console.log('📊 Verificando empresas no banco de dados...\n')

  const companies = await prisma.company.findMany({
    select: {
      name: true,
      cnpj: true,
      revenue: true,
      employees: true,
      sector: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  console.log(`Total de empresas: ${companies.length}\n`)

  for (const company of companies) {
    console.log(`📍 ${company.name}`)
    console.log(`   CNPJ: ${company.cnpj || '❌ Não encontrado'}`)
    console.log(`   Faturamento: ${company.revenue ? `R$ ${(company.revenue / 1000000).toFixed(1)}M` : '❌ Não disponível'}`)
    console.log(`   Funcionários: ${company.employees || '❌ Não disponível'}`)
    console.log(`   Setor: ${company.sector || '❌ Não disponível'}`)
    console.log('')
  }

  await prisma.$disconnect()
}

checkCompanies()
