/**
 * Teste definitivo: Verificar se Claude consegue LER POSTS do Instagram
 * Vai testar com diferentes abordagens para confirmar capacidades
 */

require('dotenv').config()

import Anthropic from '@anthropic-ai/sdk'

async function testInstagramCapabilities() {
  console.log('========================================')
  console.log('TESTE: Capacidades do Claude para Instagram')
  console.log('========================================\n')

  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
  })

  const testCases = [
    {
      name: 'Teste 1: Perguntar diretamente sobre capacidades',
      prompt: `Você consegue acessar e ler posts do Instagram diretamente? Por exemplo, consegue ver o que foi postado em https://instagram.com/magazineluiza nos últimos dias?

Responda APENAS: SIM ou NÃO, seguido de uma breve explicação.`
    },
    {
      name: 'Teste 2: Tentar buscar posts específicos',
      prompt: `Use web_search para encontrar os últimos 3 posts publicados no Instagram de @magazineluiza (https://instagram.com/magazineluiza).

Retorne em JSON:
{
  "conseguiu_acessar_posts_diretamente": true/false,
  "posts": [{"data": "DD/MM/YYYY", "conteudo": "descrição"}],
  "fonte_dos_dados": "posts do instagram OU noticias sobre posts"
}`
    }
  ]

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`)
    console.log('========================================\n')
    console.log(`Pergunta: ${testCase.prompt.substring(0, 150)}...\n`)

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 5
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

      // Análise da resposta
      const lowerResponse = responseText.toLowerCase()

      if (lowerResponse.includes('não consigo') ||
          lowerResponse.includes('não posso') ||
          lowerResponse.includes('não tenho acesso') ||
          lowerResponse.includes('login') ||
          lowerResponse.includes('autenticação') ||
          lowerResponse.includes('conseguiu_acessar_posts_diretamente": false')) {
        console.log('❌ RESULTADO: Claude NÃO consegue acessar posts diretos do Instagram\n')
      } else if (lowerResponse.includes('conseguiu_acessar_posts_diretamente": true')) {
        console.log('✅ RESULTADO: Claude CONSEGUE acessar posts do Instagram!\n')
      } else {
        console.log('⚠️  RESULTADO: Inconclusivo - analise a resposta acima\n')
      }

    } catch (error) {
      console.error('Erro:', error)
    }

    // Delay entre testes
    if (testCase !== testCases[testCases.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  console.log('\n========================================')
  console.log('CONCLUSÃO FINAL')
  console.log('========================================\n')
  console.log('Com base nos testes acima, determinar se:')
  console.log('1. Claude consegue acessar POSTS diretos do Instagram')
  console.log('2. Claude consegue apenas NOTÍCIAS sobre a empresa (fontes externas)')
  console.log('3. Instagram requer login e não pode ser acessado via web_search\n')
}

testInstagramCapabilities()
  .catch(console.error)
