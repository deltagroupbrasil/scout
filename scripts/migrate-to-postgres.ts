/**
 * Script de Migração: SQLite → PostgreSQL
 *
 * Este script migra todos os dados do SQLite para PostgreSQL,
 * convertendo campos JSON de String para Json nativo.
 *
 * USO:
 * 1. Configure DATABASE_URL para PostgreSQL no .env
 * 2. Execute: npx tsx scripts/migrate-to-postgres.ts
 *
 * ATENÇÃO: Este script assume que:
 * - O schema PostgreSQL já foi criado (npx prisma db push)
 * - O banco PostgreSQL está vazio
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const SQLITE_PATH = path.join(__dirname, '..', 'prisma', 'dev.db')

// Verificar se SQLite existe
if (!fs.existsSync(SQLITE_PATH)) {
  console.error('❌ Arquivo SQLite não encontrado:', SQLITE_PATH)
  console.log('Nada para migrar. Começando com banco vazio.')
  process.exit(0)
}

// Cliente SQLite (temporário para leitura)
const sqlite = new PrismaClient({
  datasources: {
    db: {
      url: `file:${SQLITE_PATH}`
    }
  }
})

// Cliente PostgreSQL (do .env)
const postgres = new PrismaClient()

/**
 * Converte JSON string para objeto (com fallback seguro)
 */
function parseJsonField(field: string | null): any {
  if (!field) return null
  try {
    return JSON.parse(field)
  } catch (e) {
    console.warn('⚠️  Erro ao parsear JSON:', field)
    return null
  }
}

async function migrate() {
  console.log('🚀 Iniciando migração SQLite → PostgreSQL...\n')

  try {
    // Verificar conexão PostgreSQL
    await postgres.$connect()
    console.log('✅ Conectado ao PostgreSQL')

    // Verificar se PostgreSQL está vazio
    const existingUsers = await postgres.user.count()
    if (existingUsers > 0) {
      console.error('❌ PostgreSQL não está vazio! Já existem', existingUsers, 'usuários.')
      console.log('Execute "npx prisma migrate reset" para limpar o banco antes de migrar.')
      process.exit(1)
    }

    // 1. MIGRAR USERS
    console.log('\n📋 Migrando Users...')
    const users = await sqlite.user.findMany()
    let userCount = 0
    for (const user of users) {
      await postgres.user.create({ data: user })
      userCount++
      process.stdout.write(`\r   Migrados: ${userCount}/${users.length}`)
    }
    console.log(`\n✅ ${users.length} usuários migrados`)

    // 2. MIGRAR COMPANIES (convertendo JSON)
    console.log('\n🏢 Migrando Companies...')
    const companies = await sqlite.company.findMany()
    let companyCount = 0
    for (const company of companies) {
      const { recentNews, upcomingEvents, keyInsights, companyPhones, companyEmails, partners, ...rest } = company as any

      await postgres.company.create({
        data: {
          ...rest,
          // Converter String → Json
          recentNews: parseJsonField(recentNews),
          upcomingEvents: parseJsonField(upcomingEvents),
          keyInsights: parseJsonField(keyInsights),
          companyPhones: parseJsonField(companyPhones),
          companyEmails: parseJsonField(companyEmails),
          partners: parseJsonField(partners),
        }
      })
      companyCount++
      process.stdout.write(`\r   Migradas: ${companyCount}/${companies.length}`)
    }
    console.log(`\n✅ ${companies.length} empresas migradas`)

    // 3. MIGRAR LEADS (convertendo JSON)
    console.log('\n📊 Migrando Leads...')
    const leads = await sqlite.lead.findMany()
    let leadCount = 0
    for (const lead of leads) {
      const { relatedJobs, suggestedContacts, triggers, ...rest } = lead as any

      await postgres.lead.create({
        data: {
          ...rest,
          // Converter String → Json
          relatedJobs: parseJsonField(relatedJobs),
          suggestedContacts: parseJsonField(suggestedContacts),
          triggers: parseJsonField(triggers),
        }
      })
      leadCount++
      process.stdout.write(`\r   Migrados: ${leadCount}/${leads.length}`)
    }
    console.log(`\n✅ ${leads.length} leads migrados`)

    // 4. MIGRAR NOTES
    console.log('\n📝 Migrando Notes...')
    const notes = await sqlite.note.findMany()
    let noteCount = 0
    for (const note of notes) {
      await postgres.note.create({ data: note })
      noteCount++
      process.stdout.write(`\r   Migradas: ${noteCount}/${notes.length}`)
    }
    console.log(`\n✅ ${notes.length} notas migradas`)

    // 5. MIGRAR SCRAPE LOGS
    console.log('\n🔍 Migrando Scrape Logs...')
    const scrapeLogs = await sqlite.scrapeLog.findMany()
    let logCount = 0
    for (const log of scrapeLogs) {
      const { errors, ...rest } = log as any
      await postgres.scrapeLog.create({
        data: {
          ...rest,
          errors: parseJsonField(errors),
        }
      })
      logCount++
      process.stdout.write(`\r   Migrados: ${logCount}/${scrapeLogs.length}`)
    }
    console.log(`\n✅ ${scrapeLogs.length} scrape logs migrados`)

    // 6. MIGRAR ENRICHMENT CACHE
    console.log('\n💾 Migrando Enrichment Cache...')
    const enrichmentCache = await sqlite.enrichmentCache.findMany()
    let cacheCount = 0
    for (const cache of enrichmentCache) {
      await postgres.enrichmentCache.create({ data: cache })
      cacheCount++
      process.stdout.write(`\r   Migrados: ${cacheCount}/${enrichmentCache.length}`)
    }
    console.log(`\n✅ ${enrichmentCache.length} registros de cache migrados`)

    // 7. MIGRAR NOVA VIDA TI USAGE
    console.log('\n💰 Migrando Nova Vida TI Usage...')
    const novaVidaUsage = await sqlite.novaVidaTIUsage.findMany()
    let usageCount = 0
    for (const usage of novaVidaUsage) {
      await postgres.novaVidaTIUsage.create({ data: usage })
      usageCount++
      process.stdout.write(`\r   Migrados: ${usageCount}/${novaVidaUsage.length}`)
    }
    console.log(`\n✅ ${novaVidaUsage.length} registros de usage migrados`)

    // 8. MIGRAR CONTACT FEEDBACK
    console.log('\n👍 Migrando Contact Feedback...')
    const feedbacks = await sqlite.contactFeedback.findMany()
    let feedbackCount = 0
    for (const feedback of feedbacks) {
      await postgres.contactFeedback.create({ data: feedback })
      feedbackCount++
      process.stdout.write(`\r   Migrados: ${feedbackCount}/${feedbacks.length}`)
    }
    console.log(`\n✅ ${feedbacks.length} feedbacks migrados`)

    // RESUMO FINAL
    console.log('\n' + '='.repeat(50))
    console.log('✅ MIGRAÇÃO COMPLETA!')
    console.log('='.repeat(50))
    console.log(`📊 Total migrado:`)
    console.log(`   - Users: ${users.length}`)
    console.log(`   - Companies: ${companies.length}`)
    console.log(`   - Leads: ${leads.length}`)
    console.log(`   - Notes: ${notes.length}`)
    console.log(`   - Scrape Logs: ${scrapeLogs.length}`)
    console.log(`   - Enrichment Cache: ${enrichmentCache.length}`)
    console.log(`   - Nova Vida TI Usage: ${novaVidaUsage.length}`)
    console.log(`   - Contact Feedback: ${feedbacks.length}`)
    console.log('')
    console.log('🎉 Você pode agora usar o PostgreSQL!')
    console.log('')
    console.log('📝 Próximos passos:')
    console.log('   1. Verifique os dados: npx prisma studio')
    console.log('   2. Teste a aplicação: npm run dev')
    console.log('   3. (Opcional) Renomeie dev.db para dev.db.backup')

  } catch (error) {
    console.error('\n❌ Erro durante migração:', error)
    process.exit(1)
  } finally {
    await sqlite.$disconnect()
    await postgres.$disconnect()
  }
}

// Confirmação antes de executar
console.log('⚠️  ATENÇÃO: Este script irá migrar dados do SQLite para PostgreSQL')
console.log('')
console.log('Pré-requisitos:')
console.log('  1. ✅ DATABASE_URL configurado para PostgreSQL no .env')
console.log('  2. ✅ Schema PostgreSQL criado (npx prisma db push)')
console.log('  3. ✅ Banco PostgreSQL vazio')
console.log('')
console.log('Arquivos:')
console.log(`  - SQLite: ${SQLITE_PATH}`)
console.log(`  - PostgreSQL: ${process.env.DATABASE_URL || '(não configurado)'}`)
console.log('')
console.log('Iniciando em 3 segundos... (Ctrl+C para cancelar)')

setTimeout(() => {
  migrate()
}, 3000)
