/**
 * Create User Directly in Database
 *
 * Cria um usuário direto no banco de produção
 */

import { Client } from 'pg'
import { hash } from 'bcryptjs'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.production') })

async function createUser() {
  console.log('👤 Criando novo usuário')
  console.log('======================\n')

  // Pegar dados do usuário
  const name = process.argv[2] || 'Ariel Lima'
  const email = process.argv[3] || 'ariel.fslima@gmail.com'
  const password = process.argv[4] || 'Ariel@2025'

  console.log(`Nome: ${name}`)
  console.log(`Email: ${email}`)
  console.log(`Senha: ${password}\n`)

  const client = new Client({ connectionString: process.env.DATABASE_URL })

  try {
    await client.connect()
    console.log('✅ Conectado ao banco!\n')

    // Verificar se já existe
    const checkResult = await client.query(`
      SELECT id, email FROM "User" WHERE email = $1
    `, [email.toLowerCase()])

    if (checkResult.rows.length > 0) {
      console.log('⚠️  Usuário já existe!')
      console.log(`   ID: ${checkResult.rows[0].id}`)
      console.log(`   Email: ${checkResult.rows[0].email}\n`)
      console.log('💡 Vou atualizar a senha dele...\n')

      // Atualizar senha
      const passwordHash = await hash(password, 10)
      await client.query(`
        UPDATE "User"
        SET password = $1, "updatedAt" = NOW()
        WHERE email = $2
      `, [passwordHash, email.toLowerCase()])

      console.log('✅ Senha atualizada!\n')
    } else {
      // Criar novo usuário
      console.log('📝 Criando novo usuário...\n')

      const passwordHash = await hash(password, 10)
      const result = await client.query(`
        INSERT INTO "User" (id, email, password, name, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
        RETURNING id, email, name, "createdAt"
      `, [email.toLowerCase(), passwordHash, name])

      const user = result.rows[0]
      console.log('✅ Usuário criado com sucesso!')
      console.log(`   ID: ${user.id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Nome: ${user.name}`)
      console.log(`   Criado: ${user.createdAt}\n`)
    }

    console.log('🎉 PRONTO!')
    console.log('\n📱 Acesse: https://leapscout.vercel.app/login')
    console.log(`   Email: ${email}`)
    console.log(`   Senha: ${password}\n`)

    await client.end()

  } catch (error) {
    console.error('❌ ERRO:', error)
    await client.end()
    process.exit(1)
  }
}

console.log('\n💡 USO:')
console.log('   npx tsx scripts/create-user-direct.ts "Nome" "email@example.com" "senha123"\n')

createUser()
