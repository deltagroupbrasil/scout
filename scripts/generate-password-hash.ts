/**
 * Generate password hash for admin user
 */

import { hash } from 'bcryptjs'

async function generateHash() {
  const password = 'LeapScout2025!'

  console.log('🔐 Gerando hash de senha')
  console.log('========================\n')
  console.log(`Senha: ${password}\n`)
  console.log('Gerando hash com bcrypt (10 rounds)...\n')

  const passwordHash = await hash(password, 10)

  console.log(`✅ Hash gerado:`)
  console.log(passwordHash)
  console.log('\n📋 Use este hash no banco de dados!\n')
}

generateHash()
