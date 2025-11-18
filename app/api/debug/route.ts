import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Verificar se consegue conectar ao banco
    await prisma.$connect()

    // Contar usuários
    const userCount = await prisma.user.count()

    // Verificar se usuário admin existe
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@leapscout.com' },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        password: true // vamos ver o hash
      }
    })

    return NextResponse.json({
      status: 'OK',
      database: {
        connected: true,
        userCount,
        adminExists: !!adminUser,
        adminUser: adminUser ? {
          ...adminUser,
          passwordHash: adminUser.password.substring(0, 20) + '...'
        } : null
      },
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? 'SET (length: ' + process.env.DATABASE_URL.length + ')' : 'NOT SET',
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET (length: ' + process.env.NEXTAUTH_SECRET.length + ')' : 'NOT SET',
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'ERROR',
      error: error.message,
      database: {
        connected: false
      }
    }, { status: 500 })
  }
}
