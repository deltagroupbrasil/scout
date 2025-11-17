// Teste das melhorias implementadas:
// 1. Apollo busca por domínio
// 3. Validação de CNPJ

import 'dotenv/config'
import { apolloEnrichment } from '../lib/services/apollo-enrichment'
import { cnpjValidator } from '../lib/services/cnpj-validator'

async function testMelhorias() {
  console.log('🧪 TESTE DAS MELHORIAS IMPLEMENTADAS\n')
  console.log('='.repeat(70))

  // ==================================================
  // TESTE 1: Apollo busca por domínio
  // ==================================================
  console.log('\n📍 TESTE 1: Apollo com variações de domínio')
  console.log('='.repeat(70))

  console.log('\n🔍 Buscando decisores no PagBank via Apollo...\n')

  const apolloContacts = await apolloEnrichment.findFinancialDecisionMakers(
    'PagBank',
    'pagbank.com.br'
  )

  console.log(`\n📊 Resultado: ${apolloContacts.length} decisores encontrados`)

  if (apolloContacts.length > 0) {
    console.log('\n✅ Decisores encontrados:')
    apolloContacts.forEach((contact, i) => {
      console.log(`\n   ${i + 1}. ${contact.name}`)
      console.log(`      Cargo: ${contact.role}`)
      console.log(`      Email: ${contact.email || '❌'}`)
      console.log(`      Phone: ${contact.phone || '❌'}`)
      console.log(`      LinkedIn: ${contact.linkedin ? '✅' : '❌'}`)
    })
  } else {
    console.log('\n⚠️  Nenhum decisor encontrado')
    console.log('   Possíveis causas:')
    console.log('   - Apollo não tem dados para empresas brasileiras menores')
    console.log('   - Domínio não corresponde ao usado no Apollo')
    console.log('   - API Key inválida ou sem créditos')
  }

  // ==================================================
  // TESTE 2: Validação de CNPJ
  // ==================================================
  console.log('\n\n📍 TESTE 2: Validação de CNPJ')
  console.log('='.repeat(70))

  const testCases = [
    {
      cnpj: '10573521000191',
      empresa: 'PagBank',
      expectedValid: false,
      reason: 'CNPJ é do Mercado Pago/Mercado Livre, não PagBank'
    },
    {
      cnpj: '33172537000108',
      empresa: 'PagBank',
      expectedValid: true,
      reason: 'CNPJ correto do PagBank'
    },
    {
      cnpj: '08561701000101',
      empresa: 'PagSeguro',
      expectedValid: true,
      reason: 'CNPJ correto do PagSeguro'
    },
    {
      cnpj: '18236120000158',
      empresa: 'Nubank',
      expectedValid: true,
      reason: 'CNPJ correto do Nubank'
    }
  ]

  let passed = 0
  let failed = 0

  for (const test of testCases) {
    console.log(`\n🔍 Testando: ${test.empresa} - CNPJ ${test.cnpj}`)
    console.log(`   Motivo do teste: ${test.reason}`)

    const validation = await cnpjValidator.validateCNPJ(test.cnpj, test.empresa)

    const testPassed = validation.isValid === test.expectedValid

    if (testPassed) {
      console.log(`   ✅ PASS - Resultado correto!`)
      console.log(`      Validação: ${validation.isValid ? 'VÁLIDO' : 'INVÁLIDO'}`)
      console.log(`      Confidence: ${validation.confidence}`)
      console.log(`      ${validation.reason}`)
      if (validation.actualCompanyName) {
        console.log(`      Razão Social: ${validation.actualCompanyName}`)
      }
      passed++
    } else {
      console.log(`   ❌ FAIL - Resultado incorreto!`)
      console.log(`      Esperado: ${test.expectedValid ? 'VÁLIDO' : 'INVÁLIDO'}`)
      console.log(`      Recebido: ${validation.isValid ? 'VÁLIDO' : 'INVÁLIDO'}`)
      console.log(`      ${validation.reason}`)
      failed++
    }

    // Rate limit da BrasilAPI
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  console.log('\n' + '='.repeat(70))
  console.log('📊 RESULTADO FINAL')
  console.log('='.repeat(70))

  console.log(`\n🎯 Apollo: ${apolloContacts.length > 0 ? `✅ ${apolloContacts.length} decisores` : '⚠️  Nenhum decisor'}`)
  console.log(`🔐 CNPJ Validation: ${passed}/${testCases.length} testes passaram`)

  if (failed > 0) {
    console.log(`\n⚠️  ${failed} testes de validação falharam`)
  }

  console.log('\n💡 PRÓXIMOS PASSOS:')
  console.log('   1. Se Apollo não encontrou decisores, verificar API key e créditos')
  console.log('   2. Limpar banco: npx tsx scripts/clear-leads.ts')
  console.log('   3. Testar pipeline completo: npx tsx scripts/test-full-pipeline.ts')
  console.log('   4. Verificar se CNPJ errado foi rejeitado nos logs')
}

testMelhorias()
  .then(() => {
    console.log('\n✅ Testes concluídos!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
