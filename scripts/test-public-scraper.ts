/**
 * Testa o scraper público do LinkedIn
 * Esse é o que vai rodar em produção (Vercel)
 */

import { publicScraper } from '../lib/services/public-scraper'

async function test() {
  console.log('🧪 Testando Public Scraper (LinkedIn API Pública)\n')
  console.log('Esse é o scraper que será usado em PRODUÇÃO (Vercel)\n')

  try {
    console.log('📡 Buscando vagas de Controller no Brasil...\n')

    const jobs = await publicScraper.scrapeJobs(
      'Controller OR CFO OR Controladoria',
      'Brasil'
    )

    console.log(`\n✅ Total de vagas encontradas: ${jobs.length}\n`)

    if (jobs.length > 0) {
      console.log('📋 Primeiras 5 vagas:\n')
      jobs.slice(0, 5).forEach((job, i) => {
        console.log(`${i + 1}. ${job.jobTitle}`)
        console.log(`   Empresa: ${job.companyName}`)
        console.log(`   Local: ${job.location}`)
        console.log(`   URL: ${job.jobUrl}`)
        console.log(`   Fonte: ${job.jobSource}`)
        console.log('')
      })
    } else {
      console.log('⚠️  Nenhuma vaga encontrada')
      console.log('Isso pode significar:')
      console.log('1. LinkedIn bloqueou o IP')
      console.log('2. Mudaram a estrutura da API')
      console.log('3. Nenhuma vaga para essa busca')
      console.log('\nMas não se preocupe - o fallback vai ativar automaticamente!')
    }

  } catch (error) {
    console.error('\n❌ Erro:', error)
  }
}

test()
