/**
 * Teste do fluxo simplificado:
 * Claude API (web search) → CNPJ → Nova Vida API → Sócios com telefones/emails
 */

// IMPORTANTE: Carregar .env ANTES de qualquer import
require('dotenv').config()

import { cnpjFinder } from '../lib/services/cnpj-finder'
import { novaVidaTIEnrichment } from '../lib/services/novavidati-enrichment'

async function testFlow() {
  console.log('========================================')
  console.log('TESTE: Claude API → CNPJ → Nova Vida API')
  console.log('========================================\n')

  // Empresa de teste
  const companyName = 'PagBank'

  console.log(`Empresa de teste: ${companyName}\n`)

  // ETAPA 1: Buscar CNPJ via Claude API
  console.log('ETAPA 1: Buscar CNPJ via Claude API (web search)')
  console.log('--------------------------------------------------')

  const cnpj = await cnpjFinder.findCNPJByName(companyName)

  if (!cnpj) {
    console.error('CNPJ nao encontrado! Encerrando teste.')
    return
  }

  // ETAPA 2: Enriquecer com Nova Vida API
  console.log('\nETAPA 2: Consultar Nova Vida API')
  console.log('--------------------------------------------------')

  const novaVidaData = await novaVidaTIEnrichment.enrichCompanyContacts(
    cnpj,
    companyName
  )

  if (!novaVidaData) {
    console.error('Nova Vida API nao retornou dados!')
    return
  }

  // ETAPA 3: Exibir resultados
  console.log('\n========================================')
  console.log('RESULTADOS')
  console.log('========================================\n')

  console.log(`Empresa: ${novaVidaData.razaoSocial}`)
  console.log(`CNPJ: ${cnpj}`)
  console.log(`Nome Fantasia: ${novaVidaData.nomeFantasia || 'N/A'}`)
  console.log(`Porte: ${novaVidaData.porte || 'N/A'}`)
  console.log(`Funcionarios: ${novaVidaData.qtdeFuncionarios || 'N/A'}`)

  console.log(`\nContatos da Empresa:`)
  console.log(`  Telefones: ${novaVidaData.telefones.length}`)
  novaVidaData.telefones.forEach(phone => {
    console.log(`    - ${phone}`)
  })

  console.log(`  Emails: ${novaVidaData.emails.length}`)
  novaVidaData.emails.forEach(email => {
    console.log(`    - ${email}`)
  })

  if (novaVidaData.whatsapp && novaVidaData.whatsapp.length > 0) {
    console.log(`  WhatsApp: ${novaVidaData.whatsapp.length}`)
    novaVidaData.whatsapp.forEach(whatsapp => {
      console.log(`    - ${whatsapp}`)
    })
  }

  console.log(`\nSocios (${novaVidaData.socios.length}):`)
  console.log('--------------------------------------------------')

  novaVidaData.socios.forEach((socio, index) => {
    console.log(`\n  ${index + 1}. ${socio.nome}`)
    console.log(`     Cargo: ${socio.qualificacao}`)

    if (socio.participacao) {
      console.log(`     Participacao: ${socio.participacao}`)
    }

    if (socio.telefones.length > 0) {
      console.log(`     Telefones: ${socio.telefones.length}`)
      socio.telefones.forEach(phone => {
        console.log(`       - ${phone}`)
      })
    }

    if (socio.emails.length > 0) {
      console.log(`     Emails: ${socio.emails.length}`)
      socio.emails.forEach(email => {
        console.log(`       - ${email}`)
      })
    }

    if (!socio.telefones.length && !socio.emails.length) {
      console.log(`     Sem contatos disponiveis`)
    }
  })

  // Estatísticas
  const totalPhones = novaVidaData.socios.reduce((sum, s) => sum + s.telefones.length, 0)
  const totalEmails = novaVidaData.socios.reduce((sum, s) => sum + s.emails.length, 0)

  console.log(`\n========================================`)
  console.log('ESTATISTICAS')
  console.log('========================================')
  console.log(`Total de socios: ${novaVidaData.socios.length}`)
  console.log(`Total de telefones de socios: ${totalPhones}`)
  console.log(`Total de emails de socios: ${totalEmails}`)
  console.log(`Total de telefones corporativos: ${novaVidaData.telefones.length}`)
  console.log(`Total de emails corporativos: ${novaVidaData.emails.length}`)
  console.log(`\nTOTAL GERAL DE CONTATOS: ${totalPhones + totalEmails + novaVidaData.telefones.length + novaVidaData.emails.length}`)

  console.log('\n========================================')
  console.log('TESTE CONCLUIDO COM SUCESSO!')
  console.log('========================================\n')
}

testFlow().catch(console.error)
