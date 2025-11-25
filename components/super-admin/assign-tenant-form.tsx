"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Building2, Loader2 } from "lucide-react"

interface Tenant {
  id: string
  name: string
  slug: string
}

interface AssignTenantFormProps {
  userId: string
  userName: string
  existingTenantIds: string[]
}

export function AssignTenantForm({ userId, userName, existingTenantIds }: AssignTenantFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [tenants, setTenants] = useState<Tenant[]>([])

  const [formData, setFormData] = useState({
    tenantId: "",
    role: "USER",
  })

  // Carregar tenants quando abrir o dialog
  useEffect(() => {
    if (open) {
      fetch("/api/super-admin/tenants")
        .then((res) => res.json())
        .then((data) => {
          // Filtrar tenants que o usuário já possui
          const availableTenants = data.filter(
            (t: Tenant) => !existingTenantIds.includes(t.id)
          )
          setTenants(availableTenants)
        })
        .catch(console.error)
    }
  }, [open, existingTenantIds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/super-admin/users/${userId}/tenants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao associar tenant")
      }

      setOpen(false)
      setFormData({ tenantId: "", role: "USER" })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Building2 className="h-4 w-4 mr-1" />
          Adicionar Tenant
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Associar a Tenant</DialogTitle>
            <DialogDescription>
              Adicionar <strong>{userName}</strong> a um tenant.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            {tenants.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este usuário já está em todos os tenants disponíveis.
              </p>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="tenant">Tenant *</Label>
                  <Select
                    value={formData.tenantId}
                    onValueChange={(value) => setFormData({ ...formData, tenantId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um tenant..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            {tenants.length > 0 && (
              <Button type="submit" disabled={loading || !formData.tenantId}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Associar
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
