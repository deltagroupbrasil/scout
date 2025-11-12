// Script para limpar todos os leads e companies do banco de dados
import { prisma } from '../lib/prisma'

async function clearDatabase() {
  console.log('🗑️  Limpando banco de dados...')

  try {
    // Deletar todas as notas primeiro (foreign key)
    const deletedNotes = await prisma.note.deleteMany({})
    console.log(`✅ ${deletedNotes.count} notas deletadas`)

    // Deletar todos os leads
    const deletedLeads = await prisma.lead.deleteMany({})
    console.log(`✅ ${deletedLeads.count} leads deletados`)

    // Deletar todas as empresas
    const deletedCompanies = await prisma.company.deleteMany({})
    console.log(`✅ ${deletedCompanies.count} empresas deletadas`)

    // Deletar logs de scraping
    const deletedLogs = await prisma.scrapeLog.deleteMany({})
    console.log(`✅ ${deletedLogs.count} logs de scraping deletados`)

    console.log('✅ Banco de dados limpo com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao limpar banco de dados:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

clearDatabase()
