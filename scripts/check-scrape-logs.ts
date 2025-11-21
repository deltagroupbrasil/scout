import { prisma } from '../lib/prisma'

async function checkScrapeLogs() {
  try {
    console.log('📜 HISTÓRICO DE EXECUÇÕES DO CRON JOB\n')

    const logs = await prisma.scrapeLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    if (logs.length === 0) {
      console.log('❌ Nenhuma execução encontrada')
      console.log('   O cron job ainda não rodou ou não está salvando logs.\n')
      return
    }

    console.log(`Total de execuções nos últimos registros: ${logs.length}\n`)

    logs.forEach((log, i) => {
      const date = new Date(log.createdAt)
      const status = log.status === 'success' ? '✅ SUCESSO' :
                     log.status === 'running' ? '⏳ RODANDO' :
                     '❌ ERRO'

      console.log(`${i + 1}. ${status}`)
      console.log(`   Data: ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR')}`)
      console.log(`   Query: ${log.query}`)
      console.log(`   Vagas encontradas: ${log.jobsFound}`)
      console.log(`   Leads criados: ${log.leadsCreated}`)
      console.log(`   Duração: ${log.duration ? log.duration + 's' : 'N/A'}`)

      if (log.errors) {
        const errors = typeof log.errors === 'string' ? JSON.parse(log.errors) : log.errors
        console.log(`   Erros: ${JSON.stringify(errors).substring(0, 100)}...`)
      }

      console.log('')
    })

    // Estatísticas gerais
    const successCount = logs.filter(l => l.status === 'success').length
    const totalLeadsCreated = logs.reduce((sum, l) => sum + (l.leadsCreated || 0), 0)
    const avgDuration = logs.filter(l => l.duration).reduce((sum, l) => sum + (l.duration || 0), 0) / logs.filter(l => l.duration).length

    console.log('📊 ESTATÍSTICAS:')
    console.log(`   Taxa de sucesso: ${successCount}/${logs.length} (${((successCount/logs.length)*100).toFixed(1)}%)`)
    console.log(`   Total de leads criados: ${totalLeadsCreated}`)
    console.log(`   Duração média: ${avgDuration ? avgDuration.toFixed(1) + 's' : 'N/A'}`)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkScrapeLogs()
