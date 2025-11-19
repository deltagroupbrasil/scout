/**
 * Simula o clique no botão "Buscar Novas Vagas"
 * Para usar: você precisa estar logado e copiar o cookie de sessão
 */

const PRODUCTION_URL = 'https://leapscout.vercel.app'

async function testScrapeButton() {
  console.log('🧪 Simulando clique no botão "Buscar Novas Vagas"\n')

  // Obter cookie da linha de comando
  const sessionToken = process.argv[2]

  if (!sessionToken) {
    console.error('❌ Uso: npx tsx scripts/test-scrape-button.ts <session-token>')
    console.error('\nPara pegar o session token:')
    console.error('1. Abra https://leapscout.vercel.app')
    console.error('2. Faça login')
    console.error('3. Abra DevTools (F12) > Application > Cookies')
    console.error('4. Copie o valor de "next-auth.session-token"')
    process.exit(1)
  }

  try {
    console.log('📡 Enviando POST para /api/scrape...\n')

    const response = await fetch(`${PRODUCTION_URL}/api/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `next-auth.session-token=${sessionToken}`
      },
      body: JSON.stringify({
        query: 'Controller OR CFO OR "Gerente Financeiro" OR "Diretor Financeiro" OR Controladoria São Paulo',
        maxCompanies: 20
      }),
    })

    console.log(`Status: ${response.status} ${response.statusText}\n`)

    const data = await response.json()
    console.log('📦 Resposta:')
    console.log(JSON.stringify(data, null, 2))

    if (response.status === 200) {
      console.log(`\n✅ Sucesso! ${data.count} leads processados`)
      console.log(`Total de vagas: ${data.totalJobs}`)
    } else if (response.status === 401) {
      console.log('\n❌ Não autorizado - verifique se o session token está correto')
    } else {
      console.log(`\n⚠️  Erro: ${data.error || 'Desconhecido'}`)
    }

  } catch (error) {
    console.error('\n❌ Erro na requisição:', error)
  }
}

testScrapeButton()
