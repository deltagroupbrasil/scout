/**
 * Script para parsear o token retornado pela API Nova Vida TI
 */

interface ParsedToken {
  email: string
  hash: string
  companyName: string
  companyId: string
  flags: string[]
  cnpjPartial: string
  code: string
  timestamp: string
  ip: string
  status: string
}

function parseToken(base64Token: string): ParsedToken | null {
  try {
    const decoded = Buffer.from(base64Token, 'base64').toString('utf-8')
    const parts = decoded.split('|')

    if (parts.length < 10) {
      console.error('❌ Token inválido: menos de 10 campos')
      return null
    }

    const flags = parts[4]
      .split(';')
      .filter(f => f.trim().length > 0)

    return {
      email: parts[0],
      hash: parts[1],
      companyName: parts[2],
      companyId: parts[3],
      flags,
      cnpjPartial: parts[5],
      code: parts[6],
      timestamp: parts[7],
      ip: parts[8],
      status: parts[9]
    }
  } catch (error) {
    console.error('❌ Erro ao parsear token:', error)
    return null
  }
}

async function testTokenUsage() {
  console.log('='.repeat(60))
  console.log('🔍 TESTE DE TOKEN NOVA VIDA TI')
  console.log('='.repeat(60))

  // 1. Gerar token
  const baseUrl = 'https://wsnv.novavidati.com.br/wslocalizador.asmx'
  const usuario = process.env.NOVA_VIDA_TI_USUARIO || 'regis@delta-mining.com'
  const senha = process.env.NOVA_VIDA_TI_SENHA || 'F2/!!iY%,w'
  const cliente = process.env.NOVA_VIDA_TI_CLIENTE || 'DELTACOMPUTACAO'

  console.log('\n🔑 Gerando token...')

  const response = await fetch(`${baseUrl}/GerarTokenJson`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      credencial: {
        usuario,
        senha,
        cliente
      }
    })
  })

  const result = await response.json()
  const token = result.d

  console.log(`✅ Token gerado: ${token.substring(0, 50)}...`)

  // 2. Parsear token
  console.log('\n📋 Parseando token...')
  const parsed = parseToken(token)

  if (!parsed) {
    console.error('❌ Falha ao parsear token')
    return
  }

  console.log('\n✅ Token parseado:')
  console.log(`   Email: ${parsed.email}`)
  console.log(`   Empresa: ${parsed.companyName}`)
  console.log(`   CNPJ (parcial): ${parsed.cnpjPartial}`)
  console.log(`   ID Empresa: ${parsed.companyId}`)
  console.log(`   Status: ${parsed.status}`)
  console.log(`   Flags: ${parsed.flags.join(', ')}`)

  // 3. Testar consulta com token
  console.log('\n' + '─'.repeat(60))
  console.log('🔍 Testando consulta com CNPJ usando token')
  console.log('─'.repeat(60))

  const cnpjTest = '08561701000101' // PagBank

  console.log(`\nConsultando CNPJ: ${cnpjTest}`)

  try {
    const queryResponse = await fetch(`${baseUrl}/NVCHECKJson`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Token': token
      },
      body: JSON.stringify({
        nvcheck: {
          Documento: cnpjTest
        }
      })
    })

    const queryText = await queryResponse.text()
    console.log(`Status: ${queryResponse.status}`)
    console.log(`Resposta (primeiros 500 chars):`)
    console.log(queryText.substring(0, 500))

    if (queryText.includes('ERRO')) {
      console.log('\n❌ Erro na consulta')
    } else if (queryText.includes('CONSULTA')) {
      console.log('\n✅ Consulta bem-sucedida!')

      // Tentar parsear JSON
      try {
        const jsonResult = JSON.parse(queryText)
        console.log('\n📊 Estrutura da resposta:')
        console.log(JSON.stringify(jsonResult, null, 2).substring(0, 1000))
      } catch (e) {
        console.log('⚠️  Resposta não é JSON válido')
      }
    }
  } catch (error: any) {
    console.error('❌ Erro na consulta:', error.message)
  }

  console.log('\n' + '='.repeat(60))
}

testTokenUsage()
  .then(() => {
    console.log('\n✅ Teste concluído')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
