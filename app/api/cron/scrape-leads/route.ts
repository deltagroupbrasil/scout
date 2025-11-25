import { NextRequest, NextResponse } from 'next/server'
import { leadOrchestrator } from '@/lib/services/lead-orchestrator'
import { prisma } from '@/lib/prisma'

// Vercel Fluid Compute: habilita timeout de 300s (5 minutos) no plano Hobby
export const maxDuration = 300

/**
 * Cron Job para scraping automatizado de leads
 *
 * Para Vercel Cron, adicionar em vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/scrape-leads",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 *
 * Para desenvolvimento local, chamar manualmente via GET
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Verificar se é uma chamada autorizada (Vercel Cron ou com token)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || 'dev-secret-change-in-production'

  if (authHeader !== `Bearer ${cronSecret}`) {
    // Em desenvolvimento, permitir sem autenticação
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  try {
    console.log('🤖 [Cron] Iniciando cron job de scraping multi-tenant...')

    // Multi-Tenancy: Buscar todos os tenants ativos
    const activeTenants = await prisma.tenant.findMany({
      where: { isActive: true },
      include: {
        searchQueries: {
          where: { isActive: true },
        },
      },
    })

    console.log(`📊 [Cron] Encontrados ${activeTenants.length} tenants ativos`)

    let totalLeadsCreated = 0
    let totalJobsFound = 0
    const allErrors: string[] = []

    // Processar cada tenant
    for (const tenant of activeTenants) {
      console.log(`\n🏢 [Cron] Processando tenant: ${tenant.name}`)

      if (tenant.searchQueries.length === 0) {
        console.log(`   ⚠️ Tenant sem queries ativas, pulando...`)
        continue
      }

      // Criar log de execução para este tenant
      const scrapeLog = await prisma.scrapeLog.create({
        data: {
          tenantId: tenant.id,
          status: 'running',
          query: tenant.searchQueries.map(q => q.jobTitle).join(', '),
          jobsFound: 0,
          leadsCreated: 0,
        },
      })

      try {
        // Processar cada query do tenant
        for (const searchQuery of tenant.searchQueries) {
          console.log(`   🔍 Query: "${searchQuery.jobTitle}" em ${searchQuery.location}`)

          const result = await leadOrchestrator.scrapeAndProcessLeads(
            {
              query: searchQuery.jobTitle,
              location: searchQuery.location,
              maxCompanies: searchQuery.maxCompanies,
            },
            tenant.id // Multi-Tenancy: passar tenant ID
          )

          totalLeadsCreated += result.savedLeads
          totalJobsFound += result.totalJobs
          allErrors.push(...result.errors)

          // Atualizar contador de uso da query
          await prisma.tenantSearchQuery.update({
            where: { id: searchQuery.id },
            data: {
              usageCount: { increment: 1 },
              lastUsedAt: new Date(),
            },
          })

          console.log(`      → ${result.savedLeads} leads salvos, ${result.totalJobs} vagas encontradas`)
        }

        // Atualizar log com sucesso
        const duration = Math.floor((Date.now() - startTime) / 1000)
        await prisma.scrapeLog.update({
          where: { id: scrapeLog.id },
          data: {
            status: 'success',
            jobsFound: totalJobsFound,
            leadsCreated: totalLeadsCreated,
            duration,
            ...(allErrors.length > 0 && { errors: JSON.stringify(allErrors) }),
          },
        })

        console.log(`   ✅ Tenant ${tenant.name} processado com sucesso`)
      } catch (tenantError) {
        console.error(`   ❌ Erro ao processar tenant ${tenant.name}:`, tenantError)

        // Atualizar log com erro
        await prisma.scrapeLog.update({
          where: { id: scrapeLog.id },
          data: {
            status: 'error',
            duration: Math.floor((Date.now() - startTime) / 1000),
            errors: JSON.stringify({
              message: tenantError instanceof Error ? tenantError.message : String(tenantError),
            }),
          },
        })

        allErrors.push(`Tenant ${tenant.name}: ${tenantError instanceof Error ? tenantError.message : String(tenantError)}`)
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000)
    console.log(`\n🎉 [Cron] Job concluído: ${totalLeadsCreated} leads criados de ${totalJobsFound} vagas em ${duration}s`)

    return NextResponse.json({
      success: true,
      tenantsProcessed: activeTenants.length,
      leadsCreated: totalLeadsCreated,
      jobsFound: totalJobsFound,
      duration,
      errors: allErrors,
      message: `Scraping concluído para ${activeTenants.length} tenants. ${totalLeadsCreated} leads criados.`,
    })
  } catch (error) {
    console.error('❌ [Cron] Erro crítico no cron job:', error)

    const duration = Math.floor((Date.now() - startTime) / 1000)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'

    // Erro global do cron (não específico de um tenant)
    // Logs individuais de cada tenant já foram tratados no loop acima

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration,
      },
      { status: 500 }
    )
  }
}

// POST também é suportado para chamadas manuais
export async function POST(request: NextRequest) {
  return GET(request)
}
