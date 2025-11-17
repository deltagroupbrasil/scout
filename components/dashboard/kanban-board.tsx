"use client"

import { useState } from "react"
import { LeadStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Building2, MapPin, Users as UsersIcon, DollarSign, Calendar, MessageSquare, Phone, Mail, ExternalLink, UserPlus, UserMinus } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  email: string
}

interface Company {
  id: string
  name: string
  cnpj?: string | null
  revenue?: number | null
  employees?: number | null
  sector?: string | null
  location?: string | null
  website?: string | null
  linkedinUrl?: string | null
  companyPhones?: string | null
  companyEmails?: string | null
  companyWhatsApp?: string | null
}

interface Lead {
  id: string
  company: Company
  jobTitle: string
  jobDescription: string
  jobUrl: string
  jobPostedDate: Date
  status: LeadStatus
  priorityScore: number
  isNew: boolean
  createdAt: Date
  assignedTo?: User | null
  assignedAt?: Date | null
  _count: {
    notes: number
  }
}

interface LeadsByStatus {
  NEW: Lead[]
  CONTACTED: Lead[]
  QUALIFIED: Lead[]
  DISCARDED: Lead[]
}

interface KanbanBoardProps {
  initialLeads: LeadsByStatus
  users: User[]
  currentUserId: string
  showAll: boolean
}

const statusConfig = {
  NEW: {
    label: 'Novos',
    color: 'bg-blue-50 border-blue-200',
    badgeColor: 'bg-blue-500',
    textColor: 'text-blue-700',
    icon: '',
  },
  CONTACTED: {
    label: 'Em Contato',
    color: 'bg-yellow-50 border-yellow-200',
    badgeColor: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    icon: '📞',
  },
  QUALIFIED: {
    label: 'Qualificados',
    color: 'bg-green-50 border-green-200',
    badgeColor: 'bg-green-500',
    textColor: 'text-green-700',
    icon: '',
  },
  DISCARDED: {
    label: 'Descartados',
    color: 'bg-gray-50 border-gray-200',
    badgeColor: 'bg-gray-500',
    textColor: 'text-gray-700',
    icon: '',
  },
}

export default function KanbanBoard({ initialLeads, users, currentUserId, showAll }: KanbanBoardProps) {
  const router = useRouter()
  const [leads, setLeads] = useState<LeadsByStatus>(initialLeads)
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [draggedFromStatus, setDraggedFromStatus] = useState<LeadStatus | null>(null)

  const handleDragStart = (lead: Lead, status: LeadStatus) => {
    setDraggedLead(lead)
    setDraggedFromStatus(status)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault()

    if (!draggedLead || !draggedFromStatus || draggedFromStatus === newStatus) {
      setDraggedLead(null)
      setDraggedFromStatus(null)
      return
    }

    // Atualizar UI otimista
    const newLeads = { ...leads }
    newLeads[draggedFromStatus] = newLeads[draggedFromStatus].filter(l => l.id !== draggedLead.id)
    newLeads[newStatus] = [...newLeads[newStatus], { ...draggedLead, status: newStatus }]
    setLeads(newLeads)

    // Atualizar no servidor
    try {
      await fetch(`/api/leads/${draggedLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
    } catch (error) {
      console.error('Erro ao atualizar lead:', error)
      // Reverter em caso de erro
      setLeads(initialLeads)
    }

    setDraggedLead(null)
    setDraggedFromStatus(null)
  }

  const handleAssignLead = async (leadId: string, userId: string | null) => {
    try {
      await fetch(`/api/leads/${leadId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: userId }),
      })

      // Recarregar página para atualizar dados
      router.refresh()
    } catch (error) {
      console.error('Erro ao atribuir lead:', error)
    }
  }

  const getPriorityBadge = (score: number) => {
    if (score >= 80) return <Badge variant="destructive">Muito Alta</Badge>
    if (score >= 60) return <Badge className="bg-orange-500 hover:bg-orange-600">Alta</Badge>
    if (score >= 40) return <Badge className="bg-yellow-500 hover:bg-yellow-600">Média</Badge>
    if (score >= 20) return <Badge variant="secondary">Baixa</Badge>
    return <Badge variant="outline">Muito Baixa</Badge>
  }

  const formatRevenue = (revenue: number | null) => {
    if (!revenue) return null
    if (revenue >= 1000000) return `R$ ${(revenue / 1000000).toFixed(1)}M`
    if (revenue >= 1000) return `R$ ${(revenue / 1000).toFixed(0)}K`
    return `R$ ${revenue}`
  }

  const getContactInfo = (company: Company) => {
    const phones = company.companyPhones ? JSON.parse(company.companyPhones) : []
    const emails = company.companyEmails ? JSON.parse(company.companyEmails) : []

    return {
      phone: phones[0] || company.companyWhatsApp || null,
      email: emails[0] || null,
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center gap-2">
        <Button
          variant={showAll ? "outline" : "default"}
          size="sm"
          onClick={() => router.push('/dashboard/kanban')}
        >
          Meus Leads
        </Button>
        <Button
          variant={showAll ? "default" : "outline"}
          size="sm"
          onClick={() => router.push('/dashboard/kanban?view=all')}
        >
          Todos os Leads
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full">
      {(Object.keys(statusConfig) as LeadStatus[]).map((status) => {
        const config = statusConfig[status]
        const statusLeads = leads[status] || []

        return (
          <div
            key={status}
            className={cn(
              "flex flex-col rounded-lg border-2 border-dashed p-4",
              config.color
            )}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Header da coluna */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{config.icon}</span>
                <h2 className={cn("font-semibold text-lg", config.textColor)}>
                  {config.label}
                </h2>
              </div>
              <Badge variant="outline" className={cn("font-bold", config.textColor)}>
                {statusLeads.length}
              </Badge>
            </div>

            {/* Cards dos leads */}
            <div className="flex flex-col gap-3 overflow-y-auto flex-1">
              {statusLeads.map((lead) => {
                const contactInfo = getContactInfo(lead.company)

                return (
                  <Card
                    key={lead.id}
                    draggable
                    onDragStart={() => handleDragStart(lead, status)}
                    className="cursor-move hover:shadow-lg transition-shadow"
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex justify-between items-start mb-2">
                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="text-sm font-semibold hover:underline flex items-center gap-1"
                        >
                          <Building2 className="h-4 w-4" />
                          {lead.company.name}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        {lead.isNew && (
                          <Badge variant="default" className="text-xs">Novo</Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {lead.jobTitle}
                      </p>

                      {/* Atribuição */}
                      <div className="mt-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full text-xs h-7">
                              {lead.assignedTo ? (
                                <>
                                  <UsersIcon className="h-3 w-3 mr-1" />
                                  {lead.assignedTo.name}
                                </>
                              ) : (
                                <>
                                  <UserPlus className="h-3 w-3 mr-1" />
                                  Atribuir
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuLabel>Atribuir para:</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {users.map((user) => (
                              <DropdownMenuItem
                                key={user.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAssignLead(lead.id, user.id)
                                }}
                              >
                                {user.name}
                                {user.id === currentUserId && " (você)"}
                              </DropdownMenuItem>
                            ))}
                            {lead.assignedTo && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleAssignLead(lead.id, null)
                                  }}
                                  className="text-red-600"
                                >
                                  <UserMinus className="h-3 w-3 mr-2" />
                                  Remover atribuição
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-2">
                      {/* Prioridade */}
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(lead.priorityScore)}
                        <span className="text-xs text-muted-foreground">
                          {lead.priorityScore} pts
                        </span>
                      </div>

                      {/* Dados da empresa */}
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {lead.company.revenue && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatRevenue(lead.company.revenue)}
                          </div>
                        )}
                        {lead.company.employees && (
                          <div className="flex items-center gap-1">
                            <UsersIcon className="h-3 w-3" />
                            {lead.company.employees} funcionários
                          </div>
                        )}
                        {lead.company.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {lead.company.location}
                          </div>
                        )}
                      </div>

                      {/* Ações rápidas */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        {contactInfo.phone && (
                          <a
                            href={`tel:${contactInfo.phone}`}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Phone className="h-3 w-3" />
                            Ligar
                          </a>
                        )}
                        {contactInfo.email && (
                          <a
                            href={`mailto:${contactInfo.email}`}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Mail className="h-3 w-3" />
                            Email
                          </a>
                        )}
                        {lead._count.notes > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            {lead._count.notes}
                          </div>
                        )}
                      </div>

                      {/* Data de criação */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(lead.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}

              {statusLeads.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Nenhum lead nesta coluna
                </div>
              )}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
