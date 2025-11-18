/**
 * Test bcrypt hash verification
 */

import { compare } from 'bcryptjs'

async function testBcrypt() {
  const password = 'LeapScout2025!'
  const hash = '$2b$10$gv6yvexi0CoyGWUTOp.JWekamYGz3bLBiNPPpETF/2iryGShZtVra'

  console.log('🧪 Testando bcrypt hash')
  console.log('======================\n')
  console.log(`Senha: ${password}`)
  console.log(`Hash: ${hash}\n`)

  const isValid = await compare(password, hash)

  if (isValid) {
    console.log('✅ Hash é válido! Senha bate com o hash.')
  } else {
    console.log('❌ Hash NÃO é válido! Senha não bate.')
  }
}

testBcrypt()
