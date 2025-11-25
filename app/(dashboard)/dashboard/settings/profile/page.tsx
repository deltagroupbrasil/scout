"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { User, Building2, Shield, Key, Loader2, Check, Crown } from "lucide-react"

interface UserProfile {
  id: string
  name: string
  email: string
  createdAt: string
  isSuperAdmin: boolean
  tenants: {
    id: string
    name: string
    slug: string
    role: string
  }[]
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Form states
  const [name, setName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  // Fetch profile
  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setProfile(data.user)
          setName(data.user.name)
        } else {
          setError(data.error || "Erro ao carregar perfil")
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Save name
  const handleSaveName = async () => {
    if (!name.trim()) return
    setSavingName(true)
    setNameSuccess(false)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Erro ao salvar")
      }

      setNameSuccess(true)
      // Update session
      await updateSession({ name })
      setTimeout(() => setNameSuccess(false), 3000)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar nome")
    } finally {
      setSavingName(false)
    }
  }

  // Save password
  const handleSavePassword = async () => {
    setPasswordError("")
    setPasswordSuccess(false)

    if (!currentPassword || !newPassword) {
      setPasswordError("Preencha todos os campos")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem")
      return
    }

    if (newPassword.length < 6) {
      setPasswordError("Nova senha deve ter pelo menos 6 caracteres")
      return
    }

    setSavingPassword(true)

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar")
      }

      setPasswordSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Erro ao salvar senha")
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">{error || "Perfil não encontrado"}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Meu Perfil</h2>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e credenciais
        </p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {profile.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold">{profile.name}</h3>
                  {profile.isSuperAdmin && (
                    <Badge variant="secondary" className="gap-1">
                      <Crown className="h-3 w-3" />
                      Super Admin
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{profile.email}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Membro desde {new Date(profile.createdAt).toLocaleDateString('pt-BR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organizations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizações
          </CardTitle>
          <CardDescription>
            Organizações das quais você faz parte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {profile.tenants.map((tenant) => (
              <div
                key={tenant.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                  </div>
                </div>
                <Badge variant="outline" className="gap-1">
                  <Shield className="h-3 w-3" />
                  {tenant.role}
                </Badge>
              </div>
            ))}

            {profile.tenants.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Você não está em nenhuma organização
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Name */}
      <Card>
        <CardHeader>
          <CardTitle>Alterar Nome</CardTitle>
          <CardDescription>
            Atualize seu nome de exibição
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="name" className="sr-only">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <Button
              onClick={handleSaveName}
              disabled={savingName || name === profile.name}
            >
              {savingName ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : nameSuccess ? (
                <Check className="h-4 w-4" />
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Mantenha sua conta segura atualizando sua senha regularmente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            {passwordError && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="bg-green-100 text-green-800 text-sm p-3 rounded-md">
                Senha alterada com sucesso!
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
              />
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
              />
            </div>

            <Button
              onClick={handleSavePassword}
              disabled={savingPassword}
              className="w-full"
            >
              {savingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Alterar Senha
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
