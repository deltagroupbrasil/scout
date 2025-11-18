import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // 1. Testar conexão com banco
    await prisma.$connect()

    // 2. Executar query simples
    const userCount = await prisma.user.count()

    // 3. Verificar variáveis de ambiente
    const envCheck = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    }

    await prisma.$disconnect()

    return NextResponse.json({
      status: "OK",
      database: {
        connected: true,
        userCount,
      },
      environment: envCheck,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Health check error:", error)

    return NextResponse.json(
      {
        status: "ERROR",
        error: error.message,
        stack: error.stack,
        database: {
          connected: false,
        },
        environment: {
          DATABASE_URL: !!process.env.DATABASE_URL,
          NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
          NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        },
      },
      { status: 500 }
    )
  }
}
