import * as cheerio from 'cheerio'
import * as fs from 'fs'

// Ler o HTML salvo
const html = fs.readFileSync('catho-debug.html', 'utf-8')
const $ = cheerio.load(html)

console.log('📊 Analisando estrutura de UMA vaga do Catho...\n')

// Pegar primeiro article
const firstJob = $('article').first()

console.log('HTML completo do primeiro card:')
console.log('='.repeat(80))
console.log(firstJob.html()?.substring(0, 2000))
console.log('...')
console.log('='.repeat(80))

console.log('\n📋 Campos identificados:\n')

// Tentar extrair cada campo
const selectors = {
  'Título (h2)': 'h2',
  'Título (h3)': 'h3',
  'Título ([data-testid*="title"])': '[data-testid*="title"]',
  'Título (a)': 'a',
  'Empresa (span)': 'span',
  'Empresa ([data-testid*="company"])': '[data-testid*="company"]',
  'Localização ([data-testid*="location"])': '[data-testid*="location"]',
  'Salário ([data-testid*="salary"])': '[data-testid*="salary"]',
  'Link (a[href])': 'a[href]',
  'Descrição (p)': 'p',
}

for (const [label, selector] of Object.entries(selectors)) {
  const element = firstJob.find(selector).first()

  if (element.length > 0) {
    const text = element.text().trim().substring(0, 100)
    const href = element.attr('href') || ''

    console.log(`✅ ${label}: "${text}"`)
    if (href) {
      console.log(`   Link: ${href.substring(0, 100)}`)
    }
  } else {
    console.log(`❌ ${label}: NÃO ENCONTRADO`)
  }
}
