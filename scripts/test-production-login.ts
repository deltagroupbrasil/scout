/**
 * Test Production Login
 *
 * Testa se o login está funcionando na produção
 */

async function testProductionLogin() {
  console.log('🧪 Testando Login em Produção')
  console.log('==============================\n')

  const loginUrl = 'https://leapscout.vercel.app/api/auth/callback/credentials'
  const credentials = {
    email: 'admin@leapscout.com',
    password: 'LeapScout2025!',
    redirect: 'false',
    json: 'true'
  }

  try {
    console.log('📤 Enviando credenciais...')
    console.log(`   Email: ${credentials.email}`)
    console.log(`   Senha: ${credentials.password}\n`)

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(credentials).toString(),
      redirect: 'manual'
    })

    console.log(`📊 Status: ${response.status} ${response.statusText}`)
    console.log(`🔗 Headers:`)
    response.headers.forEach((value, key) => {
      if (key.toLowerCase().includes('location') || key.toLowerCase().includes('set-cookie')) {
        console.log(`   ${key}: ${value}`)
      }
    })

    if (response.status === 302 || response.status === 200) {
      const location = response.headers.get('location')
      const cookies = response.headers.get('set-cookie')

      if (cookies && cookies.includes('next-auth.session-token')) {
        console.log('\n✅ LOGIN FUNCIONOU!')
        console.log('   Session token encontrado nos cookies')
        console.log('\n🎉 Produção está pronta para uso!')
        console.log('\n📱 Acesse: https://leapscout.vercel.app/login')
        console.log('   Email: admin@leapscout.com')
        console.log('   Senha: LeapScout2025!\n')
        return true
      } else if (location) {
        console.log(`\n↪️  Redirecionado para: ${location}`)
        if (location.includes('error')) {
          console.log('❌ Login falhou - há um erro na URL de redirecionamento')
          return false
        }
      }
    } else {
      console.log('\n❌ Login falhou')
      const text = await response.text()
      console.log(`Resposta: ${text.substring(0, 200)}...\n`)
      return false
    }

  } catch (error) {
    console.error('\n❌ Erro ao testar login:', error)
    return false
  }
}

testProductionLogin()
