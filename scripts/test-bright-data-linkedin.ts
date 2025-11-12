// Teste de Scraping do LinkedIn via Bright Data Puppeteer
import { brightDataContactScraper } from '../lib/services/bright-data-contact-scraper'

async function testLinkedInScraping() {
  console.log('🧪 Testando Scraping de LinkedIn via Bright Data Puppeteer\n')

  // Perfis de teste (usar perfis públicos ou seus próprios)
  const testProfiles = [
    {
      name: 'Teste Profile 1',
      url: 'https://www.linkedin.com/in/williamhgates/', // Bill Gates (perfil público)
    },
    {
      name: 'Teste Profile 2',
      url: 'https://www.linkedin.com/in/satyanadella/', // Satya Nadella
    },
  ]

  console.log(`📋 Testando ${testProfiles.length} perfis do LinkedIn\n`)

  for (const profile of testProfiles) {
    console.log(`\n🔍 Testando: ${profile.name}`)
    console.log(`   URL: ${profile.url}`)

    try {
      const result = await brightDataContactScraper.scrapeLinkedInProfile(profile.url)

      if (result.email || result.phone) {
        console.log('   ✅ Dados encontrados:')
        console.log(`      📧 Email: ${result.email || 'N/A'}`)
        console.log(`      📞 Telefone: ${result.phone || 'N/A'}`)
      } else {
        console.log('   ⚠️  Nenhum dado público encontrado (perfil privado)')
      }
    } catch (error) {
      console.error(`   ❌ Erro:`, error)
    }

    // Delay entre requisições
    await sleep(3000)
  }

  console.log('\n\n✅ Teste completo!')
  console.log('\n💡 Notas:')
  console.log('   - Nem todos os perfis do LinkedIn têm informações públicas')
  console.log('   - Taxa de sucesso esperada: 40-60%')
  console.log('   - Configure BRIGHT_DATA_PUPPETEER_URL no .env para funcionar')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Executar teste
testLinkedInScraping()
  .then(() => {
    console.log('\n🎉 Teste finalizado com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no teste:', error)
    process.exit(1)
  })
