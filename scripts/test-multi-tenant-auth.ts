/**
 * Script para testar autenticação multi-tenant
 *
 * Verifica:
 * 1. Estrutura do banco de dados multi-tenant
 * 2. Dados do usuário admin criado pelo seed
 * 3. Relacionamentos entre User, TenantUser, e Tenant
 * 4. Validação de senha
 */

import { PrismaClient } from '@prisma/client'
import { compare } from 'bcryptjs'

const prisma = new PrismaClient()

async function testMultiTenantAuth() {
  console.log('🔐 Testando autenticação multi-tenant...\n')

  try {
    // 1. Verificar estrutura de tenants
    console.log('1️⃣  Verificando tenants no banco...')
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            tenantUsers: true,
            leads: true,
            searchQueries: true,
          }
        }
      }
    })

    console.log(`   ✅ ${tenants.length} tenant(s) encontrado(s)`)
    tenants.forEach(tenant => {
      console.log(`   📊 ${tenant.name} (${tenant.slug})`)
      console.log(`      - Status: ${tenant.isActive ? '✅ Ativo' : '❌ Inativo'}`)
      console.log(`      - Plano: ${tenant.plan}`)
      console.log(`      - Usuários: ${tenant._count.tenantUsers}`)
      console.log(`      - Leads: ${tenant._count.leads}`)
      console.log(`      - Queries: ${tenant._count.searchQueries}`)
    })

    // 2. Verificar usuários e seus tenants
    console.log('\n2️⃣  Verificando usuários...')
    const users = await prisma.user.findMany({
      include: {
        tenantUsers: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                isActive: true,
              }
            }
          }
        },
        superAdmin: true,
      }
    })

    console.log(`   ✅ ${users.length} usuário(s) encontrado(s)`)
    for (const user of users) {
      console.log(`\n   👤 ${user.name} (${user.email})`)
      console.log(`      - ID: ${user.id}`)
      console.log(`      - Last Active Tenant: ${user.lastActiveTenantId || 'nenhum'}`)
      console.log(`      - SuperAdmin: ${user.superAdmin ? '✅ Sim' : '❌ Não'}`)
      console.log(`      - Tenants:`)

      user.tenantUsers.forEach(tu => {
        console.log(`        • ${tu.tenant.name} (${tu.tenant.slug})`)
        console.log(`          - Role: ${tu.role}`)
        console.log(`          - Ativo: ${tu.isActive ? '✅' : '❌'}`)
        console.log(`          - Tenant Ativo: ${tu.tenant.isActive ? '✅' : '❌'}`)
      })
    }

    // 3. Testar login do usuário admin
    console.log('\n3️⃣  Testando login do usuário admin@leapsolutions.com.br...')
    const adminEmail = 'admin@leapsolutions.com.br'
    const adminPassword = 'admin123'

    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      include: {
        tenantUsers: {
          where: { isActive: true },
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                slug: true,
                isActive: true,
              }
            }
          }
        },
        superAdmin: true,
      }
    })

    if (!adminUser) {
      console.error('   ❌ Usuário admin não encontrado')
      return
    }

    console.log('   ✅ Usuário encontrado')

    // Verificar senha
    const isPasswordValid = await compare(adminPassword, adminUser.password)
    if (!isPasswordValid) {
      console.error('   ❌ Senha inválida')
      return
    }

    console.log('   ✅ Senha válida')

    // Simular preparação de sessão (como no authorize)
    const userTenants = adminUser.tenantUsers
      .filter(tu => tu.tenant.isActive)
      .map(tu => ({
        tenantId: tu.tenant.id,
        tenantName: tu.tenant.name,
        tenantSlug: tu.tenant.slug,
        role: tu.role,
        isActive: tu.isActive,
      }))

    console.log(`   ✅ ${userTenants.length} tenant(s) ativo(s) acessível(is)`)

    if (userTenants.length === 0 && !adminUser.superAdmin) {
      console.error('   ❌ Usuário sem tenants ativos e não é SuperAdmin')
      return
    }

    const activeTenantId = adminUser.lastActiveTenantId || userTenants[0]?.tenantId || null
    console.log(`   ✅ Active Tenant ID: ${activeTenantId}`)

    // Simular objeto de sessão
    const sessionUser = {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      activeTenantId,
      tenants: userTenants,
      isSuperAdmin: !!adminUser.superAdmin,
    }

    console.log('\n4️⃣  Dados da sessão simulada:')
    console.log(JSON.stringify(sessionUser, null, 2))

    // 4. Verificar dados relacionados ao tenant ativo
    if (activeTenantId) {
      console.log('\n5️⃣  Verificando dados do tenant ativo...')

      const activeTenant = await prisma.tenant.findUnique({
        where: { id: activeTenantId },
        include: {
          _count: {
            select: {
              leads: true,
              notes: true,
              searchQueries: true,
            }
          }
        }
      })

      if (activeTenant) {
        console.log(`   ✅ Tenant: ${activeTenant.name}`)
        console.log(`      - Leads: ${activeTenant._count.leads}`)
        console.log(`      - Notas: ${activeTenant._count.notes}`)
        console.log(`      - Queries: ${activeTenant._count.searchQueries}`)

        // Verificar leads do tenant
        const leads = await prisma.lead.findMany({
          where: { tenantId: activeTenantId },
          include: {
            company: {
              select: {
                name: true,
                cnpj: true,
              }
            }
          },
          take: 3,
        })

        console.log(`\n   📋 Primeiros ${leads.length} leads:`)
        leads.forEach(lead => {
          console.log(`      • ${lead.jobTitle} - ${lead.company.name}`)
          console.log(`        Status: ${lead.status}, Priority: ${lead.priorityScore}`)
        })
      }
    }

    console.log('\n✅ Teste de autenticação multi-tenant concluído com sucesso!')

  } catch (error) {
    console.error('\n❌ Erro durante teste:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar teste
testMultiTenantAuth()
  .then(() => {
    console.log('\n🎉 Script finalizado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script falhou:', error)
    process.exit(1)
  })
