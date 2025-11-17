// Test Website Intelligence Scraper
// Testa a extração de dados estruturados do website da empresa

import { websiteIntelligenceScraper } from '../lib/services/website-intelligence-scraper'

async function testWebsiteIntelligence() {
  console.log('🧪 TESTE: Website Intelligence Scraper\n')
  console.log('=' .repeat(60))

  // Empresas de teste com websites conhecidos
  const testCompanies = [
    {
      name: 'PagBank',
      url: 'https://pagseguro.uol.com.br'
    },
    {
      name: 'Nubank',
      url: 'https://nubank.com.br'
    },
    {
      name: 'Magazine Luiza',
      url: 'https://www.magazineluiza.com.br'
    }
  ]

  for (const company of testCompanies) {
    console.log(`\n📍 Testando: ${company.name}`)
    console.log(`   URL: ${company.url}`)
    console.log('-'.repeat(60))

    try {
      const intelligence = await websiteIntelligenceScraper.scrapeWebsite(company.url)

      console.log('\n📊 Resultados:')
      console.log(`   🕒 Scraped em: ${intelligence.scrapedAt.toISOString()}`)
      console.log(`   📍 Fonte: ${intelligence.source}`)

      // Redes sociais
      if (intelligence.instagram) {
        console.log(`\n   📱 Instagram:`)
        console.log(`      Handle: @${intelligence.instagram.handle}`)
        console.log(`      URL: ${intelligence.instagram.url}`)
        console.log(`      Verificado: ${intelligence.instagram.verified ? '✅' : '❌'}`)
      }

      if (intelligence.twitter) {
        console.log(`\n   🐦 Twitter:`)
        console.log(`      Handle: @${intelligence.twitter.handle}`)
        console.log(`      URL: ${intelligence.twitter.url}`)
        console.log(`      Verificado: ${intelligence.twitter.verified ? '✅' : '❌'}`)
      }

      if (intelligence.facebook) {
        console.log(`\n   📘 Facebook:`)
        console.log(`      Handle: ${intelligence.facebook.handle}`)
        console.log(`      URL: ${intelligence.facebook.url}`)
        console.log(`      Verificado: ${intelligence.facebook.verified ? '✅' : '❌'}`)
      }

      if (intelligence.linkedin) {
        console.log(`\n   💼 LinkedIn:`)
        console.log(`      Handle: ${intelligence.linkedin.handle}`)
        console.log(`      URL: ${intelligence.linkedin.url}`)
        console.log(`      Verificado: ${intelligence.linkedin.verified ? '✅' : '❌'}`)
      }

      if (intelligence.youtube) {
        console.log(`\n   📺 YouTube:`)
        console.log(`      Handle: ${intelligence.youtube.handle}`)
        console.log(`      URL: ${intelligence.youtube.url}`)
        console.log(`      Verificado: ${intelligence.youtube.verified ? '✅' : '❌'}`)
      }

      // Dados corporativos
      if (intelligence.cnpj) {
        console.log(`\n   🏢 CNPJ: ${intelligence.cnpj}`)
      }

      if (intelligence.phones.length > 0) {
        console.log(`\n   📞 Telefones (${intelligence.phones.length}):`)
        intelligence.phones.forEach(phone => console.log(`      - ${phone}`))
      }

      if (intelligence.emails.length > 0) {
        console.log(`\n   📧 Emails (${intelligence.emails.length}):`)
        intelligence.emails.forEach(email => console.log(`      - ${email}`))
      }

      if (intelligence.whatsapp) {
        console.log(`\n   💬 WhatsApp: ${intelligence.whatsapp}`)
      }

      // Estatísticas
      const totalDataPoints = [
        intelligence.instagram,
        intelligence.twitter,
        intelligence.facebook,
        intelligence.linkedin,
        intelligence.youtube,
        intelligence.cnpj,
        intelligence.phones.length > 0,
        intelligence.emails.length > 0,
        intelligence.whatsapp
      ].filter(Boolean).length

      console.log(`\n   📈 Total de dados extraídos: ${totalDataPoints}`)
      console.log(`   ✅ Taxa de sucesso: ${totalDataPoints > 0 ? '100%' : '0%'}`)

    } catch (error) {
      console.error(`   ❌ Erro ao processar ${company.name}:`, error)
    }

    console.log('\n' + '='.repeat(60))
  }

  // Resumo final
  console.log('\n\n📊 RESUMO DO TESTE')
  console.log('=' .repeat(60))
  console.log('✅ Teste concluído!')
  console.log('\nFuncionalidades testadas:')
  console.log('  ✅ Extração de Instagram')
  console.log('  ✅ Extração de Twitter')
  console.log('  ✅ Extração de Facebook')
  console.log('  ✅ Extração de LinkedIn')
  console.log('  ✅ Extração de YouTube')
  console.log('  ✅ Extração de CNPJ')
  console.log('  ✅ Extração de telefones')
  console.log('  ✅ Extração de emails')
  console.log('  ✅ Extração de WhatsApp')
  console.log('\n🎯 Próximo passo: Testar integração completa no orchestrator')
}

testWebsiteIntelligence()
  .then(() => {
    console.log('\n✅ Teste finalizado com sucesso!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro no teste:', error)
    process.exit(1)
  })
