// Teste de unlock de email na Apollo API
import 'dotenv/config'

async function testApolloUnlock() {
  const API_KEY = process.env.APOLLO_API_KEY

  if (!API_KEY) {
    console.error('❌ APOLLO_API_KEY não configurada')
    return
  }

  console.log('🧪 Teste de Unlock Apollo API\n')
  console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`)
  console.log()

  // Primeiro, buscar CFO do PagBank
  console.log('📍 Passo 1: Buscar CFO do PagBank')
  console.log('='.repeat(60))

  try {
    const searchResponse = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        q_organization_name: 'PagBank',
        person_titles: ['CFO', 'Chief Financial Officer'],
        page: 1,
        per_page: 1,
      }),
    })

    console.log(`Status: ${searchResponse.status}`)

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error('❌ Erro:', errorText)
      return
    }

    const searchData = await searchResponse.json()

    if (!searchData.people || searchData.people.length === 0) {
      console.log('⚠️ Nenhum CFO encontrado')
      return
    }

    const cfo = searchData.people[0]

    console.log('\n✅ CFO Encontrado:')
    console.log(`   Nome: ${cfo.name}`)
    console.log(`   Cargo: ${cfo.title}`)
    console.log(`   LinkedIn: ${cfo.linkedin_url || 'N/A'}`)
    console.log(`   Email Status: ${cfo.email_status}`)
    console.log(`   Email: ${cfo.email}`)
    console.log(`   Person ID: ${cfo.id}`)

    // Passo 2: Tentar fazer unlock (sem reveal_phone_number que requer webhook)
    console.log('\n📍 Passo 2: Fazer UNLOCK do email')
    console.log('='.repeat(60))

    const unlockResponse = await fetch(`https://api.apollo.io/v1/people/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        id: cfo.id,
        reveal_personal_emails: true,
      }),
    })

    console.log(`Status: ${unlockResponse.status}`)

    const unlockData = await unlockResponse.json()

    console.log('\n📦 Resposta de unlock:')
    console.log(JSON.stringify(unlockData, null, 2))

    if (unlockData.person && unlockData.person.email) {
      console.log('\n🎉 EMAIL REVELADO!')
      console.log(`   📧 Email: ${unlockData.person.email}`)
      console.log(`   📱 Telefone: ${unlockData.person.phone_numbers?.[0]?.raw_number || 'N/A'}`)
    } else {
      console.log('\n⚠️ Email não foi revelado (pode precisar de créditos)')
    }

    // Passo 3: Verificar créditos restantes
    console.log('\n📍 Passo 3: Verificar créditos restantes')
    console.log('='.repeat(60))

    const creditsResponse = await fetch('https://api.apollo.io/v1/email_accounts', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY,
      },
    })

    console.log(`Status: ${creditsResponse.status}`)

    if (creditsResponse.ok) {
      const creditsData = await creditsResponse.json()
      console.log('\n💳 Informações da conta:')
      console.log(JSON.stringify(creditsData, null, 2))
    }
  } catch (error) {
    console.error('❌ Erro:', error)
  }

  console.log('\n' + '='.repeat(60))
  console.log('📝 RESUMO')
  console.log('='.repeat(60))
  console.log('\n✅ Apollo API está funcional')
  console.log('⚠️  Emails precisam de "unlock" (gastar créditos)')
  console.log('\n💡 Planos Apollo:')
  console.log('   - Free: 50 email unlocks/mês')
  console.log('   - Basic ($49/mês): 1.000 unlocks')
  console.log('   - Professional ($99/mês): 2.500 unlocks')
  console.log('\n📊 Sistema atual usa Apollo como 4ª estratégia')
  console.log('   1. Google People Finder (grátis)')
  console.log('   2. Website Scraping (grátis)')
  console.log('   3. Hunter.io (50 buscas/mês grátis)')
  console.log('   4. Apollo.io (50 unlocks/mês grátis)')
}

testApolloUnlock()
  .then(() => {
    console.log('\n✅ Teste finalizado!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
