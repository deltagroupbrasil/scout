"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Users, Plus, Loader2, Trash2, Shield, ShieldAlert, ShieldCheck, Eye } from "lucide-react"

interface TenantUser {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
  joinedAt: string
}

const ROLE_INFO: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ADMIN: { label: 'Admin', icon: <ShieldAlert className="h-3 w-3" />, color: 'bg-red-100 text-red-800' },
  MANAGER: { label: 'Manager', icon: <ShieldCheck className="h-3 w-3" />, color: 'bg-blue-100 text-blue-800' },
  USER: { label: 'Usuário', icon: <Shield className="h-3 w-3" />, color: 'bg-green-100 text-green-800' },
  VIEWER: { label: 'Visualizador', icon: <Eye className="h-3 w-3" />, color: 'bg-gray-100 text-gray-800' },
}

export default function TenantUsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "USER" })

  // Delete confirmation
  const [deleteUser, setDeleteUser] = useState<TenantUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Edit role dialog
  const [editUser, setEditUser] = useState<TenantUser | null>(null)
  const [newRole, setNewRole] = useState("")
  const [updating, setUpdating] = useState(false)

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/tenant/users")
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao carregar usuários")
      }

      setUsers(data.users)
      setError("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar usuários")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Create user
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError("")

    try {
      const response = await fetch("/api/tenant/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar usuário")
      }

      setCreateOpen(false)
      setNewUser({ name: "", email: "", password: "", role: "USER" })
      fetchUsers()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erro ao criar usuário")
    } finally {
      setCreating(false)
    }
  }

  // Delete user
  const handleDelete = async () => {
    if (!deleteUser) return
    setDeleting(true)

    try {
      const response = await fetch(`/api/tenant/users/${deleteUser.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erro ao remover usuário")
      }

      setDeleteUser(null)
      fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao remover usuário")
    } finally {
      setDeleting(false)
    }
  }

  // Update role
  const handleUpdateRole = async () => {
    if (!editUser || !newRole) return
    setUpdating(true)

    try {
      const response = await fetch(`/api/tenant/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erro ao atualizar usuário")
      }

      setEditUser(null)
      setNewRole("")
      fetchUsers()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar usuário")
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <p>{error}</p>
            <p className="text-sm mt-2">
              Entre em contato com o administrador se acredita que deveria ter acesso.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Usuários da Organização</h2>
          <p className="text-muted-foreground">
            Gerencie os usuários que têm acesso à sua organização
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Adicionar Usuário</DialogTitle>
                <DialogDescription>
                  Crie um novo usuário ou adicione um existente à sua organização.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {createError && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                    {createError}
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="João Silva"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="joao@empresa.com"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="role">Permissão</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANAGER">Manager - Pode gerenciar leads</SelectItem>
                      <SelectItem value="USER">Usuário - Pode editar leads atribuídos</SelectItem>
                      <SelectItem value="VIEWER">Visualizador - Apenas leitura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Adicionar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>

        {['ADMIN', 'MANAGER', 'USER', 'VIEWER'].map(role => (
          <Card key={role}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{ROLE_INFO[role].label}s</CardTitle>
              {ROLE_INFO[role].icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === role).length}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>Membros</CardTitle>
          <CardDescription>
            Usuários com acesso à sua organização
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback>
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.name}</p>
                      {user.id === session?.user?.id && (
                        <Badge variant="outline" className="text-xs">Você</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge className={ROLE_INFO[user.role]?.color || ''}>
                    {ROLE_INFO[user.role]?.icon}
                    <span className="ml-1">{ROLE_INFO[user.role]?.label || user.role}</span>
                  </Badge>

                  {user.id !== session?.user?.id && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditUser(user)
                          setNewRole(user.role)
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteUser(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Permissão</DialogTitle>
            <DialogDescription>
              Alterar a permissão de {editUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label>Nova Permissão</Label>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="USER">Usuário</SelectItem>
                <SelectItem value="VIEWER">Visualizador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateRole} disabled={updating}>
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteUser?.name}</strong> da organização?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
