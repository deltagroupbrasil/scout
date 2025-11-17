/**
 * Script CLI: Deduplicação de Empresas
 *
 * Encontra e resolve duplicatas automaticamente
 *
 * USO:
 * npx tsx scripts/deduplicate-companies.ts [opções]
 *
 * Opções:
 * --dry-run         Apenas mostra duplicatas sem mesclar
 * --threshold=85    Score mínimo (padrão: 85)
 * --auto            Resolve automaticamente (alta confiança)
 * --confidence=high Confiança mínima para auto-resolve (high|medium)
 */

import { companyDeduplicator } from '../lib/services/company-deduplicator'
import { prisma } from '../lib/prisma'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const auto = args.includes('--auto')
const thresholdArg = args.find(arg => arg.startsWith('--threshold='))
const confidenceArg = args.find(arg => arg.startsWith('--confidence='))

const threshold = thresholdArg ? parseInt(thresholdArg.split('=')[1]) : 85
const minConfidence = (confidenceArg?.split('=')[1] || 'high') as 'high' | 'medium'

async function main() {
  console.log('🔍 Deduplicação de Empresas\n')
  console.log('='.repeat(70))
  console.log(`Configuração:`)
  console.log(`  - Threshold: ${threshold}`)
  console.log(`  - Dry Run: ${dryRun ? 'Sim' : 'Não'}`)
  console.log(`  - Auto-resolve: ${auto ? 'Sim' : 'Não'}`)
  if (auto) {
    console.log(`  - Confiança mínima: ${minConfidence}`)
  }
  console.log('='.repeat(70))

  // Buscar total de empresas
  const totalCompanies = await prisma.company.count()
  console.log(`\n📊 Total de empresas no banco: ${totalCompanies}`)

  // 1. Encontrar duplicatas
  console.log(`\n🔎 Buscando duplicatas (threshold: ${threshold})...\n`)

  const duplicates = await companyDeduplicator.findAllDuplicates(threshold)

  if (duplicates.size === 0) {
    console.log('✅ Nenhuma duplicata encontrada!')
    return
  }

  console.log(`⚠️  Encontradas ${duplicates.size} empresas com possíveis duplicatas:\n`)

  // Mostrar duplicatas
  let groupNumber = 1
  for (const [companyId, dups] of duplicates) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, cnpj: true },
    })

    if (!company) continue

    console.log(`${groupNumber}. ${company.name} (${company.cnpj || 'sem CNPJ'})`)
    console.log(`   ID: ${companyId}`)
    console.log(`   Duplicatas encontradas: ${dups.length}\n`)

    for (const dup of dups) {
      const confidenceIcon = dup.confidence === 'high' ? '🔴' : dup.confidence === 'medium' ? '🟡' : '🔵'
      console.log(`   ${confidenceIcon} ${dup.companyName} (Score: ${dup.score}%)`)
      console.log(`      ID: ${dup.companyId}`)
      console.log(`      Razões: ${dup.reason.join(', ')}`)
      console.log(`      Confiança: ${dup.confidence}`)
      console.log('')
    }

    groupNumber++
  }

  // 2. Resolver automaticamente ou dry-run
  if (auto && !dryRun) {
    console.log('='.repeat(70))
    console.log(`\n🤖 Resolvendo automaticamente (confiança: ${minConfidence})...\n`)

    const results = await companyDeduplicator.autoResolveDuplicates(minConfidence)

    if (results.length === 0) {
      console.log('ℹ️  Nenhuma duplicata com confiança suficiente para resolver automaticamente')
    } else {
      const totalMerged = results.reduce((sum, r) => sum + r.mergedIds.length, 0)
      const totalLeads = results.reduce((sum, r) => sum + r.leadsTransferred, 0)

      console.log(`✅ Resolução completa!`)
      console.log(`   - Empresas mescladas: ${totalMerged}`)
      console.log(`   - Leads transferidos: ${totalLeads}`)
      console.log(`   - Grupos processados: ${results.length}`)

      console.log('\nDetalhes:\n')
      for (const result of results) {
        console.log(`  📦 Grupo mesclado:`)
        console.log(`     Primary: ${result.primaryId}`)
        console.log(`     Merged: ${result.mergedIds.join(', ')}`)
        console.log(`     Leads: ${result.leadsTransferred}`)
        console.log('')
      }
    }
  } else if (dryRun) {
    console.log('='.repeat(70))
    console.log('\nℹ️  Modo Dry-Run: Nenhuma alteração foi feita no banco de dados')
    console.log('\nPara resolver duplicatas automaticamente, execute:')
    console.log('  npx tsx scripts/deduplicate-companies.ts --auto')
    console.log('\nOu use a API:')
    console.log('  POST /api/companies/duplicates/auto-resolve')
  } else {
    console.log('='.repeat(70))
    console.log('\nℹ️  Para resolver duplicatas automaticamente, execute:')
    console.log('  npx tsx scripts/deduplicate-companies.ts --auto')
    console.log('\nOu use a API para mesclagem manual:')
    console.log('  POST /api/companies/duplicates/merge')
    console.log('  { "primaryId": "...", "duplicateIds": ["..."] }')
  }

  console.log('')
}

main()
  .catch(error => {
    console.error('❌ Erro:', error)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
