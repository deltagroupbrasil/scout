// Test Bright Data Puppeteer Connection
import 'dotenv/config'
import puppeteer from 'puppeteer-core'

async function testPuppeteerConnection() {
  console.log('🧪 TESTANDO CONEXÃO BRIGHT DATA PUPPETEER\n')
  console.log('='.repeat(70))

  const browserWSEndpoint = process.env.BRIGHT_DATA_PUPPETEER_URL

  if (!browserWSEndpoint) {
    console.error('❌ BRIGHT_DATA_PUPPETEER_URL não configurada no .env')
    process.exit(1)
  }

  console.log('\n📋 Configuração:')
  console.log(`   URL: ${browserWSEndpoint.replace(/:[^:]*@/, ':***@')}`)

  try {
    console.log('\n🔌 Tentando conectar ao navegador Bright Data...')

    const browser = await puppeteer.connect({
      browserWSEndpoint,
    })

    console.log('✅ Conexão estabelecida com sucesso!')

    // Tentar abrir uma página simples
    console.log('\n📄 Abrindo página de teste...')
    const page = await browser.newPage()

    await page.goto('https://example.com', {
      waitUntil: 'networkidle0',
      timeout: 30000
    })

    const title = await page.title()
    console.log(`✅ Página carregada: "${title}"`)

    await browser.close()
    console.log('\n✅ TESTE PASSOU! Bright Data Puppeteer está funcionando.')

  } catch (error: any) {
    console.error('\n❌ ERRO NA CONEXÃO:')
    console.error(`   Tipo: ${error.constructor.name}`)
    console.error(`   Mensagem: ${error.message}`)

    if (error.message?.includes('403')) {
      console.error('\n🔍 DIAGNÓSTICO DO ERRO 403:')
      console.error('   1. Credenciais inválidas ou expiradas')
      console.error('   2. Zona "scraping_browser1" pode estar desativada')
      console.error('   3. Limite de requisições atingido')
      console.error('   4. IP bloqueado temporariamente')
      console.error('\n💡 SOLUÇÕES:')
      console.error('   - Verificar no painel Bright Data se a zona está ativa')
      console.error('   - Verificar créditos/limite de requisições')
      console.error('   - Regenerar credenciais da zona')
      console.error('   - Aguardar alguns minutos e tentar novamente')
    }

    process.exit(1)
  }
}

testPuppeteerConnection()
  .then(() => {
    console.log('\n🏁 Teste concluído!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Erro não tratado:', error)
    process.exit(1)
  })
