import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Debug endpoint para verificar configuração de APIs externas
 * Apenas mostra se as variáveis estão configuradas (não os valores)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const envCheck = {
      // Database
      DATABASE_URL: !!process.env.DATABASE_URL,

      // Auth
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,

      // Bright Data APIs
      BRIGHT_DATA_PUPPETEER_URL: !!process.env.BRIGHT_DATA_PUPPETEER_URL,
      BRIGHT_DATA_UNLOCKER_KEY: !!process.env.BRIGHT_DATA_UNLOCKER_KEY,
      BRIGHT_DATA_SERP_KEY: !!process.env.BRIGHT_DATA_SERP_KEY,

      // AI & Enrichment
      CLAUDE_API_KEY: !!process.env.CLAUDE_API_KEY,
      HUNTER_IO_API_KEY: !!process.env.HUNTER_IO_API_KEY,

      // Cron
      CRON_SECRET: !!process.env.CRON_SECRET,
    }

    const missingKeys = Object.entries(envCheck)
      .filter(([key, value]) => !value && key !== 'NEXTAUTH_URL')
      .map(([key]) => key)

    return NextResponse.json({
      environment: envCheck,
      missingKeys,
      allConfigured: missingKeys.length === 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Debug env error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
