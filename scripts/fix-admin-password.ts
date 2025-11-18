/**
 * Fix Admin Password Hash
 *
 * Atualiza o hash da senha do usuário admin para o correto
 */

import { Client } from 'pg'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.production') })

async function fixAdminPassword() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })

  try {
    await client.connect()
    console.log('✅ Conectado ao banco!\n')

    // Hash correto para a senha "LeapScout2025!"
    const correctHash = '$2b$10$gv6yvexi0CoyGWUTOp.JWekamYGz3bLBiNPPpETF/2iryGShZtVra'

    console.log('🔐 Atualizando senha do admin...')
    console.log(`   Novo hash: ${correctHash.substring(0, 20)}...\n`)

    const result = await client.query(`
      UPDATE "User"
      SET password = $1, "updatedAt" = NOW()
      WHERE email = 'admin@leapscout.com'
      RETURNING id, email, name
    `, [correctHash])

    if (result.rowCount === 0) {
      console.log('❌ Usuário admin não encontrado!')
    } else {
      const user = result.rows[0]
      console.log('✅ Senha atualizada com sucesso!')
      console.log(`   ID: ${user.id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Nome: ${user.name}\n`)

      console.log('🎉 Login agora deve funcionar!')
      console.log('📱 Teste em: https://leapscout.vercel.app/login')
      console.log('   Email: admin@leapscout.com')
      console.log('   Senha: LeapScout2025!\n')
    }

    await client.end()

  } catch (error) {
    console.error('❌ ERRO:', error)
    await client.end()
    process.exit(1)
  }
}

fixAdminPassword()
