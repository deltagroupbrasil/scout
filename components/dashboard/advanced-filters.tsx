"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { X, Filter, RotateCcw } from 'lucide-react'

export interface AdvancedFilters {
  revenue?: string
  employees?: string
  priority?: string
  source?: string
  sector?: string
}

interface AdvancedFiltersProps {
  filters: AdvancedFilters
  onFiltersChange: (filters: AdvancedFilters) => void
  onReset: () => void
}

export default function AdvancedFilters({
  filters,
  onFiltersChange,
  onReset,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const updateFilter = (key: keyof AdvancedFilters, value: string) => {
    const newFilters = { ...filters }
    if (value === 'all') {
      delete newFilters[key]
    } else {
      newFilters[key] = value
    }
    onFiltersChange(newFilters)
  }

  const hasActiveFilters = Object.keys(filters).length > 0

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Filter className="h-4 w-4" />
        Filtros Avançados
        {hasActiveFilters && (
          <span className="ml-1 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
            {Object.keys(filters).length}
          </span>
        )}
      </Button>
    )
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold">Filtros Avançados</h3>
          {hasActiveFilters && (
            <span className="rounded-full bg-blue-500 px-2 py-1 text-xs text-white">
              {Object.keys(filters).length} ativos
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="gap-1 text-sm"
            >
              <RotateCcw className="h-3 w-3" />
              Limpar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Filtro de Receita */}
        <div className="space-y-2">
          <Label htmlFor="revenue-filter">Receita Anual</Label>
          <Select
            value={filters.revenue || 'all'}
            onValueChange={(value) => updateFilter('revenue', value)}
          >
            <SelectTrigger id="revenue-filter">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="0-10M">Até R$ 10M</SelectItem>
              <SelectItem value="10M-50M">R$ 10M - R$ 50M</SelectItem>
              <SelectItem value="50M-100M">R$ 50M - R$ 100M</SelectItem>
              <SelectItem value="100M-500M">R$ 100M - R$ 500M</SelectItem>
              <SelectItem value="500M+">Acima de R$ 500M</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Funcionários */}
        <div className="space-y-2">
          <Label htmlFor="employees-filter">Funcionários</Label>
          <Select
            value={filters.employees || 'all'}
            onValueChange={(value) => updateFilter('employees', value)}
          >
            <SelectTrigger id="employees-filter">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="0-50">Até 50</SelectItem>
              <SelectItem value="50-200">50 - 200</SelectItem>
              <SelectItem value="200-500">200 - 500</SelectItem>
              <SelectItem value="500-1000">500 - 1.000</SelectItem>
              <SelectItem value="1000+">Acima de 1.000</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Prioridade */}
        <div className="space-y-2">
          <Label htmlFor="priority-filter">Prioridade</Label>
          <Select
            value={filters.priority || 'all'}
            onValueChange={(value) => updateFilter('priority', value)}
          >
            <SelectTrigger id="priority-filter">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="muito-alta"> Muito Alta (80-100)</SelectItem>
              <SelectItem value="alta">🟠 Alta (60-79)</SelectItem>
              <SelectItem value="media"> Média (40-59)</SelectItem>
              <SelectItem value="baixa">🔵 Baixa (20-39)</SelectItem>
              <SelectItem value="muito-baixa">⚪ Muito Baixa (0-19)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Fonte */}
        <div className="space-y-2">
          <Label htmlFor="source-filter">Fonte</Label>
          <Select
            value={filters.source || 'all'}
            onValueChange={(value) => updateFilter('source', value)}
          >
            <SelectTrigger id="source-filter">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="LinkedIn">LinkedIn</SelectItem>
              <SelectItem value="Gupy">Gupy</SelectItem>
              <SelectItem value="Catho">Catho</SelectItem>
              <SelectItem value="Indeed">Indeed</SelectItem>
              <SelectItem value="Glassdoor">Glassdoor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Setor */}
        <div className="space-y-2">
          <Label htmlFor="sector-filter">Setor</Label>
          <Select
            value={filters.sector || 'all'}
            onValueChange={(value) => updateFilter('sector', value)}
          >
            <SelectTrigger id="sector-filter">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Tecnologia">Tecnologia</SelectItem>
              <SelectItem value="Financeiro">Financeiro</SelectItem>
              <SelectItem value="Varejo">Varejo</SelectItem>
              <SelectItem value="Saúde">Saúde</SelectItem>
              <SelectItem value="Educação">Educação</SelectItem>
              <SelectItem value="Indústria">Indústria</SelectItem>
              <SelectItem value="Serviços">Serviços</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(false)}
        >
          Fechar
        </Button>
      </div>
    </div>
  )
}
