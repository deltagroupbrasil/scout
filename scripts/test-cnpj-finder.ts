// Script para testar busca de CNPJ
import { cnpjFinder } from '../lib/services/cnpj-finder'

async function testCNPJFinder() {
  console.log('🔍 Testando CNPJ Finder Service...\n')

  // Empresas de teste (empresas reais brasileiras conhecidas)
  const testCompanies = [
    'Magazine Luiza',
    'Petrobras',
    'Banco do Brasil',
    'Vale S.A.',
    'Ambev',
    'Natura',
    'Michael Page', // Empresa fictícia dos mocks
  ]

  for (const companyName of testCompanies) {
    console.log(`\n📊 Buscando CNPJ para: "${companyName}"`)
    console.log('─'.repeat(50))

    try {
      const cnpj = await cnpjFinder.findCNPJByName(companyName)

      if (cnpj) {
        console.log(`✅ CNPJ encontrado: ${cnpj}`)

        // Tentar enriquecer com dados da Receita Federal
        const enrichmentData = await testEnrichment(cnpj)
        if (enrichmentData) {
          console.log(`📈 Razão Social: ${enrichmentData.razao_social}`)
          console.log(`🏢 Nome Fantasia: ${enrichmentData.nome_fantasia || 'N/A'}`)
          console.log(`💼 Porte: ${enrichmentData.porte}`)
          console.log(`💰 Capital Social: R$ ${enrichmentData.capital_social}`)
        }
      } else {
        console.log(`❌ CNPJ não encontrado`)
      }

      // Aguardar 2 segundos para respeitar rate limit (3 req/min)
      console.log('⏳ Aguardando 2s (rate limit)...')
      await sleep(2000)
    } catch (error) {
      console.error(`❌ Erro ao buscar CNPJ:`, error)
    }
  }

  console.log('\n✅ Teste concluído!')
}

async function testEnrichment(cnpj: string) {
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Erro ao enriquecer dados:', error)
    return null
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Executar teste
testCNPJFinder()
