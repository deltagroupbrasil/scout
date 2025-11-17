import 'dotenv/config'
import * as fs from 'fs'
import * as cheerio from 'cheerio'

async function debugGupyHTML() {
  const webUnlockerUrl = process.env.BRIGHT_DATA_WEB_UNLOCKER_URL || "https://api.brightdata.com/request"
  const apiKey = process.env.BRIGHT_DATA_UNLOCKER_KEY

  // Testar Gupy
  const searchUrl = `https://portal.gupy.io/job/search?jobName=Controller%20Financeiro`

  console.log('🔍 Fazendo requisição ao Gupy via Bright Data...')
  console.log(`URL: ${searchUrl}\n`)

  const response = await fetch(webUnlockerUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: searchUrl,
      zone: 'web_unlocker1',
      format: 'raw',
    }),
  })

  const html = await response.text()
  console.log(`✅ HTML recebido: ${html.length} caracteres\n`)

  // Salvar HTML para análise
  fs.writeFileSync('gupy-debug.html', html)
  console.log('💾 HTML salvo em: gupy-debug.html\n')

  // Analisar estrutura
  const $ = cheerio.load(html)

  console.log('📊 Análise de seletores:\n')

  // Tentar diferentes seletores
  const selectors = [
    '.job-list__item',
    '[data-testid="job-list__item"]',
    '.sc-job-card',
    '[class*="job-card"]',
    '[class*="JobCard"]',
    '.vacancy-card',
    '[data-testid*="job"]',
    'li[class*="job"]',
    'article',
    '[role="listitem"]',
    '.sc-',
  ]

  for (const selector of selectors) {
    const count = $(selector).length
    if (count > 0) {
      console.log(`✅ "${selector}": ${count} elementos`)

      // Mostrar primeiro elemento
      const first = $(selector).first()
      const text = first.text().trim().substring(0, 100)
      console.log(`   Texto: "${text}..."\n`)
    } else {
      console.log(`❌ "${selector}": 0 elementos`)
    }
  }
}

debugGupyHTML().catch(console.error)
