/**
 * Setup Production Database - Simplified
 *
 * Roda migrations e cria usuário usando apenas SQL direto
 */

import { Client } from 'pg'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Carregar .env.production
dotenv.config({ path: resolve(process.cwd(), '.env.production') })

async function setupProduction() {
  const DATABASE_URL = process.env.DATABASE_URL

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL não encontrada!')
    console.error('Execute: DATABASE_URL="..." npx tsx scripts/setup-prod-simple.ts\n')
    process.exit(1)
  }

  console.log('🚀 LeapScout - Setup Production Database')
  console.log('==========================================\n')
  console.log('✅ DATABASE_URL configurada')
  console.log(`📍 Host: ${new URL(DATABASE_URL).host}\n`)

  const client = new Client({ connectionString: DATABASE_URL })

  try {
    await client.connect()
    console.log('✅ Conectado ao banco!\n')

    // 1. Verificar se as tabelas já existem
    console.log('1️⃣ Verificando tabelas...')
    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `)

    if (tablesResult.rows.length === 0) {
      console.log('   ❌ Nenhuma tabela encontrada!')
      console.log('   ⚠️  Execute as migrations primeiro:')
      console.log('   DATABASE_URL="..." npx prisma migrate deploy\n')
      await client.end()
      process.exit(1)
    }

    console.log(`   ✅ ${tablesResult.rows.length} tabelas encontradas`)
    tablesResult.rows.forEach(row => console.log(`      - ${row.tablename}`))
    console.log('')

    // 2. Verificar se usuário admin já existe
    console.log('2️⃣ Verificando usuário admin...')
    const userResult = await client.query(`
      SELECT id, email, name, role FROM "User" WHERE email = 'admin@leapscout.com'
    `)

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0]
      console.log('   ✅ Usuário admin já existe!')
      console.log(`      Email: ${user.email}`)
      console.log(`      Nome: ${user.name}`)
      console.log(`      Role: ${user.role}\n`)
    } else {
      console.log('   📝 Criando usuário admin...')
      await client.query(`
        INSERT INTO "User" (
          id, email, password, name, role, "createdAt", "updatedAt", "isActive"
        ) VALUES (
          'admin-001',
          'admin@leapscout.com',
          '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa',
          'Admin',
          'admin',
          NOW(),
          NOW(),
          true
        )
      `)
      console.log('   ✅ Usuário admin criado!\n')
    }

    // 3. Verificar dados
    console.log('3️⃣ Verificando dados...')
    const statsResult = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM "User") as users,
        (SELECT COUNT(*) FROM "Company") as companies,
        (SELECT COUNT(*) FROM "Lead") as leads
    `)
    const stats = statsResult.rows[0]
    console.log(`   📊 Usuários: ${stats.users}`)
    console.log(`   📊 Empresas: ${stats.companies}`)
    console.log(`   📊 Leads: ${stats.leads}\n`)

    console.log('🎉 SETUP CONCLUÍDO!')
    console.log('==========================================\n')
    console.log('📱 Próximos passos:')
    console.log('1. Acesse sua aplicação no Vercel')
    console.log('2. Login com:')
    console.log('   Email: admin@leapscout.com')
    console.log('   Senha: LeapScout2025!\n')

    await client.end()

  } catch (error) {
    console.error('\n❌ ERRO:', error)
    await client.end()
    process.exit(1)
  }
}

setupProduction()
