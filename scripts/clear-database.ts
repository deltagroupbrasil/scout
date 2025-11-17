/**
 * Script para limpar o banco de dados
 * Remove todos os leads, companies e logs
 */

import { prisma } from '@/lib/prisma'

async function clearDatabase() {
  console.log('='.repeat(60))
  console.log('🗑️  LIMPANDO BANCO DE DADOS')
  console.log('='.repeat(60))

  try {
    console.log('\n📋 Verificando dados atuais...')

    const counts = await Promise.all([
      prisma.lead.count(),
      prisma.company.count(),
      prisma.note.count(),
      prisma.scrapeLog.count(),
      prisma.novaVidaTIUsage.count()
    ])

    console.log(`\n📊 Dados atuais:`)
    console.log(`   Leads: ${counts[0]}`)
    console.log(`   Companies: ${counts[1]}`)
    console.log(`   Notes: ${counts[2]}`)
    console.log(`   Scrape Logs: ${counts[3]}`)
    console.log(`   NovaVida Usage: ${counts[4]}`)

    if (counts.every(c => c === 0)) {
      console.log('\n✅ Banco já está limpo!')
      return
    }

    console.log('\n🗑️  Removendo dados...')

    // Remover na ordem correta (dependências primeiro)
    console.log('   Removendo notes...')
    await prisma.note.deleteMany()

    console.log('   Removendo leads...')
    await prisma.lead.deleteMany()

    console.log('   Removendo companies...')
    await prisma.company.deleteMany()

    console.log('   Removendo scrape logs...')
    await prisma.scrapeLog.deleteMany()

    console.log('   Removendo NovaVida usage...')
    await prisma.novaVidaTIUsage.deleteMany()

    console.log('\n✅ Banco de dados limpo com sucesso!')

    console.log('\n📊 Verificando...')
    const newCounts = await Promise.all([
      prisma.lead.count(),
      prisma.company.count(),
      prisma.note.count(),
      prisma.scrapeLog.count(),
      prisma.novaVidaTIUsage.count()
    ])

    console.log(`   Leads: ${newCounts[0]}`)
    console.log(`   Companies: ${newCounts[1]}`)
    console.log(`   Notes: ${newCounts[2]}`)
    console.log(`   Scrape Logs: ${newCounts[3]}`)
    console.log(`   NovaVida Usage: ${newCounts[4]}`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ LIMPEZA CONCLUÍDA')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ Erro ao limpar banco:', error)
    throw error
  }
}

clearDatabase()
  .then(() => {
    console.log('\n✅ Script finalizado')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Erro fatal:', error)
    process.exit(1)
  })
