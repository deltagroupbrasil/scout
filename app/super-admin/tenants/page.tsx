import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Users, CalendarDays, CheckCircle2, XCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CreateTenantForm } from "@/components/super-admin/create-tenant-form"
import { EditTenantForm } from "@/components/super-admin/edit-tenant-form"
import { ManageFeaturesForm } from "@/components/super-admin/manage-features-form"
import { TenantFeature } from "@/lib/get-tenant-context"

export default async function SuperAdminTenantsPage() {
  // Buscar todos os tenants com estatísticas
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          tenantUsers: true,
          leads: true,
          searchQueries: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gerenciar Tenants</h2>
          <p className="text-muted-foreground mt-1">
            Visualize e gerencie todos os tenants (organizações) do sistema
          </p>
        </div>
        <CreateTenantForm />
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
            <p className="text-xs text-muted-foreground">
              {tenants.filter(t => t.isActive).length} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenants.reduce((sum, t) => sum + t._count.tenantUsers, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Média de {Math.round(tenants.reduce((sum, t) => sum + t._count.tenantUsers, 0) / tenants.length || 0)} por tenant
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenants.reduce((sum, t) => sum + t._count.leads, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Distribuídos entre os tenants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Tenants */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Todos os Tenants</h3>

        {tenants.map((tenant) => {
          // Parse features
          let features: TenantFeature[] = ['dashboard']
          try {
            const parsed = tenant.enabledFeatures as TenantFeature[]
            if (Array.isArray(parsed)) features = parsed
          } catch { /* fallback */ }

          return (
            <Card key={tenant.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{tenant.name}</CardTitle>
                      {tenant.isActive ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Inativo
                        </Badge>
                      )}
                      <Badge variant="outline">{tenant.plan}</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-4">
                      <span>Slug: {tenant.slug}</span>
                      <span>•</span>
                      <span>
                        Criado {formatDistanceToNow(new Date(tenant.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </CardDescription>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <ManageFeaturesForm tenantId={tenant.id} tenantName={tenant.name} />
                    <EditTenantForm
                      tenant={{
                        id: tenant.id,
                        name: tenant.name,
                        slug: tenant.slug,
                        plan: tenant.plan,
                        maxUsers: tenant.maxUsers,
                        maxSearchQueries: tenant.maxSearchQueries,
                        billingEmail: tenant.billingEmail,
                        isActive: tenant.isActive,
                      }}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Usuários</p>
                    <p className="text-2xl font-bold">{tenant._count.tenantUsers}</p>
                    <p className="text-xs text-muted-foreground">
                      Máximo: {tenant.maxUsers}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Queries</p>
                    <p className="text-2xl font-bold">{tenant._count.searchQueries}</p>
                    <p className="text-xs text-muted-foreground">
                      Máximo: {tenant.maxSearchQueries}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Leads</p>
                    <p className="text-2xl font-bold">{tenant._count.leads}</p>
                    <p className="text-xs text-muted-foreground">
                      Total capturados
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contrato</p>
                    <p className="text-sm">
                      {new Date(tenant.contractStart).toLocaleDateString('pt-BR')}
                    </p>
                    {tenant.contractEnd && (
                      <p className="text-xs text-muted-foreground">
                        Até {new Date(tenant.contractEnd).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Features</p>
                    <p className="text-sm font-bold">{features.length}</p>
                    <p className="text-xs text-muted-foreground">
                      {features.filter(f => f !== 'dashboard').slice(0, 2).join(', ') || 'Básico'}
                    </p>
                  </div>
                </div>

                {tenant.billingEmail && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Email de cobrança: <span className="text-foreground">{tenant.billingEmail}</span>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
