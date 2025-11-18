/**
 * Check exact email in database
 */

import { Client } from 'pg'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.production') })

async function checkEmail() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })

  try {
    await client.connect()
    console.log('✅ Conectado ao banco!\n')

    // Listar TODOS os usuários com emails exatos
    const result = await client.query(`
      SELECT id, email, name, role, "isActive", "createdAt"
      FROM "User"
      ORDER BY "createdAt" DESC
    `)

    console.log(`📊 Total de usuários: ${result.rows.length}\n`)

    result.rows.forEach((user, index) => {
      console.log(`Usuário ${index + 1}:`)
      console.log(`  ID: ${user.id}`)
      console.log(`  Email: "${user.email}"`)
      console.log(`  Nome: ${user.name}`)
      console.log(`  Role: ${user.role}`)
      console.log(`  Ativo: ${user.isActive}`)
      console.log(`  Criado: ${user.createdAt}`)
      console.log(`  Bytes do email: [${Buffer.from(user.email).toString('hex')}]`)
      console.log('')
    })

    // Verificar se existe exatamente com esse email
    const adminCheck = await client.query(`
      SELECT COUNT(*) as count
      FROM "User"
      WHERE email = 'admin@leapscout.com'
    `)

    console.log(`\n🔍 Busca por 'admin@leapscout.com': ${adminCheck.rows[0].count} resultado(s)`)

    await client.end()

  } catch (error) {
    console.error('❌ ERRO:', error)
    await client.end()
    process.exit(1)
  }
}

checkEmail()
