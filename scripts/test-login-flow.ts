/**
 * Script para testar o fluxo completo de login multi-tenant via HTTP
 *
 * Testa:
 * 1. Página de login acessível
 * 2. POST /api/auth/signin/credentials
 * 3. Session contém dados multi-tenant
 * 4. Dashboard protegido
 */

async function testLoginFlow() {
  console.log('🌐 Testando fluxo de login HTTP...\n')

  const baseUrl = 'http://localhost:3000'

  try {
    // 1. Verificar se servidor está rodando
    console.log('1️⃣  Verificando servidor...')
    const healthCheck = await fetch(baseUrl)

    if (!healthCheck.ok) {
      console.error('   ❌ Servidor não está respondendo')
      return
    }

    console.log(`   ✅ Servidor rodando: ${healthCheck.status}`)

    // 2. Acessar página de login
    console.log('\n2️⃣  Acessando página de login...')
    const loginPage = await fetch(`${baseUrl}/login`)

    if (!loginPage.ok) {
      console.error(`   ❌ Página de login retornou: ${loginPage.status}`)
      return
    }

    console.log(`   ✅ Página de login acessível: ${loginPage.status}`)

    // 3. Testar autenticação via credentials provider
    console.log('\n3️⃣  Testando autenticação...')
    console.log('   Credenciais: admin@leapsolutions.com.br / admin123')

    // NextAuth credentials provider usa callback URL
    const authResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: 'admin@leapsolutions.com.br',
        password: 'admin123',
        callbackUrl: `${baseUrl}/dashboard`,
        json: 'true',
      }),
      redirect: 'manual', // Não seguir redirects automaticamente
    })

    console.log(`   Status: ${authResponse.status}`)
    console.log(`   Headers:`, Object.fromEntries(authResponse.headers.entries()))

    // Extrair cookie de sessão se houver
    const setCookie = authResponse.headers.get('set-cookie')
    if (setCookie) {
      console.log(`   ✅ Cookie de sessão recebido`)

      // Verificar se contém next-auth.session-token
      if (setCookie.includes('next-auth.session-token')) {
        console.log('   ✅ Token de sessão NextAuth encontrado')
      }
    }

    // 4. Verificar session endpoint
    console.log('\n4️⃣  Verificando endpoint de sessão...')
    const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
      headers: setCookie ? { Cookie: setCookie } : {},
    })

    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json()
      console.log('   ✅ Dados da sessão:')
      console.log(JSON.stringify(sessionData, null, 2))

      // Validar estrutura multi-tenant
      if (sessionData.user?.activeTenantId) {
        console.log('   ✅ activeTenantId presente na sessão')
      } else {
        console.log('   ⚠️  activeTenantId NÃO encontrado na sessão')
      }

      if (sessionData.user?.tenants && Array.isArray(sessionData.user.tenants)) {
        console.log(`   ✅ Lista de tenants presente: ${sessionData.user.tenants.length} tenant(s)`)
      } else {
        console.log('   ⚠️  Lista de tenants NÃO encontrada na sessão')
      }

      if (typeof sessionData.user?.isSuperAdmin === 'boolean') {
        console.log(`   ✅ isSuperAdmin presente: ${sessionData.user.isSuperAdmin}`)
      } else {
        console.log('   ⚠️  isSuperAdmin NÃO encontrado na sessão')
      }
    } else {
      console.log(`   ⚠️  Sessão não disponível: ${sessionResponse.status}`)
      const errorText = await sessionResponse.text()
      console.log(`   Resposta: ${errorText}`)
    }

    // 5. Tentar acessar dashboard
    console.log('\n5️⃣  Testando acesso ao dashboard...')
    const dashboardResponse = await fetch(`${baseUrl}/dashboard`, {
      headers: setCookie ? { Cookie: setCookie } : {},
      redirect: 'manual',
    })

    console.log(`   Status: ${dashboardResponse.status}`)

    if (dashboardResponse.status === 200) {
      console.log('   ✅ Dashboard acessível')
    } else if (dashboardResponse.status === 307 || dashboardResponse.status === 302) {
      const location = dashboardResponse.headers.get('location')
      console.log(`   ⚠️  Redirect para: ${location}`)

      if (location?.includes('/login')) {
        console.log('   ❌ Usuário não está autenticado (redirecionado para login)')
      }
    } else {
      console.log(`   ⚠️  Status inesperado: ${dashboardResponse.status}`)
    }

    // 6. Testar API de leads com tenant context
    console.log('\n6️⃣  Testando API de leads (com tenant filtering)...')
    const leadsResponse = await fetch(`${baseUrl}/api/leads`, {
      headers: setCookie ? { Cookie: setCookie } : {},
    })

    if (leadsResponse.ok) {
      const leadsData = await leadsResponse.json()
      console.log(`   ✅ Leads retornados: ${leadsData.leads?.length || 0}`)

      if (leadsData.leads && leadsData.leads.length > 0) {
        const firstLead = leadsData.leads[0]
        console.log(`   Primeiro lead: ${firstLead.jobTitle} - ${firstLead.company?.name || 'N/A'}`)

        // Verificar se lead tem tenantId (não deve ser exposto na API)
        if (firstLead.tenantId) {
          console.log(`   ⚠️  ALERTA: tenantId exposto na API: ${firstLead.tenantId}`)
        } else {
          console.log('   ✅ tenantId não exposto na API (correto)')
        }
      }
    } else {
      console.log(`   ❌ Erro ao buscar leads: ${leadsResponse.status}`)
    }

    console.log('\n✅ Teste de fluxo de login concluído!')

  } catch (error) {
    console.error('\n❌ Erro durante teste:', error)
    throw error
  }
}

// Executar teste
testLoginFlow()
  .then(() => {
    console.log('\n🎉 Script finalizado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script falhou:', error)
    process.exit(1)
  })
