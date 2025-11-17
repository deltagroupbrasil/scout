async function testApiLeads() {
  try {
    console.log('🔍 Testando API de leads...\n')

    // Simular chamada da API (sem autenticação, apenas para teste local)
    const response = await fetch('http://localhost:3000/api/leads?dateRange=30d')

    if (!response.ok) {
      console.error(`❌ Erro na API: ${response.status} ${response.statusText}`)
      const text = await response.text()
      console.error(text)
      return
    }

    const data = await response.json()

    console.log('📊 Resposta da API:')
    console.log(`   Total: ${data.total}`)
    console.log(`   Página: ${data.page}`)
    console.log(`   Page Size: ${data.pageSize}`)
    console.log(`   Total de páginas: ${data.totalPages}`)
    console.log(`   Leads retornados: ${data.data.length}\n`)

    if (data.data.length > 0) {
      console.log('📝 Leads retornados pela API:')
      data.data.forEach((lead: any, idx: number) => {
        console.log(`   ${idx + 1}. ${lead.company.name} - ${lead.jobTitle}`)
      })
    }

    // Verificar se total e data.length batem
    if (data.total !== data.data.length) {
      console.log(`\n⚠️  PROBLEMA ENCONTRADO!`)
      console.log(`   Total reportado: ${data.total}`)
      console.log(`   Leads retornados: ${data.data.length}`)
      console.log(`   Diferença: ${data.total - data.data.length}`)
    } else {
      console.log(`\n✅ Total e quantidade de leads batem!`)
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  }
}

testApiLeads()
