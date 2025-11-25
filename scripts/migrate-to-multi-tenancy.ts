/**
 * Script de Migration: Multi-Tenancy
 *
 * Este script migra os dados existentes para o novo modelo multi-tenant:
 * 1. Cria tenant default "Delta Group Demo"
 * 2. Cria usuário admin default (se não existir)
 * 3. Vincula usuário ao tenant como ADMIN
 * 4. Marca usuário como SuperAdmin
 * 5. Associa todos os leads, notes e scrapeLogs ao tenant default
 */

import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando migration para multi-tenancy...\n')

  // 1. Criar Tenant Default
  console.log('📦 Criando tenant default...')
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'delta-group-demo' },
    update: {},
    create: {
      name: 'Delta Group Demo',
      slug: 'delta-group-demo',
      isActive: true,
      plan: 'enterprise',
      maxUsers: 50,
      maxSearchQueries: 10,
      billingEmail: 'admin@deltagroup.com.br',
      contractStart: new Date(),
    },
  })
  console.log(`✅ Tenant criado: ${tenant.name} (${tenant.id})\n`)

  // 2. Criar/Buscar Usuário Admin Default
  console.log('👤 Verificando usuário admin...')
  let adminUser = await prisma.user.findFirst({
    where: { email: 'admin@deltagroup.com.br' },
  })

  if (!adminUser) {
    console.log('   Criando novo usuário admin...')
    const hashedPassword = await hash('admin123', 12)
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@deltagroup.com.br',
        name: 'Admin Delta Group',
        password: hashedPassword,
        isAdmin: true,
        lastActiveTenantId: tenant.id,
      },
    })
    console.log(`   ✅ Usuário criado: ${adminUser.email}`)
  } else {
    console.log(`   ✅ Usuário encontrado: ${adminUser.email}`)
    // Atualizar lastActiveTenantId
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { lastActiveTenantId: tenant.id },
    })
  }
  console.log()

  // 3. Vincular Usuário ao Tenant
  console.log('🔗 Vinculando usuário ao tenant...')
  const tenantUser = await prisma.tenantUser.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: adminUser.id,
      },
    },
    update: { role: 'ADMIN', isActive: true },
    create: {
      tenantId: tenant.id,
      userId: adminUser.id,
      role: 'ADMIN',
      isActive: true,
    },
  })
  console.log(`✅ TenantUser criado/atualizado\n`)

  // 4. Criar SuperAdmin
  console.log('⭐ Criando SuperAdmin...')
  await prisma.superAdmin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id },
  })
  console.log(`✅ SuperAdmin criado\n`)

  // 5. Migrar Leads existentes
  console.log('📋 Migrando leads existentes...')
  const leadsWithoutTenant = await prisma.lead.findMany({
    where: { tenantId: null },
  })
  console.log(`   Encontrados ${leadsWithoutTenant.length} leads sem tenant`)

  if (leadsWithoutTenant.length > 0) {
    await prisma.lead.updateMany({
      where: { tenantId: null },
      data: { tenantId: tenant.id },
    })
    console.log(`   ✅ ${leadsWithoutTenant.length} leads associados ao tenant`)
  }
  console.log()

  // 6. Migrar Notes existentes
  console.log('📝 Migrando notes existentes...')
  const notesWithoutTenant = await prisma.note.findMany({
    where: { tenantId: null },
  })
  console.log(`   Encontrados ${notesWithoutTenant.length} notes sem tenant`)

  if (notesWithoutTenant.length > 0) {
    await prisma.note.updateMany({
      where: { tenantId: null },
      data: { tenantId: tenant.id },
    })
    console.log(`   ✅ ${notesWithoutTenant.length} notes associados ao tenant`)
  }
  console.log()

  // 7. Migrar ScrapeLogs existentes
  console.log('📊 Migrando scrape logs existentes...')
  const scrapeLogsWithoutTenant = await prisma.scrapeLog.findMany({
    where: { tenantId: null },
  })
  console.log(`   Encontrados ${scrapeLogsWithoutTenant.length} scrape logs sem tenant`)

  if (scrapeLogsWithoutTenant.length > 0) {
    await prisma.scrapeLog.updateMany({
      where: { tenantId: null },
      data: { tenantId: tenant.id },
    })
    console.log(`   ✅ ${scrapeLogsWithoutTenant.length} scrape logs associados ao tenant`)
  }
  console.log()

  // 8. Criar TenantSearchQueries default
  console.log('🔍 Criando search queries default...')

  // Verificar se o usuário admin já existe antes de criar queries
  const existingQuery1 = await prisma.tenantSearchQuery.findFirst({
    where: {
      tenantId: tenant.id,
      jobTitle: 'Controller',
    },
  })

  if (!existingQuery1) {
    await prisma.tenantSearchQuery.create({
      data: {
        tenantId: tenant.id,
        name: 'Controllers São Paulo',
        jobTitle: 'Controller',
        location: 'São Paulo, SP',
        maxCompanies: 20,
        isActive: true,
        isLocked: true,
        createdById: adminUser.id,
      },
    })
    console.log('   ✅ Query "Controllers São Paulo" criada')
  }

  const existingQuery2 = await prisma.tenantSearchQuery.findFirst({
    where: {
      tenantId: tenant.id,
      jobTitle: 'CFO',
    },
  })

  if (!existingQuery2) {
    await prisma.tenantSearchQuery.create({
      data: {
        tenantId: tenant.id,
        name: 'CFOs Brasil',
        jobTitle: 'CFO',
        location: 'Brasil',
        maxCompanies: 15,
        isActive: true,
        isLocked: true,
        createdById: adminUser.id,
      },
    })
    console.log('   ✅ Query "CFOs Brasil" criada')
  }

  const existingQuery3 = await prisma.tenantSearchQuery.findFirst({
    where: {
      tenantId: tenant.id,
      jobTitle: 'Gerente Financeiro',
    },
  })

  if (!existingQuery3) {
    await prisma.tenantSearchQuery.create({
      data: {
        tenantId: tenant.id,
        name: 'Gerentes Financeiros RJ',
        jobTitle: 'Gerente Financeiro',
        location: 'Rio de Janeiro, RJ',
        maxCompanies: 20,
        isActive: false, // Desativada por padrão
        isLocked: false, // Editável
        createdById: adminUser.id,
      },
    })
    console.log('   ✅ Query "Gerentes Financeiros RJ" criada')
  }

  console.log()
  console.log('🎉 Migration concluída com sucesso!')
  console.log('\n📊 Resumo:')
  console.log(`   Tenant: ${tenant.name}`)
  console.log(`   Admin: ${adminUser.email}`)
  console.log(`   Leads migrados: ${leadsWithoutTenant.length}`)
  console.log(`   Notes migrados: ${notesWithoutTenant.length}`)
  console.log(`   Scrape logs migrados: ${scrapeLogsWithoutTenant.length}`)
  console.log('\n⚠️  PRÓXIMO PASSO: Tornar tenantId obrigatório no schema.prisma')
}

main()
  .catch((e) => {
    console.error('❌ Erro durante migration:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
