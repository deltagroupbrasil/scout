/**
 * Check Admin User in Production
 */

import { Client } from 'pg'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.production') })

async function checkAdminUser() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })

  try {
    await client.connect()
    console.log('✅ Conectado ao banco!\n')

    // Verificar usuário admin
    const result = await client.query(`
      SELECT id, email, name, role, password, "isActive", "createdAt"
      FROM "User"
      WHERE email = 'admin@leapscout.com'
    `)

    if (result.rows.length === 0) {
      console.log('❌ Usuário admin NÃO encontrado!\n')
    } else {
      const user = result.rows[0]
      console.log('✅ Usuário admin encontrado:')
      console.log(`   ID: ${user.id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Nome: ${user.name}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Ativo: ${user.isActive}`)
      console.log(`   Password Hash: ${user.password.substring(0, 20)}...`)
      console.log(`   Criado em: ${user.createdAt}\n`)

      // Verificar se o hash está correto
      const expectedHash = '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa'
      if (user.password === expectedHash) {
        console.log('✅ Password hash correto!')
        console.log('   Senha esperada: LeapScout2025!\n')
      } else {
        console.log('❌ Password hash DIFERENTE!')
        console.log(`   Esperado: ${expectedHash}`)
        console.log(`   Atual: ${user.password}\n`)
      }
    }

    // Listar todos os usuários
    const allUsers = await client.query(`SELECT id, email, name, role FROM "User"`)
    console.log(`📊 Total de usuários: ${allUsers.rows.length}`)
    allUsers.rows.forEach(u => {
      console.log(`   - ${u.email} (${u.role})`)
    })

    await client.end()

  } catch (error) {
    console.error('❌ ERRO:', error)
    await client.end()
    process.exit(1)
  }
}

checkAdminUser()
