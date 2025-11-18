/**
 * Teste: Verificar se Google indexa posts do Instagram
 * Testar busca específica por posts recentes via Google
 */

require('dotenv').config()

import Anthropic from '@anthropic-ai/sdk'

async function testInstagramGoogleIndexing() {
  console.log('========================================')
  console.log('TESTE: Instagram indexado no Google')
  console.log('========================================\n')

  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
  })

  const testCases = [
    {
      name: 'Teste 1: Buscar posts recentes via Google',
      company: 'Magazine Luiza',
      instagram: '@magazineluiza',
      prompt: `Use web_search para buscar no Google: "site:instagram.com/p/ magazineluiza"

Esta busca deve encontrar URLs de POSTS ESPECÍFICOS do Instagram da Magazine Luiza.

Analise os resultados e retorne em JSON:
{
  "encontrou_posts_indexados": true/false,
  "quantidade_posts_encontrados": 0,
  "posts": [
    {
      "url": "URL do post",
      "conteudo_visivel": "O que conseguiu extrair do post",
      "data_estimada": "se conseguir identificar"
    }
  ],
  "conclusao": "Se o Google indexa posts individuais do Instagram ou não"
}`
    },
    {
      name: 'Teste 2: Buscar posts com palavra-chave específica',
      company: 'Atlantica Hotels',
      instagram: '@letsatlantica',
      prompt: `Use web_search para buscar: "site:instagram.com/letsatlantica/ hotel OR inauguração OR lançamento"

Procure por posts específicos da Atlantica Hotels no Instagram que mencionem inaugurações ou lançamentos.

Retorne em JSON:
{
  "encontrou_posts_especificos": true/false,
  "posts_relevantes": [
    {
      "url": "URL",
      "preview_texto": "texto que aparece no preview do Google",
      "relevante_para_vendas": true/false
    }
  ],
  "google_indexa_conteudo_posts": "SIM ou NÃO - o Google mostra o CONTEÚDO dos posts ou só a página de perfil?"
}`
    }
  ]

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`)
    console.log(`Empresa: ${testCase.company} (${testCase.instagram})`)
    console.log('========================================\n')

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 3000,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 10
          }
        ],
        messages: [
          {
            role: 'user',
            content: testCase.prompt
          }
        ]
      })

      const responseText = message.content
        .filter(block => block.type === 'text')
        .map(block => 'text' in block ? block.text : '')
        .join('\n')

      console.log('RESPOSTA:\n')
      console.log(responseText)
      console.log('\n========================================\n')

      // Análise
      const lowerResponse = responseText.toLowerCase()

      if (lowerResponse.includes('encontrou_posts_indexados": true') ||
          lowerResponse.includes('encontrou_posts_especificos": true') ||
          lowerResponse.includes('google_indexa_conteudo_posts": "sim')) {
        console.log('✅ Google INDEXA posts do Instagram!\n')
      } else if (lowerResponse.includes('instagram.com/p/')) {
        console.log('✅ Encontrou URLs de posts específicos!\n')
      } else {
        console.log('❌ Google NÃO indexa conteúdo dos posts\n')
      }

    } catch (error) {
      console.error('Erro:', error)
    }

    // Delay entre testes
    if (testCase !== testCases[testCases.length - 1]) {
      console.log('Aguardando 3 segundos antes do próximo teste...\n')
      await new Promise(resolve => setTimeout(resolve, 3000))
    }
  }

  console.log('\n========================================')
  console.log('CONCLUSÃO')
  console.log('========================================\n')
  console.log('Se o Google indexa posts do Instagram:')
  console.log('→ Podemos MELHORAR o prompt do events-detector')
  console.log('→ Adicionar busca específica: site:instagram.com/p/ [empresa]')
  console.log('→ Extrair conteúdo real dos posts via preview do Google\n')
}

testInstagramGoogleIndexing()
  .catch(console.error)
