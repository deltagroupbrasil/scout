/**
 * Marca um usuário como admin no banco de dados
 */

import { prisma } from '../lib/prisma'

async function setAdmin() {
  const email = process.argv[2]

  if (!email) {
    console.error('❌ Uso: npx tsx scripts/set-admin.ts <email>')
    process.exit(1)
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.error(`❌ Usuário não encontrado: ${email}`)
      process.exit(1)
    }

    await prisma.user.update({
      where: { email },
      data: { isAdmin: true }
    })

    console.log(`✅ Usuário ${email} marcado como ADMIN`)

  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

setAdmin()
