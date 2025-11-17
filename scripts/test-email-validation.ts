// Teste de validação de emails
import { leadOrchestrator } from '../lib/services/lead-orchestrator'

// Acessar método privado via any (apenas para teste)
const orchestrator = leadOrchestrator as any

console.log('🧪 TESTE DE VALIDAÇÃO DE EMAILS\n')
console.log('='.repeat(70))

const testEmails = [
  // Emails INVÁLIDOS (devem ser rejeitados)
  { email: 'a@gmail.com', expected: false, reason: 'Single letter @ gmail' },
  { email: 'test@hotmail.com', expected: false, reason: 'Test email @ hotmail' },
  { email: 'fulano@yahoo.com', expected: false, reason: 'Personal domain (yahoo)' },
  { email: 'joao@outlook.com', expected: false, reason: 'Personal domain (outlook)' },
  { email: 'maria@uol.com.br', expected: false, reason: 'Personal domain (uol)' },
  { email: 'x@empresa.com', expected: false, reason: 'Single letter email' },

  // Emails VÁLIDOS (devem ser aceitos)
  { email: 'aschunck@pagseguro.com', expected: true, reason: 'Email corporativo PagSeguro' },
  { email: 'ricardo.dutra@pagbank.com.br', expected: true, reason: 'Email corporativo PagBank' },
  { email: 'cfo@empresa.com.br', expected: true, reason: 'Email corporativo genérico' },
  { email: 'joao.silva@ambev.com.br', expected: true, reason: 'Email corporativo Ambev' },
]

console.log('\n📧 Testando validação de emails:\n')

let passed = 0
let failed = 0

testEmails.forEach((test, i) => {
  const result = orchestrator.isValidBusinessEmail(test.email)
  const status = result === test.expected ? '✅ PASS' : '❌ FAIL'

  if (result === test.expected) {
    passed++
  } else {
    failed++
  }

  console.log(`${i + 1}. ${status} - ${test.email}`)
  console.log(`   Esperado: ${test.expected ? 'VÁLIDO' : 'INVÁLIDO'}`)
  console.log(`   Resultado: ${result ? 'VÁLIDO' : 'INVÁLIDO'}`)
  console.log(`   Motivo: ${test.reason}`)
  console.log()
})

console.log('='.repeat(70))
console.log(`\n📊 RESULTADO: ${passed}/${testEmails.length} testes passaram`)

if (failed > 0) {
  console.log(`❌ ${failed} testes falharam`)
  process.exit(1)
} else {
  console.log('✅ Todos os testes passaram!')
  process.exit(0)
}
