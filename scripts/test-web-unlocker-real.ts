/**
 * Teste REAL do Bright Data Web Unlocker
 */

async function testWebUnlocker() {
  const API_KEY = process.env.BRIGHT_DATA_UNLOCKER_KEY
  const WEB_UNLOCKER_URL = process.env.BRIGHT_DATA_WEB_UNLOCKER_URL || "https://api.brightdata.com/request"

  console.log('🧪 Testando Bright Data Web Unlocker\n')
  console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 10)}...` : '❌ NÃO CONFIGURADA')
  console.log('URL:', WEB_UNLOCKER_URL)

  if (!API_KEY) {
    console.error('\n❌ BRIGHT_DATA_UNLOCKER_KEY não configurada!')
    process.exit(1)
  }

  try {
    console.log('\n📡 Fazendo requisição ao Indeed Brasil...')

    const indeedUrl = 'https://br.indeed.com/jobs?q=Controller+Financeiro&l=S%C3%A3o+Paulo&sort=date&limit=10'
    console.log(`URL: ${indeedUrl}`)

    const response = await fetch(WEB_UNLOCKER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: indeedUrl,
        zone: 'web_unlocker1',
        format: 'raw',
      }),
    })

    console.log(`\nStatus: ${response.status} ${response.statusText}`)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('\n❌ ERRO:', errorText)
      return
    }

    const html = await response.text()
    console.log(`\n✅ HTML recebido: ${html.length} caracteres`)
    console.log('Primeiros 500 caracteres:', html.substring(0, 500))

    // Verificar se tem vagas no HTML
    const hasJobs = html.includes('jobTitle') || html.includes('job_') || html.includes('position')
    if (hasJobs) {
      console.log('\n✅ HTML PARECE CONTER VAGAS!')
    } else {
      console.log('\n⚠️  HTML não parece conter vagas (pode ser bloqueio ou parsing necessário)')
    }

  } catch (error) {
    console.error('\n❌ Erro ao testar Web Unlocker:', error)
  }
}

testWebUnlocker().catch(console.error)
