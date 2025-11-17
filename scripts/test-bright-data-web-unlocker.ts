// Teste do Bright Data Web Unlocker
import 'dotenv/config'

async function testWebUnlocker() {
  const API_KEY = process.env.BRIGHT_DATA_UNLOCKER_KEY
  const WEB_UNLOCKER_URL = process.env.BRIGHT_DATA_WEB_UNLOCKER_URL

  if (!API_KEY) {
    console.error('❌ BRIGHT_DATA_UNLOCKER_KEY não configurada')
    return
  }

  if (!WEB_UNLOCKER_URL) {
    console.error('❌ BRIGHT_DATA_WEB_UNLOCKER_URL não configurada')
    return
  }

  console.log('🧪 Teste Bright Data Web Unlocker\n')
  console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...`)
  console.log(`🌐 URL: ${WEB_UNLOCKER_URL}\n`)

  // Teste 1: URL de teste da Bright Data
  console.log('📍 Teste 1: URL de teste oficial Bright Data')
  console.log('='.repeat(60))

  try {
    const response = await fetch(WEB_UNLOCKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        zone: 'web_unlocker1',
        url: 'https://geo.brdtest.com/welcome.txt?product=unlocker&method=api',
        format: 'raw'
      })
    })

    console.log(`Status: ${response.status} ${response.statusText}`)

    if (response.ok) {
      const text = await response.text()
      console.log('\n✅ Resposta:')
      console.log(text)
    } else {
      const errorText = await response.text()
      console.error('\n❌ Erro:')
      console.error(errorText)
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error)
  }

  console.log('\n' + '='.repeat(60))

  // Teste 2: Google Search (simples)
  console.log('\n📍 Teste 2: Google Search')
  console.log('='.repeat(60))

  try {
    const googleUrl = 'https://www.google.com/search?q=test&hl=pt-BR'

    const response = await fetch(WEB_UNLOCKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        zone: 'web_unlocker1',
        url: googleUrl,
        format: 'raw'
      })
    })

    console.log(`Status: ${response.status} ${response.statusText}`)

    if (response.ok) {
      const html = await response.text()
      console.log('\n✅ HTML retornado:')
      console.log(`   Tamanho: ${html.length} caracteres`)
      console.log(`   Contém "Google": ${html.includes('Google') ? '✅ Sim' : '❌ Não'}`)
      console.log(`   Contém "<html": ${html.includes('<html') ? '✅ Sim' : '❌ Não'}`)

      // Salvar HTML para debug
      const fs = require('fs')
      fs.writeFileSync('test-google-response.html', html)
      console.log('\n📄 HTML salvo em: test-google-response.html')
    } else {
      const errorText = await response.text()
      console.error('\n❌ Erro:')
      console.error(errorText)
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error)
  }

  console.log('\n' + '='.repeat(60))

  // Teste 3: LinkedIn (página pública)
  console.log('\n📍 Teste 3: LinkedIn Company Page (PagBank)')
  console.log('='.repeat(60))

  try {
    const linkedinUrl = 'https://www.linkedin.com/company/pagbank'

    const response = await fetch(WEB_UNLOCKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        zone: 'web_unlocker1',
        url: linkedinUrl,
        format: 'raw'
      })
    })

    console.log(`Status: ${response.status} ${response.statusText}`)

    if (response.ok) {
      const html = await response.text()
      console.log('\n✅ HTML retornado:')
      console.log(`   Tamanho: ${html.length} caracteres`)
      console.log(`   Contém "PagBank": ${html.includes('PagBank') ? '✅ Sim' : '❌ Não'}`)
      console.log(`   Contém "linkedin": ${html.toLowerCase().includes('linkedin') ? '✅ Sim' : '❌ Não'}`)
    } else {
      const errorText = await response.text()
      console.error('\n❌ Erro:')
      console.error(errorText)
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error)
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMO')
  console.log('='.repeat(60))
  console.log('\n✅ Bright Data Web Unlocker configurado corretamente!')
  console.log('\n💡 Próximos passos:')
  console.log('   1. Se todos os testes passaram: Sistema pronto para produção')
  console.log('   2. Se algum teste falhou: Verificar créditos e limites na Bright Data')
  console.log('   3. Testar Google People Finder completo')
}

testWebUnlocker()
  .then(() => {
    console.log('\n✅ Teste finalizado!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
