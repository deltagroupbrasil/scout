/**
 * Script para testar todas as APIs do Bright Data
 *
 * Testa:
 * 1. SERP API - Busca no Google
 * 2. Web Unlocker - Scraping com bypass anti-bot
 * 3. Puppeteer/Web Navigator - Navegação real com browser
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(__dirname, '..', '.env') })

import { serpApi } from '../lib/services/serp-api'
import { webUnlocker } from '../lib/services/web-unlocker'
import { linkedInScraper } from '../lib/services/linkedin-scraper'

async function testSerpApi() {
  console.log('\n========================================')
  console.log('🔍 TESTE 1: SERP API (Busca no Google)')
  console.log('========================================\n')

  const apiKey = process.env.BRIGHT_DATA_SERP_KEY
  console.log('API Key configurada:', apiKey ? `${apiKey.substring(0, 15)}...` : '❌ NÃO CONFIGURADA')

  if (!apiKey) {
    console.log('❌ SERP API: FALHOU - Chave não configurada')
    return { success: false, error: 'API Key não configurada' }
  }

  try {
    console.log('\n📋 Testando busca: "Controller vagas São Paulo"')

    const results = await serpApi.searchJobs('Controller vagas São Paulo', 'linkedin.com', 5)

    if (results.length > 0) {
      console.log(`✅ SERP API: FUNCIONANDO - ${results.length} resultados encontrados`)
      console.log('\n📊 Exemplo de resultado:')
      console.log(JSON.stringify(results[0], null, 2))
      return { success: true, count: results.length, sample: results[0] }
    } else {
      console.log('⚠️  SERP API: RESPONDE mas retornou 0 resultados (pode ser HTML)')
      return { success: false, error: 'Retornou 0 resultados - provavelmente retorna HTML' }
    }
  } catch (error: any) {
    console.error('❌ SERP API: FALHOU')
    console.error('Erro:', error.message)
    return { success: false, error: error.message }
  }
}

async function testWebUnlocker() {
  console.log('\n========================================')
  console.log('🔓 TESTE 2: Web Unlocker (HTTP Scraping)')
  console.log('========================================\n')

  const apiKey = process.env.BRIGHT_DATA_UNLOCKER_KEY
  console.log('API Key configurada:', apiKey ? `${apiKey.substring(0, 15)}...` : '❌ NÃO CONFIGURADA')

  if (!apiKey) {
    console.log('❌ Web Unlocker: FALHOU - Chave não configurada')
    return { success: false, error: 'API Key não configurada' }
  }

  try {
    console.log('\n📋 Testando acesso a: https://example.com')

    const html = await webUnlocker.fetchPage('https://example.com')

    if (html && html.length > 0) {
      console.log(`✅ Web Unlocker: FUNCIONANDO - ${html.length} caracteres recebidos`)
      console.log('\n📊 Preview do HTML:')
      console.log(html.substring(0, 200) + '...')

      // Verificar se é HTML válido
      const isValidHtml = html.includes('<html') || html.includes('<!DOCTYPE')
      console.log('HTML válido:', isValidHtml ? '✅ Sim' : '⚠️  Não')

      return { success: true, htmlLength: html.length, isValidHtml }
    } else {
      console.log('⚠️  Web Unlocker: RESPONDE mas HTML vazio')
      return { success: false, error: 'HTML vazio' }
    }
  } catch (error: any) {
    console.error('❌ Web Unlocker: FALHOU')
    console.error('Erro:', error.message)
    return { success: false, error: error.message }
  }
}

async function testPuppeteer() {
  console.log('\n========================================')
  console.log('🌐 TESTE 3: Puppeteer/Web Navigator (Browser Automation)')
  console.log('========================================\n')

  const wsUrl = process.env.BRIGHT_DATA_PUPPETEER_URL
  console.log('WebSocket URL configurada:', wsUrl ? `${wsUrl.substring(0, 30)}...` : '❌ NÃO CONFIGURADA')

  if (!wsUrl) {
    console.log('❌ Puppeteer: FALHOU - URL não configurada')
    return { success: false, error: 'WebSocket URL não configurada' }
  }

  try {
    console.log('\n📋 Testando busca no LinkedIn: "Controller São Paulo"')
    console.log('⏳ Aguarde... (pode demorar 30-60 segundos)')

    const jobs = await linkedInScraper.searchJobs(
      'Controller OR CFO OR Controladoria',
      'São Paulo, Brazil',
      1
    )

    if (jobs.length > 0) {
      console.log(`✅ Puppeteer: FUNCIONANDO - ${jobs.length} vagas encontradas`)
      console.log('\n📊 Exemplo de vaga:')
      console.log(JSON.stringify(jobs[0], null, 2))
      return { success: true, count: jobs.length, sample: jobs[0] }
    } else {
      console.log('⚠️  Puppeteer: CONECTOU mas encontrou 0 vagas (pode ser problema de seletores)')
      return { success: false, error: 'Seletores não encontraram vagas' }
    }
  } catch (error: any) {
    console.error('❌ Puppeteer: FALHOU')
    console.error('Erro:', error.message)
    return { success: false, error: error.message }
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║  TESTE COMPLETO - BRIGHT DATA APIs                             ║')
  console.log('╚════════════════════════════════════════════════════════════════╝')

  const results = {
    serpApi: null as any,
    webUnlocker: null as any,
    puppeteer: null as any,
  }

  // Teste 1: SERP API
  results.serpApi = await testSerpApi()

  // Teste 2: Web Unlocker
  results.webUnlocker = await testWebUnlocker()

  // Teste 3: Puppeteer
  results.puppeteer = await testPuppeteer()

  // Resumo final
  console.log('\n\n╔════════════════════════════════════════════════════════════════╗')
  console.log('║  RESUMO DOS TESTES                                             ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  console.log('1. SERP API (Google Search):')
  console.log(`   Status: ${results.serpApi.success ? '✅ FUNCIONANDO' : '❌ FALHOU'}`)
  if (results.serpApi.error) {
    console.log(`   Erro: ${results.serpApi.error}`)
  } else if (results.serpApi.count) {
    console.log(`   Resultados: ${results.serpApi.count}`)
  }

  console.log('\n2. Web Unlocker (HTTP Scraping):')
  console.log(`   Status: ${results.webUnlocker.success ? '✅ FUNCIONANDO' : '❌ FALHOU'}`)
  if (results.webUnlocker.error) {
    console.log(`   Erro: ${results.webUnlocker.error}`)
  } else if (results.webUnlocker.htmlLength) {
    console.log(`   HTML recebido: ${results.webUnlocker.htmlLength} caracteres`)
    console.log(`   HTML válido: ${results.webUnlocker.isValidHtml ? 'Sim' : 'Não'}`)
  }

  console.log('\n3. Puppeteer/Web Navigator (Browser):')
  console.log(`   Status: ${results.puppeteer.success ? '✅ FUNCIONANDO' : '❌ FALHOU'}`)
  if (results.puppeteer.error) {
    console.log(`   Erro: ${results.puppeteer.error}`)
  } else if (results.puppeteer.count) {
    console.log(`   Vagas encontradas: ${results.puppeteer.count}`)
  }

  console.log('\n\n╔════════════════════════════════════════════════════════════════╗')
  console.log('║  DIAGNÓSTICO E RECOMENDAÇÕES                                   ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  const workingCount = [
    results.serpApi.success,
    results.webUnlocker.success,
    results.puppeteer.success
  ].filter(Boolean).length

  if (workingCount === 3) {
    console.log('🎉 EXCELENTE! Todas as 3 APIs estão funcionando perfeitamente!')
  } else if (workingCount === 2) {
    console.log('⚠️  BOM! 2 de 3 APIs funcionando. Verifique a que falhou.')
  } else if (workingCount === 1) {
    console.log('⚠️  ATENÇÃO! Apenas 1 de 3 APIs funcionando.')
  } else {
    console.log('❌ CRÍTICO! Nenhuma API está funcionando.')
  }

  // Recomendações específicas
  console.log('\n📋 Recomendações:')

  if (!results.serpApi.success) {
    console.log('\n• SERP API:')
    console.log('  - Verifique se a chave BRIGHT_DATA_SERP_KEY está correta')
    console.log('  - A API pode estar retornando HTML ao invés de JSON')
    console.log('  - Considere usar Puppeteer para parsing de resultados do Google')
  }

  if (!results.webUnlocker.success) {
    console.log('\n• Web Unlocker:')
    console.log('  - Verifique se a chave BRIGHT_DATA_UNLOCKER_KEY está correta')
    console.log('  - Confirme que a zona "web_unlocker1" está ativa no painel Bright Data')
  }

  if (!results.puppeteer.success) {
    console.log('\n• Puppeteer/Web Navigator:')
    console.log('  - Verifique se BRIGHT_DATA_PUPPETEER_URL está no formato correto')
    console.log('  - Formato: wss://brd-customer-{id}-zone-{zone}:{password}@brd.superproxy.io:9222')
    console.log('  - Os seletores do LinkedIn podem ter mudado (eles mudam frequentemente)')
  }

  if (workingCount > 0) {
    console.log('\n💡 Dicas de uso:')
    if (results.puppeteer.success) {
      console.log('  - Use Puppeteer para scraping de LinkedIn e sites complexos')
    }
    if (results.webUnlocker.success) {
      console.log('  - Use Web Unlocker para Gupy, Catho, InfoJobs e sites simples')
    }
    if (results.serpApi.success) {
      console.log('  - Use SERP API para descoberta multi-fonte via Google')
    }
  }

  console.log('\n✅ Teste concluído!\n')
}

main().catch(console.error)
