import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Building2, Crown } from "lucide-react"
import { CreateUserForm } from "@/components/super-admin/create-user-form"
import { AssignTenantForm } from "@/components/super-admin/assign-tenant-form"

export default async function SuperAdminUsersPage() {
  // Buscar todos os usuários com seus tenants
  const users = await prisma.user.findMany({
    include: {
      tenantUsers: {
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      superAdmin: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const totalSuperAdmins = users.filter(u => u.superAdmin).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gerenciar Usuários</h2>
          <p className="text-muted-foreground mt-1">
            Visualize todos os usuários e suas permissões no sistema
          </p>
        </div>
        <CreateUserForm />
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{users.length}</p>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Super Admins</p>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{totalSuperAdmins}</p>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Sem Tenants</p>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">
              {users.filter(u => u.tenantUsers.length === 0).length}
            </p>
          </div>
        </Card>
      </div>

      {/* Lista de Usuários */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Todos os Usuários</h3>

        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info do Usuário */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{user.name}</h4>
                      {user.superAdmin && (
                        <Badge variant="secondary" className="gap-1">
                          <Crown className="h-3 w-3" />
                          Super Admin
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">{user.email}</p>

                    {/* Tenants do Usuário */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {user.tenantUsers.length > 0 ? (
                        user.tenantUsers.map((tu) => (
                          <Badge key={tu.id} variant="outline" className="gap-1">
                            <Building2 className="h-3 w-3" />
                            {tu.tenant.name}
                            <span className="text-xs opacity-70">({tu.role})</span>
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-amber-600 dark:text-amber-500">
                          Usuário sem tenant atribuído
                        </p>
                      )}

                      {/* Botão para adicionar tenant */}
                      <AssignTenantForm
                        userId={user.id}
                        userName={user.name}
                        existingTenantIds={user.tenantUsers.map(tu => tu.tenant.id)}
                      />
                    </div>
                  </div>

                  {/* Data de Criação */}
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Criado em</p>
                    <p>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
