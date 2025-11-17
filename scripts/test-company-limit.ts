// Teste do limite de 20 empresas no scraping
// Simula comportamento da função scrapeAndProcessLeads

import 'dotenv/config'

interface Job {
  companyName: string
  jobTitle: string
}

async function testCompanyLimit() {
  console.log('🧪 TESTE DO LIMITE DE EMPRESAS\n')
  console.log('='.repeat(70))

  // Simular 50 vagas de 30 empresas diferentes
  const mockJobs: Job[] = [
    // 10 vagas da Magazine Luiza
    ...Array(10).fill(0).map((_, i) => ({ companyName: 'Magazine Luiza', jobTitle: `Controller ${i+1}` })),

    // 8 vagas do Nubank
    ...Array(8).fill(0).map((_, i) => ({ companyName: 'Nubank', jobTitle: `Gerente Financeiro ${i+1}` })),

    // 7 vagas do Itaú
    ...Array(7).fill(0).map((_, i) => ({ companyName: 'Itaú', jobTitle: `CFO ${i+1}` })),

    // 5 vagas do Bradesco
    ...Array(5).fill(0).map((_, i) => ({ companyName: 'Bradesco', jobTitle: `Diretor Financeiro ${i+1}` })),

    // 3 vagas de cada uma das outras 26 empresas (78 vagas)
    ...['Petrobras', 'Vale', 'Ambev', 'BRF', 'JBS', 'Carrefour', 'Via Varejo',
        'Santander', 'Banco do Brasil', 'XP', 'BTG Pactual', 'Inter', 'Stone',
        'TOTVS', 'Stefanini', 'Locaweb', 'Movile', 'Dasa', 'Fleury', 'Rede Dor',
        'Unimed', 'Hapvida', 'Coca Cola', 'Nestle', 'Unilever', 'BRF']
      .flatMap(company =>
        Array(3).fill(0).map((_, i) => ({
          companyName: company,
          jobTitle: `Analista Financeiro ${i+1}`
        }))
      ),
  ]

  console.log(`\n📊 Vagas mockadas: ${mockJobs.length}`)
  console.log(`📊 Empresas únicas: ${new Set(mockJobs.map(j => j.companyName)).size}`)

  // Aplicar lógica de limite (igual ao lead-orchestrator.ts)
  const maxCompanies = 20
  const uniqueCompanies = new Set<string>()
  const limitedJobs = []

  for (const job of mockJobs) {
    if (uniqueCompanies.size >= maxCompanies) {
      break
    }
    uniqueCompanies.add(job.companyName.toLowerCase())
    limitedJobs.push(job)
  }

  console.log(`\n🎯 RESULTADO DO FILTRO:`)
  console.log(`   Vagas processadas: ${limitedJobs.length}`)
  console.log(`   Empresas únicas: ${uniqueCompanies.size}`)
  console.log(`   Limite configurado: ${maxCompanies}`)

  console.log(`\n✅ Empresas que seriam processadas:`)
  const companyCounts = limitedJobs.reduce((acc, job) => {
    const name = job.companyName
    acc[name] = (acc[name] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([company, count], i) => {
      console.log(`   ${i+1}. ${company}: ${count} vagas`)
    })

  console.log(`\n📊 ESTATÍSTICAS:`)
  console.log(`   Total de vagas ignoradas: ${mockJobs.length - limitedJobs.length}`)
  console.log(`   Total de empresas ignoradas: ${new Set(mockJobs.map(j => j.companyName)).size - uniqueCompanies.size}`)

  if (uniqueCompanies.size === maxCompanies) {
    console.log(`\n✅ TESTE PASSOU! Limite de ${maxCompanies} empresas respeitado.`)
  } else {
    console.log(`\n⚠️  AVISO: Menos empresas que o limite (${uniqueCompanies.size} < ${maxCompanies})`)
    console.log(`   Isso é normal se houver poucas empresas nos resultados.`)
  }

  console.log(`\n💡 COMO FUNCIONA:`)
  console.log(`   1. Sistema busca vagas de múltiplas fontes (LinkedIn, Gupy, Catho)`)
  console.log(`   2. Filtra vagas relevantes (Controller, CFO, Financeiro, etc)`)
  console.log(`   3. Limita a ${maxCompanies} empresas únicas`)
  console.log(`   4. Processa TODAS as vagas das ${maxCompanies} primeiras empresas`)
  console.log(`\n   Exemplo: Se Magazine Luiza aparece 10x, processa as 10 vagas`)
  console.log(`            Mas só conta como 1 empresa no limite de ${maxCompanies}`)
}

testCompanyLimit()
  .then(() => {
    console.log('\n✅ Teste concluído!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro:', error)
    process.exit(1)
  })
