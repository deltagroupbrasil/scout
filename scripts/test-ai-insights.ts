import 'dotenv/config'
import { aiInsights } from '../lib/services/ai-insights'

async function testAIInsights() {
  console.log('🤖 Testando integração com Claude API...\n')

  const companyName = 'Natura Cosméticos'
  const sector = 'Cosméticos e Produtos de Beleza'
  const jobTitle = 'Gerente de Controladoria'
  const jobDescription = `
    Estamos em busca de um Gerente de Controladoria para liderar nossa equipe financeira.

    Responsabilidades:
    - Coordenar fechamento contábil mensal
    - Análises gerenciais e reporting para diretoria
    - Gestão de equipe de 5 analistas
    - Compliance com normas contábeis e fiscais
    - Implementação de melhorias em processos financeiros

    Requisitos:
    - Experiência mínima de 5 anos em controladoria
    - Conhecimento em SAP ou similar
    - Inglês avançado
    - CRC ativo
  `

  try {
    console.log(`📊 Gerando insights para: ${companyName}`)
    console.log(`📋 Vaga: ${jobTitle}\n`)

    const insights = await aiInsights.generateInsights(
      companyName,
      sector,
      jobTitle,
      jobDescription
    )

    console.log('✅ Insights gerados com sucesso!\n')
    console.log('👥 DECISORES SUGERIDOS:')
    console.log('─'.repeat(50))
    insights.suggestedContacts.forEach((contact, idx) => {
      console.log(`${idx + 1}. ${contact.name}`)
      console.log(`   Cargo: ${contact.role}`)
      if (contact.linkedin) console.log(`   LinkedIn: ${contact.linkedin}`)
      if (contact.email) console.log(`   Email: ${contact.email}`)
      console.log()
    })

    console.log('🎯 GATILHOS DE ABORDAGEM:')
    console.log('─'.repeat(50))
    insights.triggers.forEach((trigger, idx) => {
      console.log(`${idx + 1}. ${trigger}`)
    })
    console.log()

    console.log('✨ Teste concluído com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao testar IA:', error)
    if (error instanceof Error) {
      console.error('Detalhes:', error.message)
    }
  }
}

testAIInsights()
