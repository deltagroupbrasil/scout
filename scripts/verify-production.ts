/**
 * Script de verificação completa do sistema em produção
 * Testa todos os endpoints e funcionalidades críticas
 */

const PRODUCTION_URL = 'https://leapscout.vercel.app'

interface TestResult {
  name: string
  success: boolean
  message: string
  details?: any
}

const results: TestResult[] = []

async function runTest(name: string, testFn: () => Promise<{ success: boolean; message: string; details?: any }>) {
  console.log(`\n🧪 Testando: ${name}`)
  try {
    const result = await testFn()
    results.push({ name, ...result })

    if (result.success) {
      console.log(`✅ ${result.message}`)
    } else {
      console.log(`❌ ${result.message}`)
    }

    if (result.details) {
      console.log('   Detalhes:', JSON.stringify(result.details, null, 2))
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    results.push({ name, success: false, message })
    console.log(`❌ Erro: ${message}`)
  }
}

async function testHealthEndpoint() {
  const response = await fetch(`${PRODUCTION_URL}/api/health`)
  const data = await response.json()

  return {
    success: response.ok && data.status === 'OK' && data.database.connected,
    message: response.ok ? `Health check OK - ${data.database.userCount} usuários` : 'Health check falhou',
    details: data
  }
}

async function testAuthEndpoint() {
  const response = await fetch(`${PRODUCTION_URL}/api/auth/session`)

  return {
    success: response.ok,
    message: response.ok ? 'Endpoint de autenticação acessível' : 'Endpoint de autenticação com erro',
    details: { status: response.status }
  }
}

async function testLeadsEndpoint() {
  const response = await fetch(`${PRODUCTION_URL}/api/leads`)
  const data = await response.json()

  // Esperamos 401 porque não estamos autenticados
  return {
    success: response.status === 401 && data.error === 'Não autorizado',
    message: response.status === 401
      ? 'Endpoint de leads protegido corretamente'
      : `Status inesperado: ${response.status}`,
    details: { status: response.status, data }
  }
}

async function testDatabaseTables() {
  // Testa se conseguimos fazer queries básicas via health endpoint
  const response = await fetch(`${PRODUCTION_URL}/api/health`)
  const data = await response.json()

  return {
    success: response.ok && data.database.connected && data.database.userCount >= 0,
    message: data.database.connected
      ? 'Tabelas do banco acessíveis'
      : 'Erro ao acessar tabelas',
    details: { userCount: data.database.userCount }
  }
}

async function testEnvironmentVariables() {
  const response = await fetch(`${PRODUCTION_URL}/api/health`)
  const data = await response.json()

  const hasAllVars =
    data.environment.DATABASE_URL &&
    data.environment.NEXTAUTH_SECRET &&
    data.environment.NEXTAUTH_URL

  return {
    success: hasAllVars,
    message: hasAllVars
      ? 'Variáveis de ambiente configuradas'
      : 'Variáveis de ambiente faltando',
    details: data.environment
  }
}

async function testHomePage() {
  const response = await fetch(`${PRODUCTION_URL}`)

  return {
    success: response.ok,
    message: response.ok
      ? 'Página inicial acessível'
      : `Erro ao acessar página inicial: ${response.status}`,
    details: { status: response.status }
  }
}

async function testLoginPage() {
  const response = await fetch(`${PRODUCTION_URL}/login`)

  return {
    success: response.ok,
    message: response.ok
      ? 'Página de login acessível'
      : `Erro ao acessar login: ${response.status}`,
    details: { status: response.status }
  }
}

async function main() {
  console.log('🚀 Verificação Completa do Sistema LeapScout')
  console.log('=' .repeat(60))
  console.log(`URL de Produção: ${PRODUCTION_URL}`)
  console.log('=' .repeat(60))

  // Executar todos os testes
  await runTest('1. Health Endpoint', testHealthEndpoint)
  await runTest('2. Autenticação', testAuthEndpoint)
  await runTest('3. Leads Endpoint (Proteção)', testLeadsEndpoint)
  await runTest('4. Tabelas do Banco de Dados', testDatabaseTables)
  await runTest('5. Variáveis de Ambiente', testEnvironmentVariables)
  await runTest('6. Página Inicial', testHomePage)
  await runTest('7. Página de Login', testLoginPage)

  // Resumo final
  console.log('\n' + '=' .repeat(60))
  console.log('📊 RESUMO DA VERIFICAÇÃO')
  console.log('=' .repeat(60))

  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const total = results.length

  console.log(`\n✅ Testes Aprovados: ${passed}/${total}`)
  console.log(`❌ Testes Falhados: ${failed}/${total}`)

  if (failed > 0) {
    console.log('\n❌ Testes que falharam:')
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`)
    })
  }

  console.log('\n' + '=' .repeat(60))

  if (failed === 0) {
    console.log('🎉 Sistema funcionando perfeitamente!')
  } else {
    console.log('⚠️  Sistema com problemas - verifique os erros acima')
    process.exit(1)
  }
}

main().catch(console.error)
