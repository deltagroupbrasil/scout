/**
 * Testa o novo deploy em produção (com schema corrigido)
 */

const PRODUCTION_URL = 'https://leapscout.vercel.app'

async function testNewDeploy() {
  console.log('🧪 Testando Deploy com Schema Corrigido\n')
  console.log('⚠️  IMPORTANTE: Execute este teste DEPOIS de fazer login em produção\n')
  console.log('Para testar:')
  console.log('1. Abra https://leapscout.vercel.app no navegador')
  console.log('2. Faça login')
  console.log('3. Clique no botão "Buscar Leads"')
  console.log('4. Aguarde o processamento')
  console.log('5. Verifique se os leads aparecem no dashboard\n')

  console.log('Se você quiser testar via API (precisa de cookie de sessão):')
  console.log(`curl -X POST ${PRODUCTION_URL}/api/scrape \\`)
  console.log('  -H "Content-Type: application/json" \\')
  console.log('  -H "Cookie: next-auth.session-token=SEU_TOKEN_AQUI" \\')
  console.log('  -d \'{"query": "Controller OR CFO", "maxCompanies": 5}\'')
  console.log('\nPara pegar o token:')
  console.log('1. Abra DevTools (F12)')
  console.log('2. Application → Cookies → next-auth.session-token')
}

testNewDeploy()
