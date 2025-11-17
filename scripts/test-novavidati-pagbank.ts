/**
 * Teste específico com PagBank para validar toda a integração
 */

import { novaVidaTIEnrichment } from '@/lib/services/novavidati-enrichment'

async function testPagBank() {
  console.log('='.repeat(60))
  console.log('🏦 TESTE NOVA VIDA TI - PAGBANK')
  console.log('='.repeat(60))

  const cnpj = '08561701000101'
  const name = 'PagBank PagSeguro'

  console.log(`\n🔍 Consultando: ${name}`)
  console.log(`   CNPJ: ${cnpj}`)

  const result = await novaVidaTIEnrichment.enrichCompanyContacts(cnpj, name)

  if (!result) {
    console.log('❌ Falha na consulta')
    return
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ DADOS COMPLETOS')
  console.log('='.repeat(60))

  console.log(`\n🏢 Empresa:`)
  console.log(`   Razão Social: ${result.razaoSocial}`)
  console.log(`   Nome Fantasia: ${result.nomeFantasia || 'N/A'}`)
  console.log(`   CNPJ: ${result.cnpj}`)
  console.log(`   Porte: ${result.porte || 'N/A'}`)
  console.log(`   Capital Social: ${result.capitalSocial ? `R$ ${result.capitalSocial.toLocaleString('pt-BR')}` : 'N/A'}`)
  console.log(`   Funcionários: ${result.qtdeFuncionarios || 'N/A'}`)
  console.log(`   Data Abertura: ${result.dataAbertura || 'N/A'}`)

  console.log(`\n📞 Contatos Corporativos:`)
  console.log(`   Telefones: ${result.telefones.length}`)
  result.telefones.slice(0, 5).forEach((tel, idx) => {
    console.log(`      ${idx + 1}. ${formatPhone(tel)}`)
  })

  console.log(`\n   Emails: ${result.emails.length}`)
  result.emails.slice(0, 5).forEach((email, idx) => {
    console.log(`      ${idx + 1}. ${email}`)
  })

  if (result.whatsapp && result.whatsapp.length > 0) {
    console.log(`\n   WhatsApp: ${result.whatsapp.length}`)
    result.whatsapp.slice(0, 3).forEach((whats, idx) => {
      console.log(`      ${idx + 1}. ${formatPhone(whats)}`)
    })
  }

  console.log(`\n👔 Decisores (Sócios/Diretores): ${result.socios.length}`)

  // Mostrar apenas os 5 primeiros decisores
  const topDecisores = result.socios.slice(0, 5)

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

  // Estatísticas
  const totalContacts =
    result.telefones.length +
    result.emails.length +
    result.socios.reduce((sum, s) => sum + s.telefones.length + s.emails.length, 0)

  console.log('\n' + '='.repeat(60))
  console.log('📊 ESTATÍSTICAS')
  console.log('='.repeat(60))
  console.log(`\n   Total de Telefones: ${result.telefones.length + result.socios.reduce((sum, s) => sum + s.telefones.length, 0)}`)
  console.log(`   Total de Emails: ${result.emails.length + result.socios.reduce((sum, s) => sum + s.emails.length, 0)}`)
  console.log(`   Total de Decisores: ${result.socios.length}`)
  console.log(`   Total de Contatos: ${totalContacts}`)

  // Uso e custo
  const usage = await novaVidaTIEnrichment.getMonthlyUsage()
  console.log(`\n💰 Uso Mensal (${usage.currentMonth}):`)
  console.log(`   Consultas: ${usage.queries}`)
  console.log(`   Custo Total: R$ ${usage.totalCost.toFixed(2)}`)

  console.log('\n' + '='.repeat(60))
  console.log('✅ INTEGRAÇÃO VALIDADA COM SUCESSO!')
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

testPagBank()
  .then(() => {
    console.log('\n✅ Teste concluído')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
