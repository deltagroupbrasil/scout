/**
 * List all users in database
 */

import { Client } from 'pg'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.production') })

async function listUsers() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })

  try {
    await client.connect()
    console.log('✅ Conectado ao banco!\n')

    const result = await client.query(`
      SELECT
        id,
        email,
        name,
        "isAdmin",
        "createdAt",
        "updatedAt"
      FROM "User"
      ORDER BY "createdAt" DESC
    `)

    console.log(`📊 Total de usuários: ${result.rows.length}\n`)

    result.rows.forEach((user, index) => {
      const adminLabel = user.isAdmin ? '👑 ADMIN' : '👤 USER'
      console.log(`Usuário ${index + 1} ${adminLabel}:`)
      console.log(`  ID: ${user.id}`)
      console.log(`  Email: ${user.email}`)
      console.log(`  Nome: ${user.name}`)
      console.log(`  Criado: ${user.createdAt}`)
      console.log(`  Atualizado: ${user.updatedAt}`)
      console.log('')
    })

    await client.end()

  } catch (error) {
    console.error('❌ ERRO:', error)
    await client.end()
    process.exit(1)
  }
}

listUsers()
