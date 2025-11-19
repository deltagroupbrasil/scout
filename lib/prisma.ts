import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Log database URL (apenas primeiros caracteres para segurança)
if (process.env.DATABASE_URL) {
  console.log('[Prisma] DATABASE_URL configurada:', process.env.DATABASE_URL.substring(0, 30) + '...')
} else {
  console.error('[Prisma] ❌ DATABASE_URL NÃO ENCONTRADA!')
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error', 'warn'],
    errorFormat: 'pretty',
    // Otimização para Vercel Serverless + Neon PostgreSQL
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    // Connection pooling otimizado para serverless
    // Neon pooler já gerencia pool, mas limitamos conexões por função
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Event listeners para debug
prisma.$on('error' as never, (e: any) => {
  console.error('[Prisma] Error event:', e)
})

export default prisma
