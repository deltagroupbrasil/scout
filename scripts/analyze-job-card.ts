import * as cheerio from 'cheerio'
import * as fs from 'fs'

// Ler o HTML salvo
const html = fs.readFileSync('indeed-debug.html', 'utf-8')
const $ = cheerio.load(html)

console.log('📊 Analisando estrutura de UMA vaga do Indeed...\n')

// Pegar primeiro card de vaga
const firstJob = $('.job_seen_beacon').first()

console.log('HTML completo do primeiro card:')
console.log('='.repeat(80))
console.log(firstJob.html()?.substring(0, 2000))
console.log('...')
console.log('='.repeat(80))

console.log('\n📋 Campos identificados:\n')

// Tentar extrair cada campo
const selectors = {
  'Título (h2)': 'h2',
  'Título (.jobTitle)': '.jobTitle',
  'Título (span[title])': 'span[title]',
  'Empresa (.companyName)': '.companyName',
  'Empresa ([data-testid*="company"])': '[data-testid*="company"]',
  'Localização (.companyLocation)': '.companyLocation',
  'Localização ([data-testid*="location"])': '[data-testid*="location"]',
  'Job Key ([data-jk])': '[data-jk]',
  'Link (a)': 'a',
  'Descrição (.job-snippet)': '.job-snippet',
  'Descrição ([class*="snippet"])': '[class*="snippet"]',
}

for (const [label, selector] of Object.entries(selectors)) {
  const element = firstJob.find(selector).first()

  if (element.length > 0) {
    const text = element.text().trim().substring(0, 100)
    const attr = element.attr('data-jk') || element.attr('href') || element.attr('title') || ''

    console.log(`✅ ${label}: "${text}"`)
    if (attr) {
      console.log(`   Atributo: ${attr.substring(0, 100)}`)
    }
  } else {
    console.log(`❌ ${label}: NÃO ENCONTRADO`)
  }
}
