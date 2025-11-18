/**
 * Check Production Database Status
 *
 * Verifica se o banco de produção está configurado corretamente
 */

import { PrismaClient } from '@prisma/client'

async function checkProductionDatabase() {
  console.log('🔍 LeapScout - Verificando Banco de Produção')
  console.log('==============================================\n')

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não encontrada!')
    console.error('Execute: DATABASE_URL="..." npx tsx scripts/check-production-db.ts\n')
    process.exit(1)
  }

  console.log('✅ DATABASE_URL configurada')
  console.log(`📍 Host: ${new URL(process.env.DATABASE_URL).host}\n`)

  const prisma = new PrismaClient()

  try {
    // 1. Verificar conexão
    console.log('1️⃣ Testando conexão...')
    await prisma.$connect()
    console.log('   ✅ Conexão estabelecida!\n')

    // 2. Verificar tabelas
    console.log('2️⃣ Verificando tabelas...')
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `

    if (tables.length === 0) {
      console.log('   ❌ NENHUMA TABELA encontrada!')
      console.log('   ⚠️  AÇÃO: Execute o script de setup:')
      console.log('   npm run setup:prod\n')
      await prisma.$disconnect()
      process.exit(1)
    }

    console.log(`   ✅ ${tables.length} tabelas encontradas:`)
    tables.forEach(t => console.log(`      - ${t.tablename}`))
    console.log('')

    // 3. Verificar usuários
    console.log('3️⃣ Verificando usuários...')
    const userCount = await prisma.user.count()

    if (userCount === 0) {
      console.log('   ❌ NENHUM USUÁRIO encontrado!')
      console.log('   ⚠️  AÇÃO: Execute o script de setup:')
      console.log('   npm run setup:prod\n')
      await prisma.$disconnect()
      process.exit(1)
    }

    console.log(`   ✅ ${userCount} usuário(s) encontrado(s)`)

    const adminUser = await prisma.user.findFirst({
      where: { email: 'admin@leapscout.com' }
    })

    if (adminUser) {
      console.log('   ✅ Usuário admin existe!')
      console.log(`      Email: ${adminUser.email}`)
      console.log(`      Nome: ${adminUser.name}`)
      console.log(`      Role: ${adminUser.role}\n`)
    } else {
      console.log('   ⚠️  Usuário admin NÃO encontrado')
      console.log('   Outros usuários existem, mas não o admin padrão\n')
    }

    // 4. Verificar empresas e leads
    console.log('4️⃣ Verificando dados...')
    const companyCount = await prisma.company.count()
    const leadCount = await prisma.lead.count()
    const noteCount = await prisma.note.count()

    console.log(`   📊 Empresas: ${companyCount}`)
    console.log(`   📊 Leads: ${leadCount}`)
    console.log(`   📊 Notas: ${noteCount}\n`)

    // 5. Verificar migrations
    console.log('5️⃣ Verificando migrations...')
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5
    `

    if (migrations.length > 0) {
      console.log(`   ✅ ${migrations.length} migration(s) aplicada(s)`)
      migrations.forEach(m => console.log(`      - ${m.migration_name}`))
    } else {
      console.log('   ⚠️  Tabela de migrations não encontrada')
      console.log('   Migrations podem ter sido aplicadas manualmente')
    }

    console.log('\n🎉 BANCO DE PRODUÇÃO ESTÁ FUNCIONANDO!')
    console.log('==============================================\n')

    if (adminUser) {
      console.log('✅ Pronto para uso!')
      console.log('📱 Acesse: https://[seu-projeto].vercel.app/login')
      console.log('   Email: admin@leapscout.com')
      console.log('   Senha: LeapScout2025!\n')
    } else {
      console.log('⚠️  Precisa criar usuário admin')
      console.log('   Execute: npm run setup:prod\n')
    }

    await prisma.$disconnect()

  } catch (error) {
    console.error('\n❌ ERRO ao verificar banco:')
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

checkProductionDatabase()
