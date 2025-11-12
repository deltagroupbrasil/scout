// Teste RAW da API Apollo - busca sem filtros para ver o que retorna
import 'dotenv/config'

async function testApolloRaw() {
  const API_KEY = process.env.APOLLO_API_KEY

  if (!API_KEY) {
    console.error('❌ APOLLO_API_KEY não configurada')
    return
  }

  console.log('🧪 Teste RAW da API Apollo\n')
  console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`)
  console.log()

  // Teste 1: Buscar qualquer pessoa do PagBank
  try {
    console.log('📍 Teste 1: Buscar QUALQUER pessoa do PagBank')
    console.log('='.repeat(60))

    const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        q_organization_name: 'PagBank',
        page: 1,
        per_page: 5,
      }),
    })

    console.log(`Status: ${response.status} ${response.statusText}`)

    const data = await response.json()
    console.log('\n📦 Resposta completa:')
    console.log(JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('❌ Erro:', error)
  }

  console.log('\n' + '='.repeat(60))

  // Teste 2: Buscar com domain
  try {
    console.log('\n📍 Teste 2: Buscar por domínio pagbank.com.br')
    console.log('='.repeat(60))

    const response = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        q_organization_domains: ['pagbank.com.br'],
        page: 1,
        per_page: 5,
      }),
    })

    console.log(`Status: ${response.status} ${response.statusText}`)

    const data = await response.json()
    console.log('\n📦 Resposta completa:')
    console.log(JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('❌ Erro:', error)
  }

  console.log('\n' + '='.repeat(60))

  // Teste 3: Verificar credits
  try {
    console.log('\n📍 Teste 3: Verificar créditos da conta')
    console.log('='.repeat(60))

    const response = await fetch('https://api.apollo.io/v1/auth/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': API_KEY,
      },
    })

    console.log(`Status: ${response.status} ${response.statusText}`)

    const data = await response.json()
    console.log('\n📦 Health check:')
    console.log(JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('❌ Erro:', error)
  }
}

testApolloRaw()
  .then(() => {
    console.log('\n✅ Teste finalizado!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
