import 'dotenv/config'
import puppeteer from 'puppeteer-core'

async function testPuppeteer() {
  const BROWSER_WS = process.env.BRIGHT_DATA_PUPPETEER_URL

  console.log('🔍 Testando Bright Data Puppeteer...')
  console.log(`WebSocket: ${BROWSER_WS}\n`)

  try {
    console.log('📡 Conectando ao navegador remoto...')
    const browser = await puppeteer.connect({
      browserWSEndpoint: BROWSER_WS,
    })

    console.log('✅ Conexão estabelecida!')

    const page = await browser.newPage()
    console.log('📄 Nova página criada')

    console.log('🌐 Navegando para Google...')
    await page.goto('https://www.google.com', { waitUntil: 'networkidle2' })

    const title = await page.title()
    console.log(`✅ Título da página: "${title}"`)

    await browser.close()
    console.log('\n✅ Teste concluído com sucesso!')

  } catch (error) {
    console.error('\n❌ Erro:', error)

    if (error instanceof Error) {
      console.error(`Mensagem: ${error.message}`)
      console.error(`Stack: ${error.stack}`)
    }
  }
}

testPuppeteer()
