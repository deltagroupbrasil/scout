/**
 * Upload Environment Variables to Vercel
 *
 * Lê o arquivo .env.vercel e envia para o Vercel via CLI
 */

import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { resolve } from 'path'

async function uploadEnvToVercel() {
  console.log('🚀 LeapScout - Upload de Variáveis para Vercel')
  console.log('==============================================\n')

  // Ler .env.vercel
  const envPath = resolve(process.cwd(), '.env.vercel')
  const envContent = readFileSync(envPath, 'utf-8')

  // Parsear variáveis
  const envVars: Record<string, string> = {}
  const lines = envContent.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Ignorar comentários e linhas vazias
    if (!trimmed || trimmed.startsWith('#')) continue

    // Parsear KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.+)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()

      // Remover aspas se existirem
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      envVars[key] = value
    }
  }

  console.log(`📋 Encontradas ${Object.keys(envVars).length} variáveis de ambiente:\n`)
  Object.keys(envVars).forEach(key => {
    console.log(`   - ${key}`)
  })

  console.log('\n⚠️  IMPORTANTE: Este script vai ADICIONAR as variáveis ao Vercel.')
  console.log('   Se já existirem, você verá um erro (isso é normal).\n')
  console.log('   Certifique-se de ter executado:')
  console.log('   1. vercel login')
  console.log('   2. vercel link\n')
  console.log('🚀 Começando upload em 3 segundos...\n')

  // Aguardar 3 segundos
  await new Promise(resolve => setTimeout(resolve, 3000))

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const [key, value] of Object.entries(envVars)) {
    try {
      console.log(`📤 Adicionando: ${key}...`)

      // Adicionar variável via CLI
      execSync(`vercel env add ${key} production`, {
        input: `${value}\n`,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      successCount++
      console.log(`   ✅ Sucesso!\n`)

    } catch (error: any) {
      const errorMessage = error.message || ''

      // Se já existe, não é um erro real
      if (errorMessage.includes('already exists') || errorMessage.includes('já existe')) {
        skipCount++
        console.log(`   ⏭️  Já existe (pulando)\n`)
      } else {
        errorCount++
        console.log(`   ❌ Erro: ${errorMessage}\n`)
      }
    }
  }

  console.log('\n==============================================')
  console.log('📊 Resumo:')
  console.log(`   ✅ Adicionadas: ${successCount}`)
  console.log(`   ⏭️  Já existiam: ${skipCount}`)
  console.log(`   ❌ Erros: ${errorCount}`)
  console.log('\n🎉 Processo concluído!')
  console.log('\n📱 Próximos passos:')
  console.log('   1. Faça redeploy: vercel --prod')
  console.log('   2. Ou no Vercel: Deployments → ... → Redeploy')
  console.log('   3. Teste o login: https://leapscout.vercel.app/login\n')
}

uploadEnvToVercel().catch(console.error)
