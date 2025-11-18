/**
 * Setup Production Database
 *
 * Este script roda as migrations e cria o usuário admin
 * no banco de produção (Neon via Vercel)
 *
 * USO:
 * 1. Copie a DATABASE_URL do Vercel (Settings → Environment Variables)
 * 2. Execute: DATABASE_URL="sua-url-aqui" npx tsx scripts/setup-production-db.ts
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

async function setupProductionDatabase() {
  console.log('🚀 LeapScout - Setup Production Database')
  console.log('==========================================\n')

  // Verificar se DATABASE_URL está configurada
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERROR: DATABASE_URL não encontrada!')
    console.error('\n📝 Como usar:')
    console.error('1. Copie a DATABASE_URL do Vercel (Settings → Environment Variables → POSTGRES_PRISMA_URL)')
    console.error('2. Execute:')
    console.error('   DATABASE_URL="postgresql://..." npx tsx scripts/setup-production-db.ts\n')
    process.exit(1)
  }

  console.log('✅ DATABASE_URL encontrada')
  console.log(`📍 Host: ${new URL(process.env.DATABASE_URL).host}\n`)

  try {
    // 1. Rodar migrations
    console.log('📦 Passo 1: Rodando migrations...')
    execSync('npx prisma migrate deploy', { stdio: 'inherit' })
    console.log('✅ Migrations executadas com sucesso!\n')

    // 2. Criar Prisma Client
    const prisma = new PrismaClient()

    // 3. Verificar se usuário admin já existe
    console.log('👤 Passo 2: Verificando usuário admin...')
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@leapscout.com' }
    })

    if (existingUser) {
      console.log('⚠️  Usuário admin já existe!')
      console.log(`   ID: ${existingUser.id}`)
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   Nome: ${existingUser.name}\n`)
    } else {
      // 4. Criar usuário admin
      console.log('📝 Criando usuário admin...')
      const adminUser = await prisma.user.create({
        data: {
          id: 'admin-001',
          email: 'admin@leapscout.com',
          // Senha: LeapScout2025! (bcrypt hash)
          password: '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa',
          name: 'Admin',
          role: 'admin',
          isActive: true,
        }
      })

      console.log('✅ Usuário admin criado com sucesso!')
      console.log(`   ID: ${adminUser.id}`)
      console.log(`   Email: ${adminUser.email}`)
      console.log(`   Senha: LeapScout2025! (altere após primeiro login)\n`)
    }

    // 5. Verificar tabelas criadas
    console.log('🔍 Passo 3: Verificando estrutura do banco...')
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `

    console.log(`✅ ${tables.length} tabelas encontradas:`)
    tables.forEach(t => console.log(`   - ${t.tablename}`))

    await prisma.$disconnect()

    console.log('\n🎉 SETUP CONCLUÍDO COM SUCESSO!')
    console.log('==========================================')
    console.log('\n📱 Próximos passos:')
    console.log('1. Acesse: https://[seu-projeto].vercel.app/login')
    console.log('2. Login com:')
    console.log('   Email: admin@leapscout.com')
    console.log('   Senha: LeapScout2025!')
    console.log('\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!\n')

  } catch (error) {
    console.error('\n❌ ERRO durante setup:')
    console.error(error)
    process.exit(1)
  }
}

setupProductionDatabase()
