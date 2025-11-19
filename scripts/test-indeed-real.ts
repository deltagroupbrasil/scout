import { indeedScraper } from '../lib/services/indeed-scraper'

async function testIndeed() {
  console.log('🧪 Testando Indeed Scraper com Web Unlocker REAL\n')

  const jobs = await indeedScraper.scrapeJobs('Controller São Paulo', 'Brasil')

  console.log(`\n✅ Total: ${jobs.length} vagas\n`)

  if (jobs.length > 0) {
    console.log('📋 Primeiras 10 vagas:\n')
    jobs.slice(0, 10).forEach((j, i) => {
      console.log(`${i + 1}. ${j.companyName} - ${j.jobTitle}`)
    })
  }
}

testIndeed().catch(console.error)
