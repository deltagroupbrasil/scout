/**
 * Análise da resposta NovaVida TI (formato alternativo)
 *
 * Baseado na string fornecida:
 * cmVnaXNAZGVsdGEtbWluaW5nLmNvbXxGMi8hIWlZJSx3fERFTFRBQ09NUFVUQUNBT3wyODk2OHwxMzQ3X1RydWU7MTg3Nl9UcnVlOzE4ODdfVHJ1ZTt8MzA2MjIxMzR8NzUzMHwxNzExMjAyNTE1MzMxNnwxNzkuMTI5LjE3Ni4yMjZ8Mg==
 *
 * Decodificada:
 * regis@delta-mining.com|F2/!!iY%,w|DELTACOMPUTACAO|28968|1347_True;1876_True;1887_True;|30622134|7530|17112025153316|179.129.176.226|2
 */

interface NovaVidaAlternativeResponse {
  email: string
  hash: string
  companyName: string
  companyId: string
  flags: string[]
  cnpjPartial: string  // 8 dígitos
  code: string
  timestamp: string
  ip: string
  status: string
}

function parseNovaVidaAlternativeResponse(base64String: string): NovaVidaAlternativeResponse | null {
  try {
    // Decodificar Base64
    const decoded = Buffer.from(base64String, 'base64').toString('utf-8')
    console.log('📋 String decodificada:')
    console.log(decoded)
    console.log('')

    // Split por pipe
    const parts = decoded.split('|')

    if (parts.length < 10) {
      console.error('❌ Formato inválido: menos de 10 campos')
      return null
    }

    // Parse dos flags
    const flags = parts[4]
      .split(';')
      .filter(f => f.trim().length > 0)
      .map(f => f.trim())

    const response: NovaVidaAlternativeResponse = {
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

    return response
  } catch (error) {
    console.error('❌ Erro ao parsear:', error)
    return null
  }
}

function formatTimestamp(timestamp: string): string {
  // Formato: 17112025153316 = 17/11/2025 15:33:16
  if (timestamp.length !== 14) return timestamp

  const day = timestamp.slice(0, 2)
  const month = timestamp.slice(2, 4)
  const year = timestamp.slice(4, 8)
  const hour = timestamp.slice(8, 10)
  const minute = timestamp.slice(10, 12)
  const second = timestamp.slice(12, 14)

  return `${day}/${month}/${year} ${hour}:${minute}:${second}`
}

function analyzeResponse(response: NovaVidaAlternativeResponse) {
  console.log('='.repeat(60))
  console.log('📊 ANÁLISE DA RESPOSTA')
  console.log('='.repeat(60))

  console.log('\n📧 Contato:')
  console.log(`   Email: ${response.email}`)

  console.log('\n🏢 Empresa:')
  console.log(`   Nome: ${response.companyName}`)
  console.log(`   ID: ${response.companyId}`)
  console.log(`   CNPJ (8 dígitos): ${response.cnpjPartial}`)
  console.log(`   CNPJ completo estimado: ${response.cnpjPartial}000191`) // Filial principal

  console.log('\n🚩 Flags:')
  response.flags.forEach((flag, idx) => {
    console.log(`   ${idx + 1}. ${flag}`)
  })

  console.log('\n📅 Metadados:')
  console.log(`   Timestamp: ${formatTimestamp(response.timestamp)}`)
  console.log(`   IP: ${response.ip}`)
  console.log(`   Status: ${response.status}`)
  console.log(`   Código: ${response.code}`)

  console.log('\n' + '='.repeat(60))
  console.log('💡 INTERPRETAÇÃO')
  console.log('='.repeat(60))

  console.log('\n🔍 Possível endpoint: GerarToken ou método simplificado')
  console.log('   Esta resposta parece ser de um método de autenticação')
  console.log('   ou consulta simplificada, não do NVCHECKJson completo.')

  console.log('\n📋 Campos identificados:')
  console.log('   - Email do decisor: regis@delta-mining.com')
  console.log('   - Hash/senha: (não usar, apenas para validação interna)')
  console.log('   - CNPJ parcial: pode ser usado para consulta completa')
  console.log('   - Flags: possivelmente permissões ou tipos de dados disponíveis')

  console.log('\n💡 Próximos passos:')
  console.log('   1. Usar o CNPJ completo (30622134000191) no NVCHECKJson')
  console.log('   2. Obter dados completos da empresa (razão social, telefones, etc)')
  console.log('   3. Consultar CPF dos sócios para mais contatos')

  console.log('\n' + '='.repeat(60))
}

async function main() {
  console.log('='.repeat(60))
  console.log('🔍 ANÁLISE DE RESPOSTA NOVA VIDA TI')
  console.log('='.repeat(60))
  console.log('')

  // String fornecida
  const base64Response = 'cmVnaXNAZGVsdGEtbWluaW5nLmNvbXxGMi8hIWlZJSx3fERFTFRBQ09NUFVUQUNBT3wyODk2OHwxMzQ3X1RydWU7MTg3Nl9UcnVlOzE4ODdfVHJ1ZTt8MzA2MjIxMzR8NzUzMHwxNzExMjAyNTE1MzMxNnwxNzkuMTI5LjE3Ni4yMjZ8Mg=='

  const response = parseNovaVidaAlternativeResponse(base64Response)

  if (!response) {
    console.error('❌ Falha ao parsear resposta')
    process.exit(1)
  }

  analyzeResponse(response)

  console.log('\n✅ Análise concluída')
  console.log('\n💡 Execute o script de teste para validar a integração:')
  console.log('   npx tsx scripts/test-novavidati-real.ts')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Erro:', error)
    process.exit(1)
  })
