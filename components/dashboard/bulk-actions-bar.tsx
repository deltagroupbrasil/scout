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
import {
  CheckSquare,
  XSquare,
  Trash2,
  UserPlus,
  Download,
  Loader2,
  X
} from 'lucide-react'
import { LeadStatus } from '@prisma/client'
import { toast } from 'sonner'

export interface BulkActionsBarProps {
  selectedLeadIds: string[]
  onClearSelection: () => void
  onActionComplete: () => void
  users?: Array<{ id: string; name: string; email: string }>
}

export default function BulkActionsBar({
  selectedLeadIds,
  onClearSelection,
  onActionComplete,
  users = []
}: BulkActionsBarProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | ''>('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  const selectedCount = selectedLeadIds.length

  if (selectedCount === 0) {
    return null
  }

  const executeBulkAction = async (
    action: 'updateStatus' | 'assign' | 'delete' | 'export',
    data?: any
  ) => {
    setIsLoading(true)

    try {
      const response = await fetch('/api/leads/bulk', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          leadIds: selectedLeadIds,
          data
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao executar ação')
      }

      // Tratamento específico por ação
      switch (action) {
        case 'updateStatus':
          toast.success(` ${result.result.count} leads atualizados para ${getStatusLabel(data.status)}`)
          onActionComplete()
          onClearSelection()
          break

        case 'assign':
          toast.success(` ${result.result.count} leads atribuídos para ${result.result.assignedToName}`)
          onActionComplete()
          onClearSelection()
          break

        case 'delete':
          toast.success(`🗑 ${result.result.count} leads descartados`)
          onActionComplete()
          onClearSelection()
          break

        case 'export':
          // Download CSV
          downloadCSV(result.result.data)
          toast.success(`📥 ${result.result.count} leads exportados`)
          break
      }
    } catch (error: any) {
      console.error('Erro na ação em massa:', error)
      toast.error(` ${error.message || 'Erro ao executar ação'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = () => {
    if (!selectedStatus) {
      toast.error('Selecione um status')
      return
    }

    executeBulkAction('updateStatus', { status: selectedStatus })
  }

  const handleAssign = () => {
    if (!selectedUserId) {
      toast.error('Selecione um usuário')
      return
    }

    executeBulkAction('assign', { assignedToId: selectedUserId })
  }

  const handleDelete = () => {
    if (!confirm(`Tem certeza que deseja descartar ${selectedCount} leads?`)) {
      return
    }

    executeBulkAction('delete')
  }

  const handleExport = () => {
    executeBulkAction('export')
  }

  const downloadCSV = (data: any[]) => {
    if (!data || data.length === 0) {
      toast.error('Nenhum dado para exportar')
      return
    }

    // Gerar CSV
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header]
          // Escapar valores com vírgula ou aspas
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getStatusLabel = (status: LeadStatus): string => {
    const labels: Record<LeadStatus, string> = {
      NEW: 'Novo',
      CONTACTED: 'Contatado',
      QUALIFIED: 'Qualificado',
      DISCARDED: 'Descartado'
    }
    return labels[status]
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform">
      <div className="rounded-lg border bg-white shadow-lg">
        <div className="flex items-center gap-4 px-6 py-4">
          {/* Counter */}
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-gray-900">
              {selectedCount} {selectedCount === 1 ? 'lead selecionado' : 'leads selecionados'}
            </span>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* Update Status */}
          <div className="flex items-center gap-2">
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as LeadStatus)}
              disabled={isLoading}
            >
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="Alterar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LeadStatus.NEW}> Novo</SelectItem>
                <SelectItem value={LeadStatus.CONTACTED}>📞 Contatado</SelectItem>
                <SelectItem value={LeadStatus.QUALIFIED}> Qualificado</SelectItem>
                <SelectItem value={LeadStatus.DISCARDED}>🗑 Descartado</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleUpdateStatus}
              disabled={!selectedStatus || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Aplicar'
              )}
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* Assign User */}
          {users.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedUserId}
                  onValueChange={setSelectedUserId}
                  disabled={isLoading}
                >
                  <SelectTrigger className="h-9 w-[160px]">
                    <SelectValue placeholder="Atribuir para" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleAssign}
                  disabled={!selectedUserId || isLoading}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>

              <div className="h-6 w-px bg-gray-300" />
            </>
          )}

          {/* Export */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={isLoading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>

          {/* Delete */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDelete}
            disabled={isLoading}
            className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            Descartar
          </Button>

          <div className="h-6 w-px bg-gray-300" />

          {/* Clear Selection */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            disabled={isLoading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
