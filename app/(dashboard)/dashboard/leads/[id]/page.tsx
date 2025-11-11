"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { formatDistance } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, Building2, Calendar, ExternalLink, Globe, Linkedin, Mail, Phone, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LeadStatus } from "@prisma/client"
import { SuggestedContact } from "@/types"

interface Lead {
  id: string
  company: {
    name: string
    cnpj?: string | null
    revenue?: number | null
    employees?: number | null
    sector?: string | null
    location?: string | null
    website?: string | null
    linkedinUrl?: string | null
  }
  jobTitle: string
  jobDescription: string
  jobUrl: string
  jobPostedDate: string
  jobSource: string
  candidateCount?: number | null
  suggestedContacts?: string | null
  triggers?: string | null
  status: LeadStatus
  isNew: boolean
  createdAt: string
  notes: Array<{
    id: string
    content: string
    createdAt: string
    user: {
      name: string
      email: string
    }
  }>
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Novo',
  CONTACTED: 'Contatado',
  QUALIFIED: 'Qualificado',
  DISCARDED: 'Descartado'
}

function formatRevenue(revenue: number | null | undefined): string {
  if (!revenue) return 'Não informado'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(revenue)
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    fetchLead()
  }, [params.id])

  async function fetchLead() {
    try {
      const response = await fetch(`/api/leads/${params.id}`)
      if (!response.ok) throw new Error('Lead não encontrado')
      const data = await response.json()
      setLead(data)
    } catch (error) {
      console.error('Erro ao buscar lead:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(newStatus: LeadStatus) {
    try {
      const response = await fetch(`/api/leads/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, isNew: false })
      })

      if (!response.ok) throw new Error('Erro ao atualizar status')

      fetchLead()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  async function handleAddNote() {
    if (!newNote.trim()) return

    setSavingNote(true)
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: params.id,
          content: newNote
        })
      })

      if (!response.ok) throw new Error('Erro ao criar nota')

      setNewNote('')
      fetchLead()
    } catch (error) {
      console.error('Erro ao criar nota:', error)
    } finally {
      setSavingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Carregando...</div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg text-gray-500">Lead não encontrado</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">
          Voltar ao Dashboard
        </Button>
      </div>
    )
  }

  const daysAgo = formatDistance(new Date(lead.jobPostedDate), new Date(), {
    addSuffix: true,
    locale: ptBR
  })

  // Parse JSON fields
  let suggestedContacts: SuggestedContact[] = []
  let triggers: string[] = []

  try {
    if (lead.suggestedContacts) {
      suggestedContacts = JSON.parse(lead.suggestedContacts)
    }
    if (lead.triggers) {
      triggers = JSON.parse(lead.triggers)
    }
  } catch (e) {
    console.error('Erro ao parsear JSON:', e)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{lead.company.name}</h1>
            <p className="text-gray-500">{lead.company.sector || 'Setor não informado'}</p>
          </div>
        </div>

        <Select value={lead.status} onValueChange={(value) => handleStatusChange(value as LeadStatus)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Coluna Principal */}
        <div className="space-y-6 md:col-span-2">
          {/* Dados da Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dados da Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500">Faturamento Anual</p>
                  <p className="text-lg font-semibold">{formatRevenue(lead.company.revenue)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Funcionários</p>
                  <p className="text-lg font-semibold">
                    {lead.company.employees?.toLocaleString('pt-BR') || 'Não informado'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">CNPJ</p>
                  <p className="text-lg font-semibold">{lead.company.cnpj || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Localização</p>
                  <p className="text-lg font-semibold">{lead.company.location || 'Não informado'}</p>
                </div>
              </div>

              <div className="flex gap-2">
                {lead.company.website && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={lead.company.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      Website
                    </a>
                  </Button>
                )}
                {lead.company.linkedinUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={lead.company.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4 mr-2" />
                      LinkedIn
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vaga Ativa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Vaga Ativa
              </CardTitle>
              <CardDescription>
                Publicada {daysAgo} no {lead.jobSource}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">{lead.jobTitle}</h3>
                <p className="text-gray-600 text-sm whitespace-pre-line">
                  {lead.jobDescription}
                </p>
              </div>

              {lead.candidateCount && (
                <p className="text-sm text-gray-500">
                  {lead.candidateCount} candidatos
                </p>
              )}

              <Button variant="outline" asChild>
                <a href={lead.jobUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver vaga completa no LinkedIn
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Notas e Histórico */}
          <Card>
            <CardHeader>
              <CardTitle>Notas e Histórico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Adicionar nota..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button
                  onClick={handleAddNote}
                  disabled={savingNote || !newNote.trim()}
                >
                  {savingNote ? 'Salvando...' : 'Adicionar'}
                </Button>
              </div>

              <div className="space-y-4">
                {lead.notes.map((note) => (
                  <div key={note.id} className="border-l-2 border-gray-200 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{note.user.name}</span>
                      <span className="text-xs text-gray-500">
                        {formatDistance(new Date(note.createdAt), new Date(), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{note.content}</p>
                  </div>
                ))}

                {lead.notes.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nenhuma nota ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          {/* Decisores Identificados */}
          {suggestedContacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Decisores Identificados
                </CardTitle>
                <CardDescription>Sugeridos por IA</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {suggestedContacts.map((contact, idx) => (
                  <div key={idx} className="space-y-2">
                    <div>
                      <p className="font-semibold">{contact.name}</p>
                      <p className="text-sm text-gray-500">{contact.role}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {contact.linkedin && (
                        <a
                          href={contact.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Linkedin className="h-3 w-3" />
                          LinkedIn
                        </a>
                      )}
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </span>
                      )}
                    </div>
                    {idx < suggestedContacts.length - 1 && <hr />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Gatilhos de Abordagem */}
          {triggers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>🎯 Gatilhos de Abordagem</CardTitle>
                <CardDescription>Insights gerados por IA</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {triggers.map((trigger, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">✓</span>
                      <span className="text-sm">{trigger}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
