// Script para limpar TODOS os dados do banco (companies e leads)
import { prisma } from '../lib/prisma'

async function clearAllData() {
  console.log('🗑️  Limpando TODOS os dados do banco...\n')

  try {
    // Deletar tudo em ordem (respeita foreign keys)
    const deletedNotes = await prisma.note.deleteMany()
    console.log(`✅ ${deletedNotes.count} notas deletadas`)

    const deletedLeads = await prisma.lead.deleteMany()
    console.log(`✅ ${deletedLeads.count} leads deletados`)

    const deletedCompanies = await prisma.company.deleteMany()
    console.log(`✅ ${deletedCompanies.count} empresas deletadas`)

    const deletedCache = await prisma.enrichmentCache.deleteMany()
    console.log(`✅ ${deletedCache.count} caches de enriquecimento deletados`)

    const deletedLogs = await prisma.scrapeLog.deleteMany()
    console.log(`✅ ${deletedLogs.count} logs de scraping deletados`)

    console.log('\n🎉 Banco de dados limpo com sucesso!')
    console.log('\n💡 Próximo passo: Execute scraping para testar enriquecimento com IA')
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

clearAllData()
