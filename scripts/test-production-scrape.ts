/**
 * Testa o endpoint de scraping em produção
 * Simula exatamente o que o botão faz
 */

const PRODUCTION_URL = 'https://leapscout.vercel.app'

async function testProductionScrape() {
  console.log('🧪 Testando Scraping em Produção\n')
  console.log('URL:', PRODUCTION_URL)
  console.log('\n⚠️  IMPORTANTE: Este teste vai chamar a API SEM autenticação')
  console.log('Deve retornar 401 Unauthorized se o endpoint estiver protegido\n')

  try {
    console.log('📡 Fazendo POST para /api/scrape...\n')

    const response = await fetch(`${PRODUCTION_URL}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'Controller OR CFO OR Controladoria São Paulo',
        maxCompanies: 5 // Apenas 5 para teste rápido
      }),
    })

    console.log(`Status: ${response.status} ${response.statusText}\n`)

    const contentType = response.headers.get('content-type')
    console.log('Content-Type:', contentType)

    if (contentType?.includes('application/json')) {
      const data = await response.json()
      console.log('\n📦 Response JSON:')
      console.log(JSON.stringify(data, null, 2))

      if (response.status === 200 && data.count !== undefined) {
        console.log(`\n✅ Scraping retornou: ${data.count} leads`)
        console.log(`Total de vagas processadas: ${data.totalJobs}`)

        if (data.count === 0) {
          console.log('\n⚠️  PROBLEMA: 0 leads criados!')
          console.log('Possíveis causas:')
          console.log('1. Scraper não encontrou vagas')
          console.log('2. Erro ao processar vagas')
          console.log('3. Erro ao salvar no banco')

          if (data.errors && data.errors.length > 0) {
            console.log('\n❌ Erros reportados:')
            data.errors.forEach((err: string, i: number) => {
              console.log(`${i + 1}. ${err}`)
            })
          }
        }
      } else if (response.status === 401) {
        console.log('\n✅ Endpoint protegido corretamente (401 Unauthorized)')
      }
    } else {
      const text = await response.text()
      console.log('\n📄 Response (text):')
      console.log(text.substring(0, 500))
    }

  } catch (error) {
    console.error('\n❌ Erro na requisição:', error)
  }
}

testProductionScrape()
