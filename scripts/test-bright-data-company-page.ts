// Teste de Scraping de Páginas de Contato via Bright Data Web Unlocker
import { brightDataContactScraper } from '../lib/services/bright-data-contact-scraper'

async function testCompanyPageScraping() {
  console.log('🧪 Testando Scraping de Páginas de Contato via Bright Data\n')

  // Empresas brasileiras para teste
  const testCompanies = [
    {
      name: 'Ambev',
      domain: 'ambev.com.br',
    },
    {
      name: 'Magazine Luiza',
      domain: 'magazineluiza.com.br',
    },
    {
      name: 'Petrobras',
      domain: 'petrobras.com.br',
    },
    {
      name: 'Vale',
      domain: 'vale.com',
    },
  ]

  console.log(`📋 Testando ${testCompanies.length} páginas de empresas\n`)

  for (const company of testCompanies) {
    console.log(`\n🔍 Testando: ${company.name}`)
    console.log(`   Domínio: ${company.domain}`)

    try {
      const result = await brightDataContactScraper.scrapeCompanyContactPage(
        company.name,
        company.domain
      )

      if (result.emails.length > 0 || result.phones.length > 0) {
        console.log('   ✅ Dados encontrados:')

        if (result.emails.length > 0) {
          console.log(`   📧 Emails (${result.emails.length}):`)
          result.emails.slice(0, 3).forEach((email) => {
            console.log(`      - ${email}`)
          })
          if (result.emails.length > 3) {
            console.log(`      ... e mais ${result.emails.length - 3}`)
          }
        }

        if (result.phones.length > 0) {
          console.log(`   📞 Telefones (${result.phones.length}):`)
          result.phones.slice(0, 3).forEach((phone) => {
            console.log(`      - ${phone}`)
          })
          if (result.phones.length > 3) {
            console.log(`      ... e mais ${result.phones.length - 3}`)
          }
        }
      } else {
        console.log('   ⚠️  Nenhum dado encontrado na página de contato')
      }
    } catch (error) {
      console.error(`   ❌ Erro:`, error)
    }

    // Delay entre requisições
    await sleep(3000)
  }

  console.log('\n\n✅ Teste completo!')
  console.log('\n💡 Notas:')
  console.log('   - Algumas empresas podem ter páginas de contato protegidas')
  console.log('   - Taxa de sucesso esperada: 70-90%')
  console.log('   - Web Unlocker faz bypass automático de CAPTCHAs')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Executar teste
testCompanyPageScraping()
  .then(() => {
    console.log('\n🎉 Teste finalizado com sucesso!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no teste:', error)
    process.exit(1)
  })
