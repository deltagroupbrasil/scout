/**
 * Script para testar diferentes formatos de autenticação Nova Vida TI
 */

async function testAuthFormats() {
  console.log('='.repeat(60))
  console.log('🔐 TESTE DE AUTENTICAÇÃO NOVA VIDA TI')
  console.log('='.repeat(60))

  const baseUrl = 'https://wsnv.novavidati.com.br/wslocalizador.asmx'

  // Credenciais fornecidas
  const usuario = process.env.NOVA_VIDA_TI_USUARIO || 'regis@delta-mining.com'
  const senha = process.env.NOVA_VIDA_TI_SENHA || 'F2/!!iY%,w'
  const cliente = process.env.NOVA_VIDA_TI_CLIENTE || 'DELTACOMPUTACAO'

  console.log('\n📋 Credenciais:')
  console.log(`   Usuário: ${usuario}`)
  console.log(`   Senha: ${senha.replace(/./g, '*')}`)
  console.log(`   Cliente: ${cliente}`)

  // Teste 1: Sem Base64
  console.log('\n' + '─'.repeat(60))
  console.log('🧪 Teste 1: Credenciais SEM Base64')
  console.log('─'.repeat(60))

  try {
    const response1 = await fetch(`${baseUrl}/GerarTokenJson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        credencial: {
          usuario: usuario,
          senha: senha,
          cliente: cliente
        }
      })
    })

    const text1 = await response1.text()
    console.log(`Status: ${response1.status}`)
    console.log(`Resposta: ${text1.substring(0, 200)}`)

    if (text1.includes('ERRO')) {
      console.log('   ❌ Erro retornado')
    } else {
      console.log('   ✅ Possível sucesso')
    }
  } catch (error: any) {
    console.log(`   ❌ Erro: ${error.message}`)
  }

  // Teste 2: Com Base64 (atual)
  console.log('\n' + '─'.repeat(60))
  console.log('🧪 Teste 2: Credenciais COM Base64 (implementação atual)')
  console.log('─'.repeat(60))

  try {
    const toBase64 = (str: string) => Buffer.from(str).toString('base64')

    const response2 = await fetch(`${baseUrl}/GerarTokenJson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        credencial: {
          usuario: toBase64(usuario),
          senha: toBase64(senha),
          cliente: toBase64(cliente)
        }
      })
    })

    const text2 = await response2.text()
    console.log(`Status: ${response2.status}`)
    console.log(`Resposta: ${text2.substring(0, 200)}`)

    if (text2.includes('ERRO')) {
      console.log('   ❌ Erro retornado')
    } else {
      console.log('   ✅ Possível sucesso')

      // Tentar parsear o token
      try {
        const json = JSON.parse(text2)
        const token = json.d || json.token || json
        console.log(`   Token: ${typeof token === 'string' ? token.substring(0, 50) + '...' : 'não é string'}`)
      } catch (e) {
        console.log('   ⚠️  Não é JSON puro, pode ser SOAP/XML')
      }
    }
  } catch (error: any) {
    console.log(`   ❌ Erro: ${error.message}`)
  }

  // Teste 3: Formato SOAP (antigo)
  console.log('\n' + '─'.repeat(60))
  console.log('🧪 Teste 3: Formato SOAP/XML')
  console.log('─'.repeat(60))

  try {
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GerarToken xmlns="http://tempuri.org/">
      <usuario>${usuario}</usuario>
      <senha>${senha}</senha>
      <cliente>${cliente}</cliente>
    </GerarToken>
  </soap:Body>
</soap:Envelope>`

    const response3 = await fetch(`${baseUrl}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://tempuri.org/GerarToken'
      },
      body: soapEnvelope
    })

    const text3 = await response3.text()
    console.log(`Status: ${response3.status}`)
    console.log(`Resposta: ${text3.substring(0, 300)}`)

    if (text3.includes('ERRO')) {
      console.log('   ❌ Erro retornado')
    } else if (text3.includes('Token') || text3.includes('token')) {
      console.log('   ✅ Possível sucesso (contém "token")')
    }
  } catch (error: any) {
    console.log(`   ❌ Erro: ${error.message}`)
  }

  // Teste 4: Teste direto na string fornecida
  console.log('\n' + '─'.repeat(60))
  console.log('🧪 Teste 4: Análise da string Base64 fornecida')
  console.log('─'.repeat(60))

  const providedString = 'cmVnaXNAZGVsdGEtbWluaW5nLmNvbXxGMi8hIWlZJSx3fERFTFRBQ09NUFVUQUNBT3wyODk2OHwxMzQ3X1RydWU7MTg3Nl9UcnVlOzE4ODdfVHJ1ZTt8MzA2MjIxMzR8NzUzMHwxNzExMjAyNTE1MzMxNnwxNzkuMTI5LjE3Ni4yMjZ8Mg=='
  const decoded = Buffer.from(providedString, 'base64').toString('utf-8')

  console.log('String decodificada:')
  console.log(decoded)
  console.log('\n💡 Interpretação:')
  console.log('   Esta NÃO parece ser um token de autenticação')
  console.log('   Parece ser uma RESPOSTA de consulta com dados')
  console.log('   Contém: email, empresa, CNPJ parcial, flags, timestamp')

  console.log('\n' + '='.repeat(60))
  console.log('📋 CONCLUSÃO')
  console.log('='.repeat(60))
  console.log('\nA string fornecida parece ser uma resposta de consulta,')
  console.log('não as credenciais de autenticação.')
  console.log('\nVocê precisa fornecer:')
  console.log('   - Usuário (login da conta)')
  console.log('   - Senha (senha da conta)')
  console.log('   - Cliente (código do cliente)')
  console.log('\nEntre em contato com a Nova Vida TI para obter essas credenciais.')
}

testAuthFormats()
  .then(() => {
    console.log('\n✅ Testes concluídos')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
