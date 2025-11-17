"use client"

import Link from "next/link"
import { formatDistance } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { LeadWithCompany } from "@/types"
import { LeadStatus } from "@prisma/client"

interface LeadsTableProps {
  leads: LeadWithCompany[]
  selectedLeadIds?: string[]
  onSelectLead?: (leadId: string) => void
  onSelectAll?: (selected: boolean) => void
}

const STATUS_CONFIG: Record<LeadStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  NEW: { label: 'Novo', variant: 'default' },
  CONTACTED: { label: 'Contatado', variant: 'secondary' },
  QUALIFIED: { label: 'Qualificado', variant: 'outline' },
  DISCARDED: { label: 'Descartado', variant: 'destructive' }
}

function formatRevenue(revenue: number | null | undefined): string {
  if (!revenue) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(revenue)
}

function formatEmployees(employees: number | null | undefined): string {
  if (!employees) return '-'
  return new Intl.NumberFormat('pt-BR').format(employees)
}

function getPriorityBadge(score: number) {
  if (score >= 80) {
    return { label: 'Muito Alta', className: 'bg-red-100 text-red-800' }
  }
  if (score >= 60) {
    return { label: 'Alta', className: 'bg-orange-100 text-orange-800' }
  }
  if (score >= 40) {
    return { label: 'Média', className: 'bg-yellow-100 text-yellow-800' }
  }
  if (score >= 20) {
    return { label: 'Baixa', className: 'bg-green-100 text-green-800' }
  }
  return { label: 'Muito Baixa', className: 'bg-blue-100 text-blue-800' }
}

export default function LeadsTable({
  leads,
  selectedLeadIds = [],
  onSelectLead,
  onSelectAll
}: LeadsTableProps) {
  const allSelected = leads.length > 0 && selectedLeadIds.length === leads.length
  const someSelected = selectedLeadIds.length > 0 && !allSelected

  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg text-gray-500">Nenhum lead encontrado</p>
        <p className="text-sm text-gray-400">Tente ajustar os filtros</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            {onSelectAll && (
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => onSelectAll(!!checked)}
                  aria-label="Selecionar todos"
                  className={someSelected ? "opacity-50" : ""}
                />
              </TableHead>
            )}
            <TableHead>Empresa</TableHead>
            <TableHead>Faturamento</TableHead>
            <TableHead>Funcionários</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const config = STATUS_CONFIG[lead.status]
            const priorityBadge = getPriorityBadge(lead.priorityScore || 0)
            const daysAgo = formatDistance(new Date(lead.createdAt), new Date(), {
              addSuffix: true,
              locale: ptBR
            })
            const isSelected = selectedLeadIds.includes(lead.id)

            return (
              <TableRow
                key={lead.id}
                className={`cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
              >
                {onSelectLead && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onSelectLead(lead.id)}
                      aria-label={`Selecionar ${lead.company.name}`}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Link href={`/dashboard/leads/${lead.id}`} className="block">
                    <div className="flex items-center gap-2">
                      {lead.isNew && (
                        <Badge variant="default" className="bg-green-500">
                          Novo
                        </Badge>
                      )}
                      <div>
                        <div className="font-medium">{lead.company.name}</div>
                        <div className="text-xs text-gray-500">
                          {lead.company.sector || 'Setor não informado'}
                        </div>
                      </div>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/leads/${lead.id}`} className="block">
                    {formatRevenue(lead.company.revenue)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/leads/${lead.id}`} className="block">
                    {formatEmployees(lead.company.employees)}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/leads/${lead.id}`} className="block">
                    {lead.jobTitle}
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/leads/${lead.id}`} className="block">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityBadge.className}`}>
                        {priorityBadge.label}
                      </span>
                      <span className="text-xs text-gray-500">{lead.priorityScore}/100</span>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/leads/${lead.id}`} className="block">
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </Link>
                </TableCell>
                <TableCell>
                  <Link href={`/dashboard/leads/${lead.id}`} className="block">
                    <span className="text-sm text-gray-500">{daysAgo}</span>
                  </Link>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
