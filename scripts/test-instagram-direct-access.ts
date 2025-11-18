/**
 * Teste: Verificar se Claude consegue ACESSAR POSTS DO INSTAGRAM
 */

require('dotenv').config()

import Anthropic from '@anthropic-ai/sdk'

async function testInstagramAccess() {
  console.log('========================================')
  console.log('TESTE: Acesso Direto aos Posts do Instagram')
  console.log('========================================\n')

  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY
  })

  // Testar com uma empresa que sabemos ter Instagram ativo
  const companyName = 'Magazine Luiza'
  const instagramUrl = 'https://instagram.com/magazineluiza'

  console.log(`Empresa: ${companyName}`)
  console.log(`Instagram: ${instagramUrl}`)
  console.log('\nPergunta para Claude: "Acesse o Instagram e me diga os últimos 3 posts"\n')
  console.log('========================================\n')

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
          content: `Acesse o Instagram da ${companyName} em ${instagramUrl} e me diga:

1. Quais foram os últimos 3 posts publicados?
2. Sobre o que a empresa está falando?
3. Há algum anúncio de produto, evento ou novidade?

IMPORTANTE: Tente acessar DIRETAMENTE os posts do Instagram, não apenas notícias sobre a empresa.

Retorne em formato JSON:
{
  "conseguiu_acessar_instagram": true/false,
  "posts_encontrados": [
    {
      "data": "YYYY-MM-DD",
      "conteudo": "descrição do post",
      "tipo": "produto/evento/noticia/outro"
    }
  ],
  "observacao": "explicação sobre o acesso"
}`
        }
      ]
    })

    console.log('RESPOSTA DO CLAUDE:\n')
    console.log('========================================\n')

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : JSON.stringify(message.content[0])

    console.log(responseText)

    console.log('\n========================================')
    console.log('ANÁLISE:')
    console.log('========================================\n')

    if (responseText.toLowerCase().includes('não consigo acessar') ||
        responseText.toLowerCase().includes('não consegui') ||
        responseText.toLowerCase().includes('login') ||
        responseText.toLowerCase().includes('autenticação')) {
      console.log('❌ Claude NÃO consegue acessar posts diretos do Instagram')
      console.log('   Motivo: Instagram requer login/autenticação')
      console.log('\n💡 SOLUÇÃO: Sistema vai buscar notícias SOBRE a empresa nas redes sociais')
    } else if (responseText.toLowerCase().includes('conseguiu_acessar_instagram": true')) {
      console.log('✅ Claude CONSEGUE acessar posts do Instagram!')
    } else {
      console.log('⚠️  Resultado inconclusivo - analise a resposta acima')
    }

  } catch (error) {
    console.error('Erro:', error)
  }
}

testInstagramAccess()
