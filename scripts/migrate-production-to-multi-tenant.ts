/**
 * Script de Migração para Multi-Tenancy em Produção (Neon PostgreSQL)
 *
 * ATENÇÃO: Este script faz alterações DIRETAS no banco de produção!
 *
 * O que este script faz:
 * 1. Cria as tabelas multi-tenant (Tenant, TenantUser, SuperAdmin, TenantSearchQuery)
 * 2. Cria o tenant "Leap Solutions"
 * 3. Configura admin@leapscout.com como SuperAdmin
 * 4. Migra todos os leads/notes/scrapelogs existentes para o tenant Leap
 * 5. Associa todos os usuários existentes ao tenant Leap
 */

import { Client } from 'pg'
import { v4 as uuid } from 'uuid'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_PL4yEHAcdvQ5@ep-calm-meadow-ady4ssjy-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'

// ID fixo para o tenant Leap (para referenciar em código)
const LEAP_TENANT_ID = 'leap-solutions-001'
const ADMIN_USER_EMAIL = 'admin@leapscout.com'

async function migrate() {
  const client = new Client({ connectionString: DATABASE_URL })

  try {
    await client.connect()
    console.log('=== MIGRACAO MULTI-TENANT - PRODUCAO ===\n')

    // ========================================
    // STEP 1: Criar tabelas multi-tenant
    // ========================================
    console.log('STEP 1: Criando tabelas multi-tenant...')

    // Criar enum TenantRole se não existir
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE "TenantRole" AS ENUM ('ADMIN', 'MANAGER', 'USER', 'VIEWER');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)
    console.log('  - Enum TenantRole OK')

    // Criar tabela Tenant
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Tenant" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL UNIQUE,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "plan" TEXT NOT NULL DEFAULT 'basic',
        "maxUsers" INTEGER NOT NULL DEFAULT 5,
        "maxSearchQueries" INTEGER NOT NULL DEFAULT 3,
        "enabledFeatures" JSONB NOT NULL DEFAULT '["dashboard"]'::jsonb,
        "billingEmail" TEXT,
        "contractStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "contractEnd" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "Tenant_slug_idx" ON "Tenant"("slug");
      CREATE INDEX IF NOT EXISTS "Tenant_isActive_idx" ON "Tenant"("isActive");
    `)
    console.log('  - Tabela Tenant OK')

    // Criar tabela TenantUser
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TenantUser" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "role" "TenantRole" NOT NULL DEFAULT 'VIEWER',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TenantUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "TenantUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "TenantUser_tenantId_userId_key" UNIQUE ("tenantId", "userId")
      );
      CREATE INDEX IF NOT EXISTS "TenantUser_userId_idx" ON "TenantUser"("userId");
      CREATE INDEX IF NOT EXISTS "TenantUser_tenantId_idx" ON "TenantUser"("tenantId");
    `)
    console.log('  - Tabela TenantUser OK')

    // Criar tabela SuperAdmin
    await client.query(`
      CREATE TABLE IF NOT EXISTS "SuperAdmin" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SuperAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `)
    console.log('  - Tabela SuperAdmin OK')

    // Criar tabela TenantSearchQuery
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TenantSearchQuery" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tenantId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "jobTitle" TEXT NOT NULL,
        "location" TEXT NOT NULL,
        "maxCompanies" INTEGER NOT NULL DEFAULT 20,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "isLocked" BOOLEAN NOT NULL DEFAULT true,
        "createdById" TEXT NOT NULL,
        "lastUsedAt" TIMESTAMP(3),
        "usageCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TenantSearchQuery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "TenantSearchQuery_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "TenantSearchQuery_tenantId_idx" ON "TenantSearchQuery"("tenantId");
      CREATE INDEX IF NOT EXISTS "TenantSearchQuery_isActive_idx" ON "TenantSearchQuery"("isActive");
      CREATE INDEX IF NOT EXISTS "TenantSearchQuery_createdById_idx" ON "TenantSearchQuery"("createdById");
      CREATE INDEX IF NOT EXISTS "TenantSearchQuery_lastUsedAt_idx" ON "TenantSearchQuery"("lastUsedAt");
      CREATE INDEX IF NOT EXISTS "TenantSearchQuery_tenantId_isActive_idx" ON "TenantSearchQuery"("tenantId", "isActive");
    `)
    console.log('  - Tabela TenantSearchQuery OK')

    // ========================================
    // STEP 2: Adicionar coluna tenantId às tabelas existentes (se não existir)
    // ========================================
    console.log('\nSTEP 2: Adicionando tenantId às tabelas...')

    // Lead - adicionar tenantId se não existir
    const leadColumns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'Lead' AND column_name = 'tenantId'
    `)
    if (leadColumns.rows.length === 0) {
      await client.query(`ALTER TABLE "Lead" ADD COLUMN "tenantId" TEXT`)
      console.log('  - Coluna tenantId adicionada em Lead')
    } else {
      console.log('  - Coluna tenantId já existe em Lead')
    }

    // Note - adicionar tenantId se não existir
    const noteColumns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'Note' AND column_name = 'tenantId'
    `)
    if (noteColumns.rows.length === 0) {
      await client.query(`ALTER TABLE "Note" ADD COLUMN "tenantId" TEXT`)
      console.log('  - Coluna tenantId adicionada em Note')
    } else {
      console.log('  - Coluna tenantId já existe em Note')
    }

    // ScrapeLog - adicionar tenantId se não existir
    const scrapeLogColumns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'ScrapeLog' AND column_name = 'tenantId'
    `)
    if (scrapeLogColumns.rows.length === 0) {
      await client.query(`ALTER TABLE "ScrapeLog" ADD COLUMN "tenantId" TEXT`)
      console.log('  - Coluna tenantId adicionada em ScrapeLog')
    } else {
      console.log('  - Coluna tenantId já existe em ScrapeLog')
    }

    // User - adicionar lastActiveTenantId se não existir
    const userColumns = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'lastActiveTenantId'
    `)
    if (userColumns.rows.length === 0) {
      await client.query(`ALTER TABLE "User" ADD COLUMN "lastActiveTenantId" TEXT`)
      console.log('  - Coluna lastActiveTenantId adicionada em User')
    } else {
      console.log('  - Coluna lastActiveTenantId já existe em User')
    }

    // ========================================
    // STEP 3: Criar tenant Leap Solutions
    // ========================================
    console.log('\nSTEP 3: Criando tenant Leap Solutions...')

    const existingTenant = await client.query(`SELECT id FROM "Tenant" WHERE slug = 'leap-solutions'`)
    let tenantId: string

    if (existingTenant.rows.length === 0) {
      tenantId = LEAP_TENANT_ID
      await client.query(`
        INSERT INTO "Tenant" (id, name, slug, "isActive", plan, "maxUsers", "maxSearchQueries", "enabledFeatures", "billingEmail", "contractStart")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        tenantId,
        'Leap Solutions',
        'leap-solutions',
        true,
        'enterprise',
        50,
        100,
        JSON.stringify(['dashboard', 'kanban', 'search']), // Todas as features habilitadas
        'admin@leapscout.com',
        new Date().toISOString()
      ])
      console.log(`  - Tenant criado: Leap Solutions (${tenantId})`)
    } else {
      tenantId = existingTenant.rows[0].id
      console.log(`  - Tenant já existe: Leap Solutions (${tenantId})`)
    }

    // ========================================
    // STEP 4: Configurar SuperAdmin
    // ========================================
    console.log('\nSTEP 4: Configurando SuperAdmin...')

    const adminUser = await client.query(`SELECT id FROM "User" WHERE email = $1`, [ADMIN_USER_EMAIL])

    if (adminUser.rows.length > 0) {
      const adminUserId = adminUser.rows[0].id

      // Criar SuperAdmin
      const existingSuperAdmin = await client.query(`SELECT id FROM "SuperAdmin" WHERE "userId" = $1`, [adminUserId])
      if (existingSuperAdmin.rows.length === 0) {
        await client.query(`
          INSERT INTO "SuperAdmin" (id, "userId")
          VALUES ($1, $2)
        `, [uuid(), adminUserId])
        console.log(`  - SuperAdmin criado: ${ADMIN_USER_EMAIL}`)
      } else {
        console.log(`  - SuperAdmin já existe: ${ADMIN_USER_EMAIL}`)
      }

      // Associar ao tenant como ADMIN
      const existingTenantUser = await client.query(`
        SELECT id FROM "TenantUser" WHERE "tenantId" = $1 AND "userId" = $2
      `, [tenantId, adminUserId])

      if (existingTenantUser.rows.length === 0) {
        await client.query(`
          INSERT INTO "TenantUser" (id, "tenantId", "userId", role, "isActive")
          VALUES ($1, $2, $3, $4, $5)
        `, [uuid(), tenantId, adminUserId, 'ADMIN', true])
        console.log(`  - TenantUser criado: ${ADMIN_USER_EMAIL} -> Leap Solutions (ADMIN)`)
      } else {
        console.log(`  - TenantUser já existe: ${ADMIN_USER_EMAIL} -> Leap Solutions`)
      }

      // Atualizar lastActiveTenantId
      await client.query(`UPDATE "User" SET "lastActiveTenantId" = $1 WHERE id = $2`, [tenantId, adminUserId])
    } else {
      console.log(`  - AVISO: Usuario ${ADMIN_USER_EMAIL} nao encontrado!`)
    }

    // ========================================
    // STEP 5: Associar todos os outros usuários ao tenant
    // ========================================
    console.log('\nSTEP 5: Associando usuários ao tenant...')

    const allUsers = await client.query(`SELECT id, email FROM "User"`)
    for (const user of allUsers.rows) {
      const existing = await client.query(`
        SELECT id FROM "TenantUser" WHERE "tenantId" = $1 AND "userId" = $2
      `, [tenantId, user.id])

      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO "TenantUser" (id, "tenantId", "userId", role, "isActive")
          VALUES ($1, $2, $3, $4, $5)
        `, [uuid(), tenantId, user.id, 'USER', true])
        console.log(`  - ${user.email} -> Leap Solutions (USER)`)
      }

      // Atualizar lastActiveTenantId para todos
      await client.query(`UPDATE "User" SET "lastActiveTenantId" = $1 WHERE id = $2`, [tenantId, user.id])
    }

    // ========================================
    // STEP 6: Migrar leads para o tenant
    // ========================================
    console.log('\nSTEP 6: Migrando leads para o tenant...')

    const leadsWithoutTenant = await client.query(`
      SELECT COUNT(*) as count FROM "Lead" WHERE "tenantId" IS NULL OR "tenantId" = ''
    `)
    const leadsCount = parseInt(leadsWithoutTenant.rows[0].count)

    if (leadsCount > 0) {
      await client.query(`
        UPDATE "Lead" SET "tenantId" = $1 WHERE "tenantId" IS NULL OR "tenantId" = ''
      `, [tenantId])
      console.log(`  - ${leadsCount} leads migrados para Leap Solutions`)
    } else {
      console.log('  - Nenhum lead para migrar')
    }

    // ========================================
    // STEP 7: Migrar notes para o tenant
    // ========================================
    console.log('\nSTEP 7: Migrando notes para o tenant...')

    const notesWithoutTenant = await client.query(`
      SELECT COUNT(*) as count FROM "Note" WHERE "tenantId" IS NULL OR "tenantId" = ''
    `)
    const notesCount = parseInt(notesWithoutTenant.rows[0].count)

    if (notesCount > 0) {
      await client.query(`
        UPDATE "Note" SET "tenantId" = $1 WHERE "tenantId" IS NULL OR "tenantId" = ''
      `, [tenantId])
      console.log(`  - ${notesCount} notes migrados para Leap Solutions`)
    } else {
      console.log('  - Nenhum note para migrar')
    }

    // ========================================
    // STEP 8: Migrar scrapelogs para o tenant
    // ========================================
    console.log('\nSTEP 8: Migrando scrape logs para o tenant...')

    const logsWithoutTenant = await client.query(`
      SELECT COUNT(*) as count FROM "ScrapeLog" WHERE "tenantId" IS NULL OR "tenantId" = ''
    `)
    const logsCount = parseInt(logsWithoutTenant.rows[0].count)

    if (logsCount > 0) {
      await client.query(`
        UPDATE "ScrapeLog" SET "tenantId" = $1 WHERE "tenantId" IS NULL OR "tenantId" = ''
      `, [tenantId])
      console.log(`  - ${logsCount} scrape logs migrados para Leap Solutions`)
    } else {
      console.log('  - Nenhum scrape log para migrar')
    }

    // ========================================
    // STEP 9: Criar indices multi-tenant em Lead
    // ========================================
    console.log('\nSTEP 9: Criando indices multi-tenant...')

    await client.query(`CREATE INDEX IF NOT EXISTS "Lead_tenantId_idx" ON "Lead"("tenantId")`)
    await client.query(`CREATE INDEX IF NOT EXISTS "Lead_tenantId_status_idx" ON "Lead"("tenantId", "status")`)
    await client.query(`CREATE INDEX IF NOT EXISTS "Lead_tenantId_createdAt_idx" ON "Lead"("tenantId", "createdAt")`)
    await client.query(`CREATE INDEX IF NOT EXISTS "Note_tenantId_idx" ON "Note"("tenantId")`)
    await client.query(`CREATE INDEX IF NOT EXISTS "ScrapeLog_tenantId_idx" ON "ScrapeLog"("tenantId")`)
    console.log('  - Indices criados')

    // ========================================
    // STEP 10: Adicionar foreign keys (após dados migrados)
    // ========================================
    console.log('\nSTEP 10: Adicionando foreign keys...')

    // Verificar se FK já existe antes de adicionar
    try {
      await client.query(`
        ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `)
      console.log('  - FK Lead.tenantId -> Tenant.id OK')
    } catch (e: any) {
      if (e.code === '42710') {
        console.log('  - FK Lead.tenantId já existe')
      } else {
        console.log('  - FK Lead.tenantId erro:', e.message)
      }
    }

    try {
      await client.query(`
        ALTER TABLE "Note" ADD CONSTRAINT "Note_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
      `)
      console.log('  - FK Note.tenantId -> Tenant.id OK')
    } catch (e: any) {
      if (e.code === '42710') {
        console.log('  - FK Note.tenantId já existe')
      } else {
        console.log('  - FK Note.tenantId erro:', e.message)
      }
    }

    try {
      await client.query(`
        ALTER TABLE "ScrapeLog" ADD CONSTRAINT "ScrapeLog_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE
      `)
      console.log('  - FK ScrapeLog.tenantId -> Tenant.id OK')
    } catch (e: any) {
      if (e.code === '42710') {
        console.log('  - FK ScrapeLog.tenantId já existe')
      } else {
        console.log('  - FK ScrapeLog.tenantId erro:', e.message)
      }
    }

    // ========================================
    // STEP 11: Criar query de busca padrão
    // ========================================
    console.log('\nSTEP 11: Criando search queries padrão...')

    const adminUserForQuery = await client.query(`SELECT id FROM "User" WHERE email = $1`, [ADMIN_USER_EMAIL])
    if (adminUserForQuery.rows.length > 0) {
      const adminId = adminUserForQuery.rows[0].id

      const existingQuery = await client.query(`
        SELECT id FROM "TenantSearchQuery" WHERE "tenantId" = $1 AND "jobTitle" = 'Controller'
      `, [tenantId])

      if (existingQuery.rows.length === 0) {
        await client.query(`
          INSERT INTO "TenantSearchQuery" (id, "tenantId", name, "jobTitle", location, "maxCompanies", "isActive", "isLocked", "createdById")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [uuid(), tenantId, 'Controllers SP', 'Controller OR CFO OR Controladoria', 'São Paulo', 20, true, true, adminId])
        console.log('  - Query "Controllers SP" criada')
      } else {
        console.log('  - Query "Controllers SP" já existe')
      }
    }

    // ========================================
    // RESUMO FINAL
    // ========================================
    console.log('\n=== MIGRACAO CONCLUIDA ===\n')

    const finalCounts = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM "Tenant") as tenants,
        (SELECT COUNT(*) FROM "TenantUser") as tenant_users,
        (SELECT COUNT(*) FROM "SuperAdmin") as super_admins,
        (SELECT COUNT(*) FROM "Lead" WHERE "tenantId" IS NOT NULL) as leads_with_tenant,
        (SELECT COUNT(*) FROM "Lead" WHERE "tenantId" IS NULL) as leads_without_tenant,
        (SELECT COUNT(*) FROM "TenantSearchQuery") as search_queries
    `)

    console.log('ESTADO FINAL:')
    console.log(`  Tenants: ${finalCounts.rows[0].tenants}`)
    console.log(`  TenantUsers: ${finalCounts.rows[0].tenant_users}`)
    console.log(`  SuperAdmins: ${finalCounts.rows[0].super_admins}`)
    console.log(`  Leads com tenant: ${finalCounts.rows[0].leads_with_tenant}`)
    console.log(`  Leads sem tenant: ${finalCounts.rows[0].leads_without_tenant}`)
    console.log(`  Search Queries: ${finalCounts.rows[0].search_queries}`)

    console.log('\nPROXIMOS PASSOS:')
    console.log('1. Fazer deploy do codigo novo no Vercel')
    console.log('2. Testar login em https://leapscout.vercel.app')
    console.log(`3. Credenciais: ${ADMIN_USER_EMAIL} / (senha existente)`)

    await client.end()

  } catch (error) {
    console.error('\n=== ERRO NA MIGRACAO ===')
    console.error(error)
    await client.end()
    process.exit(1)
  }
}

migrate()
