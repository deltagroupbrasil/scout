"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Search, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ScrapeButtonProps {
  onComplete?: () => void
  isAdmin?: boolean
}

export default function ScrapeButton({ onComplete, isAdmin = false }: ScrapeButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleScrape() {
    if (!isAdmin) {
      toast({
        title: "Acesso restrito",
        description: "Apenas administradores podem buscar novas vagas",
        variant: "destructive",
      })
      return
    }

    console.log('🔵 Botão "Buscar" clicado!')
    setLoading(true)

    try {
      console.log('📡 Enviando requisição para /api/scrape...')

      toast({
        title: "Buscando vagas...",
        description: "Aguarde enquanto procuramos novas oportunidades (limite: 50 empresas)",
      })

      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'Controller OR CFO OR "Gerente Financeiro" OR "Diretor Financeiro" OR Controladoria São Paulo',
          maxCompanies: 50  // Timeout de 300s configurado no vercel.json
        }),
      })

      console.log('📥 Resposta recebida:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(' Erro na resposta:', errorText)
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(' Dados recebidos:', data)

      toast({
        title: "Busca concluída!",
        description: data.message || `${data.count} novas vagas encontradas`,
      })

      // Chamar callback para recarregar lista
      if (onComplete) {
        console.log(' Recarregando lista de leads...')
        onComplete()
      }
    } catch (error) {
      console.error(' Erro ao buscar vagas:', error)
      toast({
        title: "Erro ao buscar vagas",
        description: error instanceof Error ? error.message : "Tente novamente em alguns instantes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      console.log('🏁 Busca finalizada')
    }
  }

  // Não renderizar o botão para não-admin
  if (!isAdmin) {
    return null
  }

  return (
    <Button
      onClick={handleScrape}
      disabled={loading}
      variant="default"
      className="gap-2"
    >
      {loading ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          Buscando...
        </>
      ) : (
        <>
          <Search className="h-4 w-4" />
          Buscar Novas Vagas
        </>
      )}
    </Button>
  )
}
