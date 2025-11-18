/**
 * Check production database data
 * Verifica quantos leads, companies, etc existem em produção
 */

import { Client } from 'pg'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.production') })

async function checkData() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })

  try {
    await client.connect()
    console.log('✅ Conectado ao banco de produção!\n')

    // Count users
    const users = await client.query('SELECT COUNT(*) FROM "User"')
    console.log(`👥 Usuários: ${users.rows[0].count}`)

    // Count companies
    const companies = await client.query('SELECT COUNT(*) FROM "Company"')
    console.log(`🏢 Empresas: ${companies.rows[0].count}`)

    // Count leads
    const leads = await client.query('SELECT COUNT(*) FROM "Lead"')
    console.log(`📋 Leads: ${leads.rows[0].count}`)

    // Count by status
    const leadsByStatus = await client.query(`
      SELECT status, COUNT(*) as count
      FROM "Lead"
      GROUP BY status
      ORDER BY count DESC
    `)

    if (leadsByStatus.rows.length > 0) {
      console.log('\n📊 Leads por status:')
      leadsByStatus.rows.forEach(row => {
        console.log(`   ${row.status}: ${row.count}`)
      })
    }

    // Count notes
    const notes = await client.query('SELECT COUNT(*) FROM "Note"')
    console.log(`\n📝 Notas: ${notes.rows[0].count}`)

    // Count scrape logs
    const scrapeLogs = await client.query('SELECT COUNT(*) FROM "ScrapeLog"')
    console.log(`🔍 Logs de Scraping: ${scrapeLogs.rows[0].count}`)

    // Recent scrape logs
    const recentScrapes = await client.query(`
      SELECT status, "leadsCreated", "createdAt"
      FROM "ScrapeLog"
      ORDER BY "createdAt" DESC
      LIMIT 5
    `)

    if (recentScrapes.rows.length > 0) {
      console.log('\n📅 Últimas execuções de scraping:')
      recentScrapes.rows.forEach(row => {
        console.log(`   ${row.createdAt.toISOString().split('T')[0]} - ${row.status} - ${row.leadsCreated} leads`)
      })
    }

    await client.end()
    console.log('\n✅ Verificação concluída!')

  } catch (error) {
    console.error('❌ ERRO:', error)
    await client.end()
    process.exit(1)
  }
}

checkData()
