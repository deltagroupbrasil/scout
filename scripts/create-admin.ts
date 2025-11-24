// Script para criar usuário admin para testes
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    // Hash da senha
    const password = 'admin123'
    const hashedPassword = await bcrypt.hash(password, 10)

    // Criar usuário admin
    const user = await prisma.user.create({
      data: {
        email: 'admin@leapscout.com',
        name: 'Admin',
        password: hashedPassword,
        isAdmin: true,
      },
    })

    console.log('✅ Usuário admin criado com sucesso!')
    console.log('📧 Email: admin@leapscout.com')
    console.log('🔑 Senha: admin123')
    console.log('')
    console.log('🌐 Acesse: http://localhost:3000')
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log('⚠️  Usuário admin já existe!')
      console.log('📧 Email: admin@leapscout.com')
      console.log('🔑 Senha: admin123')
    } else {
      console.error('❌ Erro ao criar usuário:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
