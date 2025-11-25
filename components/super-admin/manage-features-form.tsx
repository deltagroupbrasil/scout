"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Settings, Loader2, Kanban, Search } from "lucide-react"

// Features controláveis
const CONTROLLABLE_FEATURES = [
  { id: 'kanban', name: 'Kanban', description: 'Visualização em Kanban para gestão de leads', icon: Kanban },
  { id: 'search', name: 'Busca de Vagas', description: 'Criar queries customizadas ilimitadas (sem isso, só cron job)', icon: Search },
]

interface ManageFeaturesFormProps {
  tenantId: string
  tenantName: string
}

export function ManageFeaturesForm({ tenantId, tenantName }: ManageFeaturesFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([])

  // Carregar features quando abrir o dialog
  useEffect(() => {
    if (open) {
      setLoading(true)
      fetch(`/api/super-admin/tenants/${tenantId}/features`)
        .then((res) => res.json())
        .then((data) => {
          // Filtrar apenas as controláveis
          const controllable = (data.enabledFeatures || []).filter(
            (f: string) => CONTROLLABLE_FEATURES.some(cf => cf.id === f)
          )
          setEnabledFeatures(controllable)
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    }
  }, [open, tenantId])

  const handleToggleFeature = (featureId: string) => {
    setEnabledFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((f) => f !== featureId)
        : [...prev, featureId]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")

    try {
      const response = await fetch(`/api/super-admin/tenants/${tenantId}/features`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: enabledFeatures }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar")
      }

      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-1" />
          Features
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Features</DialogTitle>
          <DialogDescription>
            Features extras para <strong>{tenantName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {/* Info sobre features padrão */}
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Padrão de fábrica:</strong> Dashboard, Export CSV, AI Insights, Enriquecimento, Gestão de Usuários
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {CONTROLLABLE_FEATURES.map((feature) => {
                const Icon = feature.icon
                const isEnabled = enabledFeatures.includes(feature.id)

                return (
                  <div
                    key={feature.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      isEnabled ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                        <Icon className={`h-5 w-5 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <Label htmlFor={feature.id} className="font-medium cursor-pointer">
                          {feature.name}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={feature.id}
                      checked={isEnabled}
                      onCheckedChange={() => handleToggleFeature(feature.id)}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
