// Teste corrigido do Bright Data Web Unlocker
import 'dotenv/config'

async function testBrightDataCorrected() {
  const API_KEY = process.env.BRIGHT_DATA_UNLOCKER_KEY

  if (!API_KEY) {
    console.error('❌ BRIGHT_DATA_UNLOCKER_KEY não configurada')
    return
  }

  console.log('🧪 Teste Bright Data Web Unlocker (Formato Correto)\n')
  console.log(`🔑 API Key: ${API_KEY}\n`)

  // Teste com formato correto da documentação
  console.log('📍 Teste: Google Search com formato correto')
  console.log('='.repeat(60))

  try {
    const response = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        zone: 'web_unlocker1',
        url: 'https://www.google.com/search?q=CFO+PagBank+Brasil',
        format: 'raw',
        // Adicionar headers customizados
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        }
      })
    })

    console.log(`Status: ${response.status} ${response.statusText}\n`)

    if (response.ok) {
      const html = await response.text()
      console.log('✅ Resposta recebida:')
      console.log(`   Tamanho: ${html.length} caracteres`)
      console.log(`   Contém "Google": ${html.includes('Google') ? '✅' : '❌'}`)
      console.log(`   Contém "PagBank": ${html.includes('PagBank') ? '✅' : '❌'}`)
      console.log(`   Contém "CFO": ${html.includes('CFO') ? '✅' : '❌'}`)

      // Mostrar primeiros 500 caracteres
      console.log('\n📄 Primeiros 500 caracteres:')
      console.log(html.substring(0, 500))
    } else {
      const errorData = await response.json()
      console.error('❌ Erro:')
      console.error(JSON.stringify(errorData, null, 2))
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error)
  }

  console.log('\n' + '='.repeat(60))

  // Teste 2: Com timeout maior
  console.log('\n📍 Teste 2: Com configurações otimizadas')
  console.log('='.repeat(60))

  try {
    const response = await fetch('https://api.brightdata.com/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        zone: 'web_unlocker1',
        url: 'https://httpbin.org/html',
        format: 'raw',
        // Configurações adicionais
        country: 'us',
        solve_captcha: true,
        wait_for_page_load: true
      })
    })

    console.log(`Status: ${response.status} ${response.statusText}\n`)

    if (response.ok) {
      const html = await response.text()
      console.log('✅ HTTPBin HTML recebido:')
      console.log(`   Tamanho: ${html.length} caracteres`)
      console.log(`   Contém "<html": ${html.includes('<html') ? '✅' : '❌'}`)
    } else {
      const errorData = await response.json()
      console.error('❌ Erro:')
      console.error(JSON.stringify(errorData, null, 2))
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error)
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 DIAGNÓSTICO')
  console.log('='.repeat(60))
  console.log('\nSe HTTPBin funcionou mas Google não:')
  console.log('  → Google está bloqueando os IPs do Bright Data')
  console.log('  → Solução: Usar `solve_captcha: true` e `wait_for_page_load: true`')
  console.log('\nSe ambos falharam:')
  console.log('  → Verificar se zona web_unlocker1 está realmente ativa')
  console.log('  → Verificar se tem créditos suficientes')
  console.log('  → Tentar criar uma nova zona no dashboard')
}

testBrightDataCorrected()
  .then(() => {
    console.log('\n✅ Teste finalizado!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
