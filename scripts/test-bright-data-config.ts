// Script para testar configuração do Bright Data
// Testa Web Unlocker e SERP API

import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env') })

async function testBrightDataConfig() {
  console.log('\n🔍 Testando Configuração Bright Data\n')
  console.log('='.repeat(70))

  // 1. Verificar variáveis de ambiente
  console.log('\n📋 Variáveis de Ambiente:')
  console.log('   BRIGHT_DATA_WEB_UNLOCKER_URL:', process.env.BRIGHT_DATA_WEB_UNLOCKER_URL ? '✅ Configurada' : '❌ Não configurada')
  console.log('   BRIGHT_DATA_UNLOCKER_KEY:', process.env.BRIGHT_DATA_UNLOCKER_KEY ? '✅ Configurada' : '❌ Não configurada')
  console.log('   BRIGHT_DATA_SERP_API_URL:', process.env.BRIGHT_DATA_SERP_API_URL ? '✅ Configurada' : '❌ Não configurada')
  console.log('   BRIGHT_DATA_SERP_KEY:', process.env.BRIGHT_DATA_SERP_KEY ? '✅ Configurada' : '❌ Não configurada')

  const webUnlockerUrl = process.env.BRIGHT_DATA_WEB_UNLOCKER_URL
  const apiKey = process.env.BRIGHT_DATA_UNLOCKER_KEY || process.env.BRIGHT_DATA_SERP_KEY

  if (!webUnlockerUrl || !apiKey) {
    console.error('\n❌ Configuração incompleta! Verifique o .env')
    process.exit(1)
  }

  console.log('\n' + '='.repeat(70))

  // 2. Testar Web Unlocker com uma página simples
  console.log('\n🧪 Teste 1: Web Unlocker (Google Search)')
  console.log('   URL: https://www.google.com/search?q=test')

  try {
    const testUrl = 'https://www.google.com/search?q=test'

    const response = await fetch(webUnlockerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        zone: 'web_unlocker1',
        url: testUrl,
        format: 'raw'
      })
    })

    console.log(`   Status: ${response.status}`)

    if (response.ok) {
      const html = await response.text()
      console.log(`   ✅ Sucesso! HTML recebido (${html.length} caracteres)`)
      console.log(`   Preview: ${html.substring(0, 100)}...`)
    } else {
      const errorText = await response.text()
      console.error(`   ❌ Erro: ${response.status}`)
      console.error(`   Resposta: ${errorText.substring(0, 200)}`)
    }
  } catch (error) {
    console.error(`   ❌ Erro na requisição:`, error)
  }

  console.log('\n' + '='.repeat(70))

  // 3. Testar Web Unlocker com site corporativo
  console.log('\n🧪 Teste 2: Web Unlocker (Site Corporativo)')
  console.log('   URL: https://www.nubank.com.br/sobre-nos/')

  try {
    const response = await fetch(webUnlockerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        zone: 'web_unlocker1',
        url: 'https://www.nubank.com.br/sobre-nos/',
        format: 'raw'
      })
    })

    console.log(`   Status: ${response.status}`)

    if (response.ok) {
      const html = await response.text()
      console.log(`   ✅ Sucesso! HTML recebido (${html.length} caracteres)`)

      // Verificar se tem conteúdo útil
      if (html.includes('Nubank') || html.includes('sobre')) {
        console.log(`   ✅ Conteúdo válido detectado`)
      } else {
        console.log(`   ⚠️  Conteúdo pode estar bloqueado ou vazio`)
      }
    } else {
      const errorText = await response.text()
      console.error(`   ❌ Erro: ${response.status}`)
      console.error(`   Resposta: ${errorText.substring(0, 200)}`)
    }
  } catch (error) {
    console.error(`   ❌ Erro na requisição:`, error)
  }

  console.log('\n' + '='.repeat(70))

  // 4. Resumo
  console.log('\n📊 Resumo da Configuração:')
  console.log('\nPara usar o Bright Data Web Unlocker:')
  console.log('1. ✅ Variáveis configuradas no .env')
  console.log('2. ✅ URL: https://api.brightdata.com/request')
  console.log('3. ✅ API Key configurada')
  console.log('4. 🔄 Zone: web_unlocker1')
  console.log('\nSe os testes falharam com 401/403:')
  console.log('- Verifique se a API Key está correta')
  console.log('- Confirme que a zona "web_unlocker1" existe na sua conta Bright Data')
  console.log('- Acesse: https://brightdata.com/cp/zones para verificar suas zonas')

  console.log('\n✅ Teste concluído!\n')
}

testBrightDataConfig().catch(console.error)
