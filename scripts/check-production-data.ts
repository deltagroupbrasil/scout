/**
 * Check production database data - MULTI-TENANT VERSION
 * Verifica estado atual do banco para migração multi-tenant
 */

import { Client } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_PL4yEHAcdvQ5@ep-calm-meadow-ady4ssjy-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'

async function checkData() {
  const client = new Client({ connectionString: DATABASE_URL })

  try {
    await client.connect()
    console.log('=== VERIFICACAO DE DADOS EM PRODUCAO (Neon PostgreSQL) ===\n')

    // Count all tables
    const users = await client.query('SELECT COUNT(*) FROM "User"')
    const companies = await client.query('SELECT COUNT(*) FROM "Company"')
    const leads = await client.query('SELECT COUNT(*) FROM "Lead"')
    const notes = await client.query('SELECT COUNT(*) FROM "Note"')
    const scrapeLogs = await client.query('SELECT COUNT(*) FROM "ScrapeLog"')

    console.log('CONTAGEM DE REGISTROS:')
    console.log('  Users:', users.rows[0].count)
    console.log('  Companies:', companies.rows[0].count)
    console.log('  Leads:', leads.rows[0].count)
    console.log('  Notes:', notes.rows[0].count)
    console.log('  ScrapeLogs:', scrapeLogs.rows[0].count)

    // Check if multi-tenant tables exist and count
    try {
      const tenants = await client.query('SELECT COUNT(*) FROM "Tenant"')
      const tenantUsers = await client.query('SELECT COUNT(*) FROM "TenantUser"')
      const superAdmins = await client.query('SELECT COUNT(*) FROM "SuperAdmin"')
      const searchQueries = await client.query('SELECT COUNT(*) FROM "TenantSearchQuery"')

      console.log('  Tenants:', tenants.rows[0].count)
      console.log('  TenantUsers:', tenantUsers.rows[0].count)
      console.log('  SuperAdmins:', superAdmins.rows[0].count)
      console.log('  TenantSearchQueries:', searchQueries.rows[0].count)
    } catch (e) {
      console.log('\n  AVISO: Tabelas multi-tenant ainda nao existem!')
    }

    // List all users
    console.log('\n--- USUARIOS ---')
    const allUsers = await client.query('SELECT id, email, name FROM "User"')
    allUsers.rows.forEach(u => console.log(`  - ${u.email} (${u.name}) [${u.id}]`))

    // Check tenants
    try {
      console.log('\n--- TENANTS ---')
      const allTenants = await client.query('SELECT id, name, slug, "enabledFeatures" FROM "Tenant"')
      if (allTenants.rows.length === 0) {
        console.log('  (nenhum tenant criado)')
      } else {
        allTenants.rows.forEach(t => console.log(`  - ${t.name} (slug: ${t.slug}) [${t.id}]`))
      }

      // Check TenantUser associations
      console.log('\n--- ASSOCIACOES TENANT-USER ---')
      const allTenantUsers = await client.query(`
        SELECT tu.role, u.email, t.name as tenant_name
        FROM "TenantUser" tu
        JOIN "User" u ON tu."userId" = u.id
        JOIN "Tenant" t ON tu."tenantId" = t.id
      `)
      if (allTenantUsers.rows.length === 0) {
        console.log('  (nenhuma associacao)')
      } else {
        allTenantUsers.rows.forEach(tu => console.log(`  - ${tu.email} -> ${tu.tenant_name} (role: ${tu.role})`))
      }

      // Check SuperAdmins
      console.log('\n--- SUPER ADMINS ---')
      const allSuperAdmins = await client.query(`
        SELECT u.email, u.name
        FROM "SuperAdmin" sa
        JOIN "User" u ON sa."userId" = u.id
      `)
      if (allSuperAdmins.rows.length === 0) {
        console.log('  (nenhum super admin)')
      } else {
        allSuperAdmins.rows.forEach(sa => console.log(`  - ${sa.email} (${sa.name})`))
      }

      // Check leads by tenant
      console.log('\n--- LEADS POR TENANT ---')
      const leadsByTenant = await client.query(`
        SELECT l."tenantId", t.name as tenant_name, COUNT(*) as count
        FROM "Lead" l
        LEFT JOIN "Tenant" t ON l."tenantId" = t.id
        GROUP BY l."tenantId", t.name
        ORDER BY count DESC
      `)
      leadsByTenant.rows.forEach(l => {
        const tenantName = l.tenant_name || 'SEM TENANT / TENANT INVALIDO'
        console.log(`  - ${tenantName}: ${l.count} leads`)
      })

    } catch (e) {
      console.log('  (tabelas multi-tenant nao existem)')
    }

    // Check leads by status
    console.log('\n--- LEADS POR STATUS ---')
    const leadsByStatus = await client.query(`
      SELECT status, COUNT(*) as count
      FROM "Lead"
      GROUP BY status
      ORDER BY count DESC
    `)
    leadsByStatus.rows.forEach(row => {
      console.log(`  - ${row.status}: ${row.count}`)
    })

    // Recent scrape logs
    console.log('\n--- ULTIMOS SCRAPES ---')
    const recentScrapes = await client.query(`
      SELECT status, "leadsCreated", "createdAt", query
      FROM "ScrapeLog"
      ORDER BY "createdAt" DESC
      LIMIT 5
    `)
    recentScrapes.rows.forEach(row => {
      const date = row.createdAt.toISOString().split('T')[0]
      console.log(`  - ${date} | ${row.status} | ${row.leadsCreated} leads | "${row.query}"`)
    })

    await client.end()
    console.log('\n=== FIM DA VERIFICACAO ===')

  } catch (error) {
    console.error('ERRO:', error)
    await client.end()
    process.exit(1)
  }
}

checkData()
