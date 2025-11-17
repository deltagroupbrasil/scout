"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ScrapeButtonProps {
  onComplete?: () => void
}

export default function ScrapeButton({ onComplete }: ScrapeButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  async function handleScrape() {
    console.log('🔵 Botão "Buscar" clicado!')
    setLoading(true)

    try {
      console.log('📡 Enviando requisição para /api/cron/scrape-leads...')

      toast({
        title: "Buscando vagas...",
        description: "Aguarde enquanto procuramos novas oportunidades (limite: 20 empresas)",
      })

      const response = await fetch('/api/cron/scrape-leads', {
        method: 'POST',
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
        description: `${data.leadsCreated} novas vagas encontradas em ${Math.floor(data.duration / 60)} minutos`,
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
