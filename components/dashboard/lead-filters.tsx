"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LeadFilters } from "@/types"
import { LeadStatus } from "@prisma/client"

interface LeadFiltersProps {
  filters: LeadFilters
  onFilterChange: (filters: LeadFilters) => void
}

const STATUS_LABELS: Record<LeadStatus | 'ALL', string> = {
  ALL: 'Todos',
  NEW: 'Novo',
  CONTACTED: 'Contatado',
  QUALIFIED: 'Qualificado',
  DISCARDED: 'Descartado'
}

const DATE_RANGE_LABELS = {
  '7d': 'Última semana',
  '30d': 'Último mês',
  'all': 'Todos'
}

export default function LeadFiltersComponent({ filters, onFilterChange }: LeadFiltersProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="flex-1">
        <Input
          placeholder="Buscar empresa..."
          value={filters.search || ''}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          className="max-w-sm"
        />
      </div>

      <div className="flex gap-2">
        <Select
          value={filters.status || 'ALL'}
          onValueChange={(value) =>
            onFilterChange({ ...filters, status: value as LeadStatus | 'ALL' })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.dateRange || 'all'}
          onValueChange={(value) =>
            onFilterChange({ ...filters, dateRange: value as '7d' | '30d' | 'all' })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Data" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
