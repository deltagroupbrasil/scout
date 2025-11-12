"use client"

import { useEffect, useState } from "react"
import { LeadFilters, LeadWithCompany, PaginatedResponse } from "@/types"
import LeadFiltersComponent from "@/components/dashboard/lead-filters"
import LeadsTable from "@/components/dashboard/leads-table"
import ScrapeButton from "@/components/dashboard/scrape-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
  const [leads, setLeads] = useState<LeadWithCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<LeadFilters>({
    status: 'ALL',
    dateRange: '30d'
  })
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    contacted: 0
  })

  useEffect(() => {
    fetchLeads()
  }, [filters])

  async function fetchLeads() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status && filters.status !== 'ALL') params.set('status', filters.status)
      if (filters.search) params.set('search', filters.search)
      if (filters.dateRange) params.set('dateRange', filters.dateRange)

      const response = await fetch(`/api/leads?${params}`)
      if (!response.ok) throw new Error('Erro ao buscar leads')

      const data: PaginatedResponse<LeadWithCompany> = await response.json()
      setLeads(data.data)

      // Calcular estatísticas
      const newCount = data.data.filter(l => l.isNew).length
      const contactedCount = data.data.filter(l => l.status === 'CONTACTED').length

      setStats({
        total: data.total,
        new: newCount,
        contacted: contactedCount
      })
    } catch (error) {
      console.error('Erro ao buscar leads:', error)
    } finally {
      setLoading(false)
    }
  }

  async function exportToCSV() {
    const params = new URLSearchParams()
    if (filters.status && filters.status !== 'ALL') params.set('status', filters.status)
    if (filters.search) params.set('search', filters.search)
    if (filters.dateRange) params.set('dateRange', filters.dateRange)

    const url = `/api/leads/export?${params}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-500">
          Gerencie seus leads de prospecção B2B
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <span className="text-2xl">📊</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500">
              {filters.dateRange === '7d' ? 'Últimos 7 dias' : filters.dateRange === '30d' ? 'Últimos 30 dias' : 'Todos'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Novos</CardTitle>
            <span className="text-2xl">🆕</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.new}</div>
            <p className="text-xs text-gray-500">
              Menos de 48 horas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contatados</CardTitle>
            <span className="text-2xl">📞</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contacted}</div>
            <p className="text-xs text-gray-500">
              Primeiro contato feito
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Leads</CardTitle>
              <CardDescription>
                Filtre e gerencie suas oportunidades de negócio
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <ScrapeButton onComplete={fetchLeads} />
              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar CSV
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <LeadFiltersComponent filters={filters} onFilterChange={setFilters} />

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Carregando...</div>
            </div>
          ) : (
            <LeadsTable leads={leads} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
