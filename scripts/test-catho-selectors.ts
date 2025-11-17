import * as cheerio from 'cheerio'
import * as fs from 'fs'

const html = fs.readFileSync('catho-debug.html', 'utf-8')
const $ = cheerio.load(html)

console.log('🔍 Testando seletores Catho\n')

$('article').each((idx, element) => {
  if (idx >= 3) return // Só 3 primeiras vagas

  const $job = $(element)

  console.log(`\n📋 Vaga ${idx + 1}:`)
  console.log('='.repeat(60))

  // Título
  const title = $job.find('h2 a').first().text().trim()
  console.log(`Título: ${title}`)

  // Link
  const link = $job.find('h2 a').first().attr('href')
  console.log(`Link: ${link}`)

  // Empresa (primeiro <p> no header)
  const companyP = $job.find('header p').first().text().trim()
  const company = companyP.split('Por que?')[0].trim()
  console.log(`Empresa: ${company}`)

  // Localização (no botão com link)
  const locationBtn = $job.find('button a[href*="/vagas/"]').first()
  const location = locationBtn.text().trim()
  console.log(`Localização: ${location}`)

  // Salário
  const salary = $job.find('[class*="salaryText"]').first().text().trim()
  console.log(`Salário: ${salary}`)

  // Descrição
  const description = $job.find('.job-description').first().text().trim()
  console.log(`Descrição: ${description.substring(0, 100)}...`)
})
