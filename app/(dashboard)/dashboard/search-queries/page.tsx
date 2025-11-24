'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Play, Edit, Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface SearchQuery {
  id: string
  name: string
  jobTitle: string
  location: string
  maxCompanies: number
  isActive: boolean
  usageCount: number
  lastUsedAt: string | null
  createdBy: {
    id: string
    name: string
    email: string
  }
  createdAt: string
}

export default function SearchQueriesPage() {
  const [queries, setQueries] = useState<SearchQuery[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState<string | null>(null)
  const [quickSearchOpen, setQuickSearchOpen] = useState(false)
  const [newQueryOpen, setNewQueryOpen] = useState(false)
  const { toast } = useToast()

  // Formulário de busca rápida
  const [quickSearch, setQuickSearch] = useState({
    jobTitle: '',
    location: 'Brasil',
    maxCompanies: 20,
  })

  // Formulário de nova query
  const [newQuery, setNewQuery] = useState({
    name: '',
    jobTitle: '',
    location: 'Brasil',
    maxCompanies: 20,
  })

  useEffect(() => {
    loadQueries()
  }, [])

  const loadQueries = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/search-queries')
      const data = await res.json()
      setQueries(data.queries || [])
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as queries',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickSearch = async () => {
    if (!quickSearch.jobTitle) {
      toast({
        title: 'Erro',
        description: 'Preencha o cargo/termo de busca',
        variant: 'destructive',
      })
      return
    }

    try {
      setExecuting('quick')
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: quickSearch.jobTitle,
          location: quickSearch.location,
          maxCompanies: quickSearch.maxCompanies,
        }),
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Busca concluída!',
          description: `${data.savedLeads} leads criados de ${data.totalJobs} vagas encontradas`,
        })
        setQuickSearchOpen(false)
        setQuickSearch({ jobTitle: '', location: 'Brasil', maxCompanies: 20 })
      } else {
        toast({
          title: 'Erro na busca',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível executar a busca',
        variant: 'destructive',
      })
    } finally {
      setExecuting(null)
    }
  }

  const handleCreateQuery = async () => {
    if (!newQuery.name || !newQuery.jobTitle) {
      toast({
        title: 'Erro',
        description: 'Preencha nome e cargo/termo',
        variant: 'destructive',
      })
      return
    }

    try {
      const res = await fetch('/api/search-queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuery),
      })

      const data = await res.json()

      if (res.ok) {
        toast({
          title: 'Query criada!',
          description: `Query "${newQuery.name}" salva com sucesso`,
        })
        setNewQueryOpen(false)
        setNewQuery({ name: '', jobTitle: '', location: 'Brasil', maxCompanies: 20 })
        loadQueries()
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao criar query',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a query',
        variant: 'destructive',
      })
    }
  }

  const handleExecuteQuery = async (queryId: string) => {
    try {
      setExecuting(queryId)
      const res = await fetch(`/api/search-queries/${queryId}/execute`, {
        method: 'POST',
      })

      const data = await res.json()

      if (data.success) {
        toast({
          title: 'Busca concluída!',
          description: `${data.leadsCreated} leads criados de ${data.totalJobs} vagas encontradas`,
        })
        loadQueries() // Recarregar para atualizar lastUsedAt e usageCount
      } else {
        toast({
          title: 'Erro na busca',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível executar a query',
        variant: 'destructive',
      })
    } finally {
      setExecuting(null)
    }
  }

  const handleDeleteQuery = async (queryId: string, queryName: string) => {
    if (!confirm(`Tem certeza que deseja deletar a query "${queryName}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/search-queries/${queryId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast({
          title: 'Query deletada',
          description: `Query "${queryName}" removida com sucesso`,
        })
        loadQueries()
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível deletar a query',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar a query',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Queries de Busca</h1>
          <p className="text-muted-foreground mt-1">
            Configure e execute buscas de leads personalizadas
          </p>
        </div>

        <div className="flex gap-2">
          {/* Busca Rápida */}
          <Dialog open={quickSearchOpen} onOpenChange={setQuickSearchOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Search className="mr-2 h-4 w-4" />
                Busca Rápida
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Busca Rápida</DialogTitle>
                <DialogDescription>
                  Execute uma busca pontual sem salvar a query
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="quick-jobTitle">Cargo/Termo de Busca *</Label>
                  <Input
                    id="quick-jobTitle"
                    placeholder="Ex: Controller, CFO, Gerente Financeiro"
                    value={quickSearch.jobTitle}
                    onChange={(e) =>
                      setQuickSearch({ ...quickSearch, jobTitle: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="quick-location">Localização *</Label>
                  <Input
                    id="quick-location"
                    placeholder="Ex: São Paulo, SP ou Brasil"
                    value={quickSearch.location}
                    onChange={(e) =>
                      setQuickSearch({ ...quickSearch, location: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="quick-maxCompanies">Limite de Empresas</Label>
                  <Input
                    id="quick-maxCompanies"
                    type="number"
                    min="1"
                    max="100"
                    value={quickSearch.maxCompanies}
                    onChange={(e) =>
                      setQuickSearch({
                        ...quickSearch,
                        maxCompanies: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <Button
                  onClick={handleQuickSearch}
                  disabled={executing === 'quick'}
                  className="w-full"
                >
                  {executing === 'quick' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Executar Busca
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Nova Query Salva */}
          <Dialog open={newQueryOpen} onOpenChange={setNewQueryOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Query
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Query de Busca</DialogTitle>
                <DialogDescription>
                  Salve uma query para reutilizar depois
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Nome da Query *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Controllers SP, CFOs Brasil"
                    value={newQuery.name}
                    onChange={(e) =>
                      setNewQuery({ ...newQuery, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="jobTitle">Cargo/Termo de Busca *</Label>
                  <Input
                    id="jobTitle"
                    placeholder="Ex: Controller, CFO, Gerente Financeiro"
                    value={newQuery.jobTitle}
                    onChange={(e) =>
                      setNewQuery({ ...newQuery, jobTitle: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="location">Localização *</Label>
                  <Input
                    id="location"
                    placeholder="Ex: São Paulo, SP ou Brasil"
                    value={newQuery.location}
                    onChange={(e) =>
                      setNewQuery({ ...newQuery, location: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="maxCompanies">Limite de Empresas</Label>
                  <Input
                    id="maxCompanies"
                    type="number"
                    min="1"
                    max="100"
                    value={newQuery.maxCompanies}
                    onChange={(e) =>
                      setNewQuery({
                        ...newQuery,
                        maxCompanies: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <Button onClick={handleCreateQuery} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Salvar Query
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lista de Queries */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : queries.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            Nenhuma query salva. Crie sua primeira query ou execute uma busca rápida.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {queries.map((query) => (
            <Card key={query.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold">{query.name}</h3>
                    {!query.isActive && (
                      <Badge variant="secondary">Desativada</Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      <strong>Cargo:</strong> {query.jobTitle}
                    </p>
                    <p>
                      <strong>Localização:</strong> {query.location}
                    </p>
                    <p>
                      <strong>Limite:</strong> {query.maxCompanies} empresas
                    </p>
                    <p>
                      <strong>Usada:</strong> {query.usageCount} vezes
                      {query.lastUsedAt && (
                        <> · Última vez: {new Date(query.lastUsedAt).toLocaleDateString('pt-BR')}</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleExecuteQuery(query.id)}
                    disabled={executing !== null || !query.isActive}
                  >
                    {executing === query.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteQuery(query.id, query.name)}
                    disabled={executing !== null}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
