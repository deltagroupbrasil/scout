/**
 * Script de teste para validar integração Nova Vida TI com dados reais
 *
 * Este script testa:
 * 1. Geração de token
 * 2. Consulta de empresa por CNPJ
 * 3. Parse de resposta real
 * 4. Consulta de sócios por CPF
 */

import { novaVidaTIEnrichment } from '@/lib/services/novavidati-enrichment'

async function testNovaVidaTIIntegration() {
  console.log('='.repeat(60))
  console.log('🧪 TESTE DE INTEGRAÇÃO NOVA VIDA TI')
  console.log('='.repeat(60))

  // Dados de teste baseados na string fornecida
  const testCases = [
    {
      name: 'Delta Mining/Computação',
      cnpj: '30622134000191', // CNPJ completo estimado
      expectedEmail: 'regis@delta-mining.com',
      description: 'Teste com dados reais fornecidos'
    },
    {
      name: 'Magazine Luiza',
      cnpj: '00000000000191',
      description: 'Teste com empresa conhecida'
    },
    {
      name: 'PagBank (PagSeguro)',
      cnpj: '08561701000101',
      description: 'Teste com fintech'
    }
  ]

  for (const testCase of testCases) {
    console.log('\n' + '─'.repeat(60))
    console.log(`📋 Testando: ${testCase.name}`)
    console.log(`   CNPJ: ${testCase.cnpj}`)
    console.log(`   ${testCase.description}`)
    console.log('─'.repeat(60))

    try {
      const result = await novaVidaTIEnrichment.enrichCompanyContacts(
        testCase.cnpj,
        testCase.name
      )

      if (!result) {
        console.log('   ⚠️  Nenhum dado retornado')
        continue
      }

      // Exibir resultados
      console.log('\n✅ DADOS ENRIQUECIDOS:')
      console.log('─'.repeat(60))

      console.log(`\n📊 Dados Cadastrais:`)
      console.log(`   Razão Social: ${result.razaoSocial || 'N/A'}`)
      console.log(`   Nome Fantasia: ${result.nomeFantasia || 'N/A'}`)
      console.log(`   Porte: ${result.porte || 'N/A'}`)
      console.log(`   Capital Social: ${result.capitalSocial ? `R$ ${result.capitalSocial.toLocaleString('pt-BR')}` : 'N/A'}`)
      console.log(`   Funcionários: ${result.qtdeFuncionarios || 'N/A'}`)
      console.log(`   Data Abertura: ${result.dataAbertura || 'N/A'}`)

      console.log(`\n📞 Contatos da Empresa:`)
      console.log(`   Telefones: ${result.telefones.length}`)
      if (result.telefones.length > 0) {
        result.telefones.forEach((tel, idx) => {
          console.log(`      ${idx + 1}. ${formatPhone(tel)}`)
        })
      }

      console.log(`   Emails: ${result.emails.length}`)
      if (result.emails.length > 0) {
        result.emails.forEach((email, idx) => {
          console.log(`      ${idx + 1}. ${email}`)

          // Verificar se encontrou o email esperado
          if (testCase.expectedEmail && email === testCase.expectedEmail) {
            console.log(`         ✅ Email esperado encontrado!`)
          }
        })
      }

      if (result.whatsapp && result.whatsapp.length > 0) {
        console.log(`   WhatsApp: ${result.whatsapp.length}`)
        result.whatsapp.forEach((whats, idx) => {
          console.log(`      ${idx + 1}. ${formatPhone(whats)}`)
        })
      }

      console.log(`\n👔 Sócios/Decisores: ${result.socios.length}`)
      if (result.socios.length > 0) {
        result.socios.forEach((socio, idx) => {
          console.log(`\n   ${idx + 1}. ${socio.nome}`)
          console.log(`      Cargo: ${socio.qualificacao}`)
          if (socio.participacao) {
            console.log(`      Participação: ${socio.participacao}`)
          }
          console.log(`      Telefones: ${socio.telefones.length}`)
          socio.telefones.forEach(tel => {
            console.log(`         📱 ${formatPhone(tel)}`)
          })
          console.log(`      Emails: ${socio.emails.length}`)
          socio.emails.forEach(email => {
            console.log(`         📧 ${email}`)
          })
        })
      }

      // Estatísticas
      const totalContacts = result.telefones.length + result.emails.length +
        result.socios.reduce((sum, s) => sum + s.telefones.length + s.emails.length, 0)

      console.log('\n' + '─'.repeat(60))
      console.log(`📈 TOTAL DE CONTATOS ENCONTRADOS: ${totalContacts}`)
      console.log('─'.repeat(60))

      // Delay entre testes
      if (testCases.indexOf(testCase) < testCases.length - 1) {
        console.log('\n⏳ Aguardando 3 segundos antes do próximo teste...')
        await sleep(3000)
      }

    } catch (error) {
      console.error(`\n❌ ERRO:`, error)
    }
  }

  // Estatísticas de uso
  console.log('\n' + '='.repeat(60))
  console.log('💰 ESTATÍSTICAS DE USO')
  console.log('='.repeat(60))

  const usage = await novaVidaTIEnrichment.getMonthlyUsage()
  console.log(`\nMês: ${usage.currentMonth}`)
  console.log(`Total de consultas: ${usage.queries}`)
  console.log(`Custo total: R$ ${usage.totalCost.toFixed(2)}`)

  console.log('\n' + '='.repeat(60))
  console.log('✅ TESTE CONCLUÍDO')
  console.log('='.repeat(60))
}

function formatPhone(phone: string): string {
  // Formatar telefone brasileiro
  if (phone.length === 11) {
    // Celular: (11) 98765-4321
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`
  } else if (phone.length === 10) {
    // Fixo: (11) 3456-7890
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`
  }
  return phone
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Executar testes
testNovaVidaTIIntegration()
  .then(() => {
    console.log('\n✅ Script finalizado com sucesso')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro fatal:', error)
    process.exit(1)
  })
