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

const REVENUE_LABELS = {
  'all': 'Qualquer faturamento',
  '0-10M': 'Até R$ 10M',
  '10M-50M': 'R$ 10M - R$ 50M',
  '50M-100M': 'R$ 50M - R$ 100M',
  '100M-500M': 'R$ 100M - R$ 500M',
  '500M+': 'Acima de R$ 500M'
}

const EMPLOYEES_LABELS = {
  'all': 'Qualquer tamanho',
  '0-50': 'Até 50 funcionários',
  '50-200': '50 - 200 funcionários',
  '200-500': '200 - 500 funcionários',
  '500-1000': '500 - 1000 funcionários',
  '1000+': 'Acima de 1000 funcionários'
}

export default function LeadFiltersComponent({ filters, onFilterChange }: LeadFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Filtros principais */}
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

      {/* Filtros avançados */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.revenue || 'all'}
          onValueChange={(value) =>
            onFilterChange({ ...filters, revenue: value === 'all' ? undefined : value as any })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Faturamento" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(REVENUE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.employees || 'all'}
          onValueChange={(value) =>
            onFilterChange({ ...filters, employees: value === 'all' ? undefined : value as any })
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Funcionários" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(EMPLOYEES_LABELS).map(([value, label]) => (
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
