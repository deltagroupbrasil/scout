/**
 * Teste de enriquecimento NovaVida com lead Save da base de dados
 */

import { prisma } from '@/lib/prisma'
import { novaVidaTIEnrichment } from '@/lib/services/novavidati-enrichment'

async function testSaveLead() {
  console.log('='.repeat(60))
  console.log('🔍 TESTE NOVA VIDA TI - LEAD SAVE')
  console.log('='.repeat(60))

  // Buscar lead Save na base
  console.log('\n📋 Buscando lead "Save" na base de dados...')

  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { jobTitle: { contains: 'Save' } },
        { company: { name: { contains: 'Save' } } }
      ]
    },
    include: {
      company: true
    },
    take: 5
  })

  if (leads.length === 0) {
    console.log('❌ Nenhum lead "Save" encontrado na base')
    console.log('\n📋 Buscando todos os leads disponíveis...')

    const allLeads = await prisma.lead.findMany({
      include: {
        company: true
      },
      take: 10,
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`\n✅ Encontrados ${allLeads.length} leads:`)
    allLeads.forEach((lead, idx) => {
      console.log(`\n   ${idx + 1}. ${lead.company.name}`)
      console.log(`      Vaga: ${lead.jobTitle}`)
      console.log(`      CNPJ: ${lead.company.cnpj || 'N/A'}`)
      console.log(`      Status: ${lead.status}`)
    })

    if (allLeads.length > 0) {
      console.log('\n💡 Usando primeiro lead disponível para teste...')
      const testLead = allLeads[0]
      await testLeadEnrichment(testLead)
    }

    return
  }

  console.log(`\n✅ Encontrados ${leads.length} leads com "Save":`)
  leads.forEach((lead, idx) => {
    console.log(`\n   ${idx + 1}. ${lead.company.name}`)
    console.log(`      Vaga: ${lead.jobTitle}`)
    console.log(`      CNPJ: ${lead.company.cnpj || 'N/A'}`)
    console.log(`      Status: ${lead.status}`)
  })

  // Usar primeiro lead para teste
  const testLead = leads[0]
  await testLeadEnrichment(testLead)
}

async function testLeadEnrichment(lead: any) {
  console.log('\n' + '='.repeat(60))
  console.log('🧪 TESTANDO ENRIQUECIMENTO')
  console.log('='.repeat(60))

  console.log(`\n🏢 Empresa: ${lead.company.name}`)
  console.log(`📋 Vaga: ${lead.jobTitle}`)
  console.log(`🆔 Lead ID: ${lead.id}`)
  console.log(`🏭 Company ID: ${lead.company.id}`)

  // Verificar se tem CNPJ
  if (!lead.company.cnpj) {
    console.log('\n❌ Empresa não tem CNPJ cadastrado')
    console.log('   Não é possível enriquecer sem CNPJ')

    console.log('\n💡 Tentando buscar CNPJ...')
    // Aqui você poderia integrar com CNPJ Finder
    console.log('   (Implementar busca de CNPJ se necessário)')

    return
  }

  console.log(`📝 CNPJ: ${lead.company.cnpj}`)

  // Testar enriquecimento
  console.log('\n🔄 Iniciando enriquecimento NovaVida...')

  const enrichedData = await novaVidaTIEnrichment.enrichCompanyContacts(
    lead.company.cnpj,
    lead.company.name
  )

  if (!enrichedData) {
    console.log('\n❌ Enriquecimento falhou ou empresa não encontrada')
    return
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ DADOS ENRIQUECIDOS')
  console.log('='.repeat(60))

  console.log(`\n🏢 Empresa:`)
  console.log(`   Razão Social: ${enrichedData.razaoSocial}`)
  console.log(`   Nome Fantasia: ${enrichedData.nomeFantasia || 'N/A'}`)
  console.log(`   CNPJ: ${enrichedData.cnpj}`)
  console.log(`   Porte: ${enrichedData.porte || 'N/A'}`)
  console.log(`   Capital Social: ${enrichedData.capitalSocial ? `R$ ${enrichedData.capitalSocial.toLocaleString('pt-BR')}` : 'N/A'}`)
  console.log(`   Funcionários: ${enrichedData.qtdeFuncionarios || 'N/A'}`)
  console.log(`   Data Abertura: ${enrichedData.dataAbertura || 'N/A'}`)

  console.log(`\n📞 Contatos Corporativos:`)
  console.log(`   Telefones: ${enrichedData.telefones.length}`)
  if (enrichedData.telefones.length > 0) {
    enrichedData.telefones.slice(0, 5).forEach((tel, idx) => {
      console.log(`      ${idx + 1}. ${formatPhone(tel)}`)
    })
    if (enrichedData.telefones.length > 5) {
      console.log(`      ... e mais ${enrichedData.telefones.length - 5}`)
    }
  }

  console.log(`\n   Emails: ${enrichedData.emails.length}`)
  if (enrichedData.emails.length > 0) {
    enrichedData.emails.slice(0, 5).forEach((email, idx) => {
      console.log(`      ${idx + 1}. ${email}`)
    })
    if (enrichedData.emails.length > 5) {
      console.log(`      ... e mais ${enrichedData.emails.length - 5}`)
    }
  }

  if (enrichedData.whatsapp && enrichedData.whatsapp.length > 0) {
    console.log(`\n   WhatsApp: ${enrichedData.whatsapp.length}`)
    enrichedData.whatsapp.slice(0, 3).forEach((whats, idx) => {
      console.log(`      ${idx + 1}. ${formatPhone(whats)}`)
    })
  }

  console.log(`\n👔 Decisores (Sócios/Diretores): ${enrichedData.socios.length}`)

  if (enrichedData.socios.length > 0) {
    const topDecisores = enrichedData.socios.slice(0, 5)

    topDecisores.forEach((socio, idx) => {
      console.log(`\n   ${idx + 1}. ${socio.nome}`)
      console.log(`      Cargo: ${socio.qualificacao}`)

      if (socio.participacao) {
        console.log(`      Participação: ${socio.participacao}`)
      }

      if (socio.telefones.length > 0) {
        console.log(`      Telefones: ${socio.telefones.length}`)
        socio.telefones.forEach(tel => {
          console.log(`         📱 ${formatPhone(tel)}`)
        })
      }

      if (socio.emails.length > 0) {
        console.log(`      Emails: ${socio.emails.length}`)
        socio.emails.forEach(email => {
          console.log(`         📧 ${email}`)
        })
      }
    })

    if (enrichedData.socios.length > 5) {
      console.log(`\n   ... e mais ${enrichedData.socios.length - 5} decisores`)
    }
  }

  // Estatísticas
  const totalTelefones = enrichedData.telefones.length +
    enrichedData.socios.reduce((sum, s) => sum + s.telefones.length, 0)
  const totalEmails = enrichedData.emails.length +
    enrichedData.socios.reduce((sum, s) => sum + s.emails.length, 0)

  console.log('\n' + '='.repeat(60))
  console.log('📊 ESTATÍSTICAS')
  console.log('='.repeat(60))
  console.log(`\n   Total de Telefones: ${totalTelefones}`)
  console.log(`   Total de Emails: ${totalEmails}`)
  console.log(`   Total de Decisores: ${enrichedData.socios.length}`)
  console.log(`   Total de Contatos: ${totalTelefones + totalEmails}`)

  // Proposta de atualização do lead
  console.log('\n' + '='.repeat(60))
  console.log('💡 PROPOSTA DE ATUALIZAÇÃO DO LEAD')
  console.log('='.repeat(60))

  console.log('\n📝 Campos que seriam atualizados:')
  console.log(`   company.revenue: ${enrichedData.capitalSocial || 'N/A'}`)
  console.log(`   company.employees: ${enrichedData.qtdeFuncionarios || 'N/A'}`)
  console.log(`   company.sector: ${enrichedData.porte || 'N/A'}`)
  console.log(`   lead.companyPhones: ${JSON.stringify(enrichedData.telefones.slice(0, 3))}`)
  console.log(`   lead.companyEmails: ${JSON.stringify(enrichedData.emails.slice(0, 3))}`)
  console.log(`   lead.companyWhatsApp: ${enrichedData.whatsapp?.[0] || 'N/A'}`)

  console.log('\n👥 Contatos sugeridos que seriam adicionados:')
  enrichedData.socios.slice(0, 3).forEach((socio, idx) => {
    console.log(`\n   ${idx + 1}. ${socio.nome}`)
    console.log(`      Cargo: ${socio.qualificacao}`)
    console.log(`      Email: ${socio.emails[0] || 'N/A'}`)
    console.log(`      Telefone: ${socio.telefones[0] ? formatPhone(socio.telefones[0]) : 'N/A'}`)
  })

  // Uso e custo
  const usage = await novaVidaTIEnrichment.getMonthlyUsage()
  console.log('\n' + '='.repeat(60))
  console.log('💰 USO MENSAL')
  console.log('='.repeat(60))
  console.log(`\n   Mês: ${usage.currentMonth}`)
  console.log(`   Total de Consultas: ${usage.queries}`)
  console.log(`   Custo Total: R$ ${usage.totalCost.toFixed(2)}`)

  console.log('\n' + '='.repeat(60))
  console.log('✅ TESTE CONCLUÍDO COM SUCESSO!')
  console.log('='.repeat(60))
}

function formatPhone(phone: string): string {
  if (phone.length === 11) {
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`
  } else if (phone.length === 10) {
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`
  }
  return phone
}

testSaveLead()
  .then(() => {
    console.log('\n✅ Script finalizado')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
