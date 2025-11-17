// Script para testar a integração do LinkedIn Scraper no orchestrator
// Testa a waterfall strategy: Apollo → LinkedIn → Google → Estimated

import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env') })

async function testLinkedInIntegration() {
  console.log('\n🧪 Testando Integração LinkedIn Scraper\n')
  console.log('='.repeat(70))

  // 1. Verificar configurações
  console.log('\n📋 Verificando Configurações:\n')
  console.log('   APOLLO_API_KEY:', process.env.APOLLO_API_KEY ? '✅ Configurada' : '❌ Não configurada')
  console.log('   BRIGHT_DATA_PUPPETEER_URL:', process.env.BRIGHT_DATA_PUPPETEER_URL ? '✅ Configurada' : '❌ Não configurada')

  // 2. Testar LinkedIn People Scraper diretamente
  console.log('\n' + '='.repeat(70))
  console.log('\n🧪 Teste 1: LinkedIn People Scraper (Direto)\n')

  try {
    const { linkedInPeopleScraper } = await import('../lib/services/linkedin-people-scraper')

    const companyName = 'PagBank'
    const roles = ['CFO', 'Controller', 'Finance Director']

    console.log(`   Buscando: ${roles.join(', ')} at ${companyName}`)

    const people = await linkedInPeopleScraper.searchPeopleByRole(companyName, roles)

    if (people.length > 0) {
      console.log(`   ✅ Sucesso! Encontrados ${people.length} perfis:\n`)
      people.forEach((person, index) => {
        console.log(`   ${index + 1}. ${person.name}`)
        console.log(`      Cargo: ${person.role}`)
        console.log(`      LinkedIn: ${person.linkedinUrl}`)
        if (person.location) console.log(`      Localização: ${person.location}`)
        console.log()
      })
    } else {
      console.log('   ⚠️  Nenhum perfil encontrado')
    }
  } catch (error) {
    console.error('   ❌ Erro:', error)
  }

  // 3. Testar Waterfall Strategy no Orchestrator
  console.log('\n' + '='.repeat(70))
  console.log('\n🧪 Teste 2: Waterfall Strategy (Orchestrator)\n')
  console.log('   Estratégias:\n')
  console.log('   1️⃣  Apollo.io (prioridade - dados verificados)')
  console.log('   2️⃣  LinkedIn People Scraper (perfis reais)')
  console.log('   3️⃣  Google People Finder (busca pública)')
  console.log('   4️⃣  Contatos Estimados (IA)\n')

  try {
    const { leadOrchestrator } = await import('../lib/services/lead-orchestrator')

    const mockJobData = {
      jobTitle: 'Controller Pleno',
      companyName: 'PagBank',
      companyUrl: 'https://www.linkedin.com/company/pagbank/',
      location: 'São Paulo, SP',
      description: 'Vaga para Controller com experiência em análise financeira...',
      jobDescription: 'Vaga para Controller com experiência em análise financeira...',
      postedDate: new Date(),
      jobPostedDate: new Date(),
      jobUrl: 'https://www.linkedin.com/jobs/view/test',
      candidateCount: 45,
      jobSource: 'linkedin'
    }

    console.log(`   Processando vaga: ${mockJobData.jobTitle} @ ${mockJobData.companyName}`)

    const leadId = await leadOrchestrator.processJobListing(mockJobData)

    if (leadId) {
      console.log(`\n   ✅ Lead criado com sucesso!`)
      console.log(`   ID: ${leadId}`)

      // Buscar lead criado para ver os contatos
      const { prisma } = await import('../lib/prisma')
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          suggestedContacts: true,
          triggers: true
        }
      })

      if (lead && lead.suggestedContacts) {
        const contacts = JSON.parse(lead.suggestedContacts as string)
        console.log(`\n   📊 Contatos Encontrados: ${contacts.length}\n`)

        contacts.forEach((contact: any, index: number) => {
          console.log(`   ${index + 1}. ${contact.name}`)
          console.log(`      Cargo: ${contact.role}`)
          console.log(`      Fonte: ${contact.source || 'unknown'}`)
          if (contact.email) console.log(`      Email: ${contact.email}`)
          if (contact.phone) console.log(`      Telefone: ${contact.phone}`)
          if (contact.linkedin) console.log(`      LinkedIn: ${contact.linkedin}`)
          console.log()
        })

        // Estatísticas por fonte
        const sourceStats: Record<string, number> = {}
        contacts.forEach((contact: any) => {
          const source = contact.source || 'unknown'
          sourceStats[source] = (sourceStats[source] || 0) + 1
        })

        console.log('   📊 Estatísticas por Fonte:')
        Object.entries(sourceStats).forEach(([source, count]) => {
          const emoji = {
            apollo: '✓',
            linkedin: '🔗',
            google: '🔍',
            website: '🌐',
            estimated: '⚡',
            unknown: '❓'
          }[source] || '?'

          console.log(`      ${emoji} ${source}: ${count} contato(s)`)
        })
      }
    } else {
      console.log('   ⚠️  Nenhum lead criado')
    }

  } catch (error) {
    console.error('   ❌ Erro:', error)
  }

  console.log('\n' + '='.repeat(70))
  console.log('\n✅ Teste concluído!\n')
  console.log('💡 Próximos Passos:')
  console.log('   1. Verificar se a fonte "linkedin" aparece nos contatos')
  console.log('   2. Conferir badge 🔗 LinkedIn no dashboard')
  console.log('   3. Validar waterfall: Apollo → LinkedIn → Google → Estimated\n')
}

testLinkedInIntegration()
  .catch(console.error)
  .finally(() => process.exit(0))
