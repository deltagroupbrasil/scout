"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Building2, Check, ChevronsUpDown, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

interface TenantSwitcherProps {
  className?: string
}

export default function TenantSwitcher({ className }: TenantSwitcherProps) {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  if (!session?.user) {
    return null
  }

  const { activeTenantId, tenants, isSuperAdmin } = session.user

  // Se não houver tenant ativo, não mostrar nada (edge case)
  if (!activeTenantId) {
    return null
  }

  const activeTenant = tenants?.find(t => t.tenantId === activeTenantId)

  // Se usuário tem apenas 1 tenant, mostrar badge simples (não dropdown)
  if (!tenants || tenants.length <= 1) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{activeTenant?.tenantName || 'Tenant'}</span>
          {isSuperAdmin && (
            <Badge variant="secondary" className="ml-1 text-xs">
              <Crown className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          )}
        </div>
      </div>
    )
  }

  const handleTenantSwitch = async (tenantId: string) => {
    if (tenantId === activeTenantId) return

    setIsLoading(true)
    try {
      // Chamar API para atualizar tenant ativo
      const response = await fetch('/api/tenant/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      })

      if (!response.ok) {
        throw new Error('Erro ao trocar de tenant')
      }

      // Atualizar session local (NextAuth)
      await update({ activeTenantId: tenantId })

      // Refresh da página para recarregar dados do novo tenant
      router.refresh()
    } catch (error) {
      console.error('Erro ao trocar tenant:', error)
      alert('Erro ao trocar de organização. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="gap-2 min-w-[200px] justify-between"
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="truncate">{activeTenant?.tenantName || 'Selecione'}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[250px]">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organizações
            {isSuperAdmin && (
              <Badge variant="secondary" className="ml-auto text-xs">
                <Crown className="h-3 w-3 mr-1" />
                Super Admin
              </Badge>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {tenants.map((tenant) => (
            <DropdownMenuItem
              key={tenant.tenantId}
              onClick={() => handleTenantSwitch(tenant.tenantId)}
              disabled={isLoading}
              className={cn(
                "cursor-pointer",
                tenant.tenantId === activeTenantId && "bg-accent"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="font-medium">{tenant.tenantName}</span>
                  <span className="text-xs text-muted-foreground">
                    {tenant.role === 'ADMIN' && '👑 Administrador'}
                    {tenant.role === 'MANAGER' && '📊 Gerente'}
                    {tenant.role === 'USER' && '👤 Usuário'}
                    {tenant.role === 'VIEWER' && '👁️ Visualizador'}
                  </span>
                </div>
                {tenant.tenantId === activeTenantId && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}

          {isSuperAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/super-admin/tenants" className="cursor-pointer">
                  <Crown className="h-4 w-4 mr-2" />
                  Gerenciar Tenants
                </a>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
