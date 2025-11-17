/**
 * Teste completo do pipeline de scraping + enriquecimento NovaVida
 */

import { leadOrchestrator } from '@/lib/services/lead-orchestrator'
import { prisma } from '@/lib/prisma'

async function testFullPipeline() {
  console.log('='.repeat(70))
  console.log('🚀 TESTE COMPLETO: SCRAPING + ENRIQUECIMENTO NOVA VIDA TI')
  console.log('='.repeat(70))

  console.log('\n📋 Configuração do teste:')
  console.log('   Query: "Controller São Paulo"')
  console.log('   Max Companies: 3')
  console.log('   Enriquecimento: Nova Vida TI (ativo)')

  console.log('\n' + '─'.repeat(70))
  console.log('INICIANDO SCRAPING...')
  console.log('─'.repeat(70))

  try {
    // Executar scraping com limite de 3 empresas
    const result = await leadOrchestrator.scrapeAndProcessLeads({
      query: 'Controller São Paulo',
      maxCompanies: 3
    })

    console.log('\n' + '='.repeat(70))
    console.log('✅ SCRAPING CONCLUÍDO')
    console.log('='.repeat(70))

    console.log(`\n📊 Resultados do scraping:`)
    console.log(`   Total de jobs encontrados: ${result.totalJobs}`)
    console.log(`   Leads salvos: ${result.savedLeads}`)
    console.log(`   Empresas processadas: ${result.companiesProcessed}`)
    console.log(`   Leads com erro: ${result.errors.length}`)

    if (result.errors.length > 0) {
      console.log('\n⚠️  Erros encontrados:')
      result.errors.forEach((error, idx) => {
        console.log(`   ${idx + 1}. ${error}`)
      })
    }

    // Buscar leads salvos no banco
    console.log('\n' + '─'.repeat(70))
    console.log('VERIFICANDO DADOS NO BANCO')
    console.log('─'.repeat(70))

    const leads = await prisma.lead.findMany({
      include: {
        company: true
      },
      orderBy: {
        priorityScore: 'desc'
      }
    })

    console.log(`\n✅ ${leads.length} leads encontrados no banco\n`)

    // Mostrar detalhes de cada lead
    for (const [idx, lead] of leads.entries()) {
      console.log('='.repeat(70))
      console.log(`LEAD ${idx + 1}/${leads.length}`)
      console.log('='.repeat(70))

      console.log(`\n🏢 Empresa: ${lead.company.name}`)
      console.log(`   CNPJ: ${lead.company.cnpj || 'N/A'}`)
      console.log(`   Setor: ${lead.company.sector || 'N/A'}`)
      console.log(`   Revenue: ${lead.company.revenue ? `R$ ${lead.company.revenue.toLocaleString('pt-BR')}` : 'N/A'}`)
      console.log(`   Funcionários: ${lead.company.employees || 'N/A'}`)
      console.log(`   Website: ${lead.company.website || 'N/A'}`)

      console.log(`\n📋 Vaga:`)
      console.log(`   Título: ${lead.jobTitle}`)
      console.log(`   URL: ${lead.jobUrl}`)
      console.log(`   Fonte: ${lead.jobSource}`)
      console.log(`   Status: ${lead.status}`)
      console.log(`   Priority Score: ${lead.priorityScore}`)
      console.log(`   Candidatos: ${lead.candidateCount || 'N/A'}`)

      // Parse contatos sugeridos
      let suggestedContacts: any[] = []
      try {
        if (lead.suggestedContacts) {
          if (typeof lead.suggestedContacts === 'string') {
            suggestedContacts = JSON.parse(lead.suggestedContacts)
          } else if (Array.isArray(lead.suggestedContacts)) {
            suggestedContacts = lead.suggestedContacts
          }
        }
      } catch (e) {
        console.error('   ⚠️  Erro ao parsear suggestedContacts')
      }

      console.log(`\n👥 Contatos Sugeridos: ${suggestedContacts.length}`)
      if (suggestedContacts.length > 0) {
        suggestedContacts.slice(0, 3).forEach((contact, cIdx) => {
          console.log(`\n   ${cIdx + 1}. ${contact.name || 'N/A'}`)
          console.log(`      Cargo: ${contact.role || 'N/A'}`)
          console.log(`      Email: ${contact.email || 'N/A'}`)
          console.log(`      LinkedIn: ${contact.linkedin || 'N/A'}`)
          if (contact.telefones && contact.telefones.length > 0) {
            console.log(`      Telefones: ${contact.telefones.length}`)
            contact.telefones.forEach((tel: string) => {
              console.log(`         📱 ${formatPhone(tel)}`)
            })
          }
        })
        if (suggestedContacts.length > 3) {
          console.log(`   ... e mais ${suggestedContacts.length - 3} contatos`)
        }
      }

      // Parse triggers
      let triggers: string[] = []
      try {
        if (lead.triggers) {
          if (typeof lead.triggers === 'string') {
            triggers = JSON.parse(lead.triggers)
          } else if (Array.isArray(lead.triggers)) {
            triggers = lead.triggers
          }
        }
      } catch (e) {
        console.error('   ⚠️  Erro ao parsear triggers')
      }

      console.log(`\n🎯 Triggers: ${triggers.length}`)
      if (triggers.length > 0) {
        triggers.forEach((trigger, tIdx) => {
          console.log(`   ${tIdx + 1}. ${trigger}`)
        })
      }

      // Contatos corporativos (NovaVida)
      let companyPhones: string[] = []
      let companyEmails: string[] = []
      try {
        if (lead.company.companyPhones) {
          if (typeof lead.company.companyPhones === 'string') {
            companyPhones = JSON.parse(lead.company.companyPhones)
          }
        }
        if (lead.company.companyEmails) {
          if (typeof lead.company.companyEmails === 'string') {
            companyEmails = JSON.parse(lead.company.companyEmails)
          }
        }
      } catch (e) {
        console.error('   ⚠️  Erro ao parsear company contacts')
      }

      if (companyPhones.length > 0 || companyEmails.length > 0) {
        console.log(`\n📞 Contatos Corporativos (NovaVida):`)
        if (companyPhones.length > 0) {
          console.log(`   Telefones: ${companyPhones.length}`)
          companyPhones.slice(0, 3).forEach(phone => {
            console.log(`      📱 ${formatPhone(phone)}`)
          })
        }
        if (companyEmails.length > 0) {
          console.log(`   Emails: ${companyEmails.length}`)
          companyEmails.slice(0, 3).forEach(email => {
            console.log(`      📧 ${email}`)
          })
        }
        if (lead.company.companyWhatsApp) {
          console.log(`   WhatsApp: ${formatPhone(lead.company.companyWhatsApp)}`)
        }
      }

      console.log('')
    }

    // Estatísticas NovaVida
    console.log('='.repeat(70))
    console.log('💰 CUSTOS NOVA VIDA TI')
    console.log('='.repeat(70))

    const usage = await prisma.novaVidaTIUsage.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (usage.length > 0) {
      const totalCost = usage.reduce((sum, u) => sum + u.cost, 0)

      console.log(`\n   Total de consultas: ${usage.length}`)
      console.log(`   Custo total: R$ ${totalCost.toFixed(2)}`)

      console.log('\n   Detalhes:')
      usage.forEach((u, idx) => {
        console.log(`   ${idx + 1}. ${u.companyName}`)
        console.log(`      CNPJ: ${u.cnpj}`)
        console.log(`      Custo: R$ ${u.cost.toFixed(2)}`)
        console.log(`      Data: ${u.createdAt.toLocaleString('pt-BR')}`)
      })
    } else {
      console.log('\n   Nenhuma consulta NovaVida realizada')
      console.log('   (Empresas sem CNPJ ou NovaVida desabilitado)')
    }

    console.log('\n' + '='.repeat(70))
    console.log('✅ TESTE COMPLETO CONCLUÍDO COM SUCESSO!')
    console.log('='.repeat(70))

    console.log('\n💡 Acesse o dashboard para ver os leads:')
    console.log('   http://localhost:3000/dashboard')

  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error)
    throw error
  }
}

function formatPhone(phone: string): string {
  if (!phone) return 'N/A'
  if (phone.length === 11) {
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`
  } else if (phone.length === 10) {
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 6)}-${phone.slice(6)}`
  }
  return phone
}

testFullPipeline()
  .then(() => {
    console.log('\n✅ Script finalizado')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro fatal:', error)
    process.exit(1)
  })
