"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { formatDistance } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, Building2, Calendar, ExternalLink, Globe, Linkedin, Mail, Phone, User, Instagram, Twitter, Facebook, Youtube } from "lucide-react"
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
import RelatedJobsList from "@/components/dashboard/related-jobs-list"
import ContactSourceBadge from "@/components/dashboard/contact-source-badge"
import PartnersCard from "@/components/dashboard/partners-card"
import ContactFeedbackButtons from "@/components/dashboard/contact-feedback-buttons"
import CompanyEventsCard from "@/components/dashboard/company-events-card"
import AllContactsCard from "@/components/dashboard/all-contacts-card"

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
    partners?: string | null
    companyPhones?: string | null
    companyEmails?: string | null
    companyWhatsApp?: string | null
    instagramHandle?: string | null
    instagramVerified?: boolean | null
    twitterHandle?: string | null
    twitterVerified?: boolean | null
    facebookHandle?: string | null
    facebookVerified?: boolean | null
    youtubeHandle?: string | null
    youtubeVerified?: boolean | null
    recentNews?: string | null
    upcomingEvents?: string | null
    eventsDetectedAt?: Date | null
  }
  jobTitle: string
  jobDescription: string
  jobUrl: string
  jobPostedDate: string
  jobSource: string
  candidateCount?: number | null
  relatedJobs?: string | null
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
      // Verificar se já é string JSON válida
      if (typeof lead.suggestedContacts === 'string' && lead.suggestedContacts.startsWith('[')) {
        suggestedContacts = JSON.parse(lead.suggestedContacts)
      } else if (typeof lead.suggestedContacts === 'object') {
        // Se já é objeto, usar diretamente
        suggestedContacts = lead.suggestedContacts as any
      }
    }
    if (lead.triggers) {
      // Verificar se já é string JSON válida
      if (typeof lead.triggers === 'string' && lead.triggers.startsWith('[')) {
        triggers = JSON.parse(lead.triggers)
      } else if (typeof lead.triggers === 'object') {
        // Se já é objeto, usar diretamente
        triggers = lead.triggers as any
      }
    }
  } catch (e) {
    console.error('Erro ao parsear JSON:', e, {
      suggestedContacts: lead.suggestedContacts?.substring(0, 100),
      triggers: lead.triggers?.substring(0, 100)
    })
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

              <div className="flex flex-wrap gap-2">
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
                {lead.company.instagramHandle && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://instagram.com/${lead.company.instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative"
                    >
                      <Instagram className="h-4 w-4 mr-2" />
                      Instagram
                      {lead.company.instagramVerified && (
                        <span className="ml-1 text-green-600" title="Verificado no website">✓</span>
                      )}
                    </a>
                  </Button>
                )}
                {lead.company.twitterHandle && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://twitter.com/${lead.company.twitterHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Twitter className="h-4 w-4 mr-2" />
                      Twitter
                      {lead.company.twitterVerified && (
                        <span className="ml-1 text-green-600" title="Verificado no website">✓</span>
                      )}
                    </a>
                  </Button>
                )}
                {lead.company.facebookHandle && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://facebook.com/${lead.company.facebookHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Facebook className="h-4 w-4 mr-2" />
                      Facebook
                      {lead.company.facebookVerified && (
                        <span className="ml-1 text-green-600" title="Verificado no website">✓</span>
                      )}
                    </a>
                  </Button>
                )}
                {lead.company.youtubeHandle && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://youtube.com/${lead.company.youtubeHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Youtube className="h-4 w-4 mr-2" />
                      YouTube
                      {lead.company.youtubeVerified && (
                        <span className="ml-1 text-green-600" title="Verificado no website">✓</span>
                      )}
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
                Vaga Principal
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
                  Verificar Vaga
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Vagas Relacionadas */}
          <RelatedJobsList
            relatedJobsJson={lead.relatedJobs || null}
            companyName={lead.company.name}
          />

          {/* Eventos e Notícias */}
          <CompanyEventsCard
            recentNewsJson={lead.company.recentNews}
            upcomingEventsJson={lead.company.upcomingEvents}
            eventsDetectedAt={lead.company.eventsDetectedAt}
          />

          {/* Gatilhos de Abordagem */}
          {triggers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>💡</span>
                  Gatilhos de Abordagem
                </CardTitle>
                <CardDescription>
                  Insights contextualizados baseados em eventos e dados da empresa
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {triggers.map((trigger, idx) => (
                    <li key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-blue-600 mt-0.5 font-bold">{idx + 1}.</span>
                      <span className="text-sm text-gray-800 leading-relaxed">{trigger}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

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
          {/* Sócios e Decisores (dados verificados - prioridade) */}
          <PartnersCard
            partnersJson={lead.company.partners}
            companyPhones={lead.company.companyPhones}
            companyEmails={lead.company.companyEmails}
            companyWhatsApp={lead.company.companyWhatsApp}
          />

          {/* Outros Possíveis Contatos (sugeridos por IA - menos precisos) */}
          {suggestedContacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Outros Possíveis Contatos
                </CardTitle>
                <CardDescription>
                  Estimados por IA - validar antes de usar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {suggestedContacts.map((contact, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold">{contact.name}</p>
                        <p className="text-sm text-gray-500">{contact.role}</p>
                      </div>
                      <ContactSourceBadge source={contact.source} />
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

                    {/* Botões de Feedback */}
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-gray-500 mb-2">Este contato está correto?</p>
                      <ContactFeedbackButtons
                        leadId={lead.id}
                        contact={contact}
                      />
                    </div>

                    {idx < suggestedContacts.length - 1 && <hr className="mt-4" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
