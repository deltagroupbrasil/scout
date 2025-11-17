/**
 * Script de Teste: Email Validation Service
 *
 * Testa validação de emails em vários cenários:
 * - Emails válidos
 * - Emails inválidos
 * - Emails descartáveis
 * - Emails sem domínio
 * - Emails corporativos vs pessoais
 */

import { emailValidatorService } from '../lib/services/email-validator'

async function testEmailValidation() {
  console.log('🧪 Testando Email Validation Service\n')
  console.log('='.repeat(70))

  const testCases = [
    // Válidos - Corporativos
    { email: 'joao.silva@petrobras.com.br', expected: true, type: 'Corporativo válido' },
    { email: 'maria@magazineluiza.com.br', expected: true, type: 'Corporativo válido' },
    { email: 'carlos.pereira@vale.com', expected: true, type: 'Corporativo válido' },

    // Válidos - Pessoais (formato ok, mas não corporativo)
    { email: 'teste@gmail.com', expected: true, type: 'Pessoal válido' },
    { email: 'user@hotmail.com', expected: true, type: 'Pessoal válido' },
    { email: 'contato@yahoo.com.br', expected: true, type: 'Pessoal válido' },

    // Inválidos - Formato
    { email: 'invalid', expected: false, type: 'Sem @' },
    { email: 'invalid@', expected: false, type: 'Sem domínio' },
    { email: '@domain.com', expected: false, type: 'Sem local part' },
    { email: 'in valid@domain.com', expected: false, type: 'Espaço no email' },
    { email: 'invalid@domain', expected: false, type: 'Domínio sem TLD' },

    // Inválidos - Descartáveis
    { email: 'test@guerrillamail.com', expected: false, type: 'Email descartável' },
    { email: 'user@tempmail.com', expected: false, type: 'Email descartável' },
    { email: 'fake@10minutemail.com', expected: false, type: 'Email descartável' },

    // Inválidos - Domínio não existe
    { email: 'user@dominio-que-nao-existe-12345.com', expected: false, type: 'Domínio inexistente' },
  ]

  console.log('\n📧 TESTE 1: Validação Completa (com DNS lookup)\n')

  for (const testCase of testCases) {
    const startTime = Date.now()
    const result = await emailValidatorService.validateEmail(testCase.email)
    const duration = Date.now() - startTime

    const status = result.valid === testCase.expected ? '✅' : '❌'
    const confidence = result.valid ? `(${result.confidence})` : ''

    console.log(`${status} ${testCase.email.padEnd(40)} - ${testCase.type}`)
    console.log(`   Válido: ${result.valid} ${confidence}`)
    console.log(`   Checks: Format=${result.checks.format}, Domain=${result.checks.domain}, Disposable=${result.checks.disposable}`)
    if (!result.valid && result.reason) {
      console.log(`   Razão: ${result.reason}`)
    }
    console.log(`   Tempo: ${duration}ms\n`)
  }

  console.log('='.repeat(70))
  console.log('\n⚡ TESTE 2: Validação Rápida (sem DNS lookup)\n')

  for (const testCase of testCases.slice(0, 5)) {  // Apenas alguns casos
    const startTime = Date.now()
    const result = emailValidatorService.validateEmailFast(testCase.email)
    const duration = Date.now() - startTime

    const status = result.valid ? '✅' : '❌'
    console.log(`${status} ${testCase.email.padEnd(40)} - ${duration}ms`)
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n🏢 TESTE 3: Detecção de Email Corporativo\n')

  const businessTests = [
    { email: 'joao@petrobras.com.br', expected: true },
    { email: 'maria@magazineluiza.com.br', expected: true },
    { email: 'teste@gmail.com', expected: false },
    { email: 'user@hotmail.com', expected: false },
    { email: 'contato@outlook.com', expected: false },
    { email: 'admin@empresa-xpto.com.br', expected: true },
  ]

  for (const test of businessTests) {
    const isBusiness = emailValidatorService.isBusinessEmail(test.email)
    const status = isBusiness === test.expected ? '✅' : '❌'
    const type = isBusiness ? 'Corporativo' : 'Pessoal'
    console.log(`${status} ${test.email.padEnd(40)} - ${type}`)
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n📊 TESTE 4: Score de Qualidade (0-100)\n')

  const scoreTests = [
    'joao.silva@petrobras.com.br',
    'maria@gmail.com',
    'invalid@',
    'test@guerrillamail.com',
  ]

  for (const email of scoreTests) {
    const score = await emailValidatorService.scoreEmail(email)
    const stars = '⭐'.repeat(Math.floor(score / 20))
    console.log(`${email.padEnd(40)} - Score: ${score}/100 ${stars}`)
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n🚀 TESTE 5: Validação em Batch (5 emails)\n')

  const batchEmails = [
    'joao@petrobras.com.br',
    'maria@magazineluiza.com.br',
    'invalid@email',
    'test@gmail.com',
    'user@tempmail.com',
  ]

  const startTime = Date.now()
  const batchResults = await emailValidatorService.validateEmailBatch(batchEmails, {
    fast: false,
    maxConcurrent: 3
  })
  const duration = Date.now() - startTime

  for (const result of batchResults) {
    const status = result.valid ? '✅' : '❌'
    console.log(`${status} ${result.email.padEnd(35)} - ${result.valid ? result.confidence : result.reason}`)
  }

  console.log(`\n⏱️  Tempo total: ${duration}ms (média: ${(duration / batchEmails.length).toFixed(0)}ms/email)`)

  console.log('\n' + '='.repeat(70))
  console.log('\n🎯 TESTE 6: Sugestões de Email Pattern\n')

  const suggestions = emailValidatorService.suggestEmailPattern(
    'João',
    'Silva',
    'petrobras.com.br'
  )

  console.log('Pessoa: João Silva')
  console.log('Domínio: petrobras.com.br\n')
  console.log('Sugestões de email pattern:')
  suggestions.forEach((pattern, i) => {
    console.log(`  ${i + 1}. ${pattern}`)
  })

  console.log('\n' + '='.repeat(70))
  console.log('\n✅ Todos os testes concluídos!\n')
}

testEmailValidation()
  .catch(error => {
    console.error('❌ Erro durante testes:', error)
    process.exit(1)
  })
