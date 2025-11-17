// Script para verificar dados de um lead específico no banco
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkLeadData() {
  console.log('🔍 VERIFICANDO DADOS DO LEAD NO BANCO\n')
  console.log('='.repeat(70))

  try {
    // Buscar lead do teste mais recente (PagBank)
    const lead = await prisma.lead.findFirst({
      where: {
        company: {
          name: 'PagBank'
        }
      },
      include: {
        company: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!lead) {
      console.log('❌ Nenhum lead encontrado para PagBank')
      return
    }

    console.log(`\n📋 LEAD ID: ${lead.id}`)
    console.log(`   Vaga: ${lead.jobTitle}`)
    console.log(`   Status: ${lead.status}`)
    console.log(`   Criado: ${lead.createdAt}`)

    console.log('\n🏢 DADOS DA EMPRESA:')
    console.log('='.repeat(70))
    console.log(`   Nome: ${lead.company.name}`)
    console.log(`   CNPJ: ${lead.company.cnpj || '❌ Não informado'}`)
    console.log(`   Setor: ${lead.company.sector || '❌ Não informado'}`)
    console.log(`   Location: ${lead.company.location || '❌ Não informado'}`)
    console.log(`   Website: ${lead.company.website || '❌ Não informado'}`)
    console.log(`   LinkedIn: ${lead.company.linkedinUrl || '❌ Não informado'}`)
    console.log(`   Instagram: ${lead.company.instagramHandle || '❌ Não informado'}`)

    console.log('\n💰 DADOS FINANCEIROS:')
    console.log('='.repeat(70))
    console.log(`   Revenue (número): ${lead.company.revenue || '❌ NULL'}`)
    console.log(`   Employees (número): ${lead.company.employees || '❌ NULL'}`)
    console.log(`   Estimated Revenue (string): ${lead.company.estimatedRevenue || '❌ NULL'}`)
    console.log(`   Estimated Employees (string): ${lead.company.estimatedEmployees || '❌ NULL'}`)

    if (lead.company.revenue) {
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(lead.company.revenue)
      console.log(`   Revenue formatado: ${formatted}`)
    }

    if (lead.company.employees) {
      console.log(`   Employees formatado: ${lead.company.employees.toLocaleString('pt-BR')}`)
    }

    console.log('\n👥 CONTATOS SUGERIDOS:')
    console.log('='.repeat(70))
    if (lead.suggestedContacts) {
      const contacts = JSON.parse(lead.suggestedContacts)
      console.log(`   Total: ${contacts.length} contatos`)
      contacts.forEach((contact: any, i: number) => {
        console.log(`\n   ${i + 1}. ${contact.name}`)
        console.log(`      Cargo: ${contact.role}`)
        console.log(`      Email: ${contact.email || '❌ Não informado'}`)
        console.log(`      Phone: ${contact.phone || '❌ Não informado'}`)
        console.log(`      LinkedIn: ${contact.linkedin || '❌ Não informado'}`)
      })
    } else {
      console.log('   ❌ Nenhum contato sugerido')
    }

    console.log('\n🎯 GATILHOS:')
    console.log('='.repeat(70))
    if (lead.triggers) {
      const triggers = JSON.parse(lead.triggers)
      triggers.forEach((trigger: string, i: number) => {
        console.log(`   ${i + 1}. ${trigger}`)
      })
    } else {
      console.log('   ❌ Nenhum gatilho')
    }

    console.log('\n' + '='.repeat(70))
    console.log('📊 ANÁLISE:')
    console.log('='.repeat(70))

    const score = [
      lead.company.cnpj,
      lead.company.revenue,
      lead.company.employees,
      lead.company.location,
      lead.company.website,
      lead.company.linkedinUrl,
      lead.suggestedContacts,
      lead.triggers
    ].filter(Boolean).length

    console.log(`\n✅ Campos preenchidos: ${score}/8`)

    if (!lead.company.revenue) {
      console.log('\n⚠️  PROBLEMA IDENTIFICADO: Revenue não está salvo no banco!')
      console.log('   Possíveis causas:')
      console.log('   1. AI não encontrou a informação')
      console.log('   2. extractRevenueFromString() não conseguiu converter')
      console.log('   3. Brasil API falhou e não tinha fallback da AI')
    }

    if (!lead.company.employees) {
      console.log('\n⚠️  PROBLEMA IDENTIFICADO: Employees não está salvo no banco!')
      console.log('   Possíveis causas:')
      console.log('   1. AI não encontrou a informação')
      console.log('   2. extractEmployeesFromString() não conseguiu converter')
      console.log('   3. Brasil API falhou e não tinha fallback da AI')
    }

    console.log('\n💡 COMO TESTAR O DASHBOARD:')
    console.log(`   1. Acesse: http://localhost:3000/dashboard/leads/${lead.id}`)
    console.log('   2. Verifique se os dados aparecem na seção "Dados da Empresa"')
    console.log('   3. Dados esperados:')
    console.log(`      - Faturamento: ${lead.company.revenue ? 'R$ XXM' : '❌ Não informado'}`)
    console.log(`      - Funcionários: ${lead.company.employees || '❌ Não informado'}`)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkLeadData()
  .then(() => {
    console.log('\n✅ Verificação concluída!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Erro fatal:', error)
    process.exit(1)
  })
