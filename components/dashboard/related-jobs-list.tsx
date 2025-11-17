"use client"

import { useState } from "react"
import { formatDistance } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ChevronDown, ChevronUp, ExternalLink, Briefcase, Users, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RelatedJob } from "@/types"

interface RelatedJobsListProps {
  relatedJobsJson: string | null
  companyName: string
}

export default function RelatedJobsList({ relatedJobsJson, companyName }: RelatedJobsListProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Parse JSON
  let relatedJobs: RelatedJob[] = []
  try {
    if (relatedJobsJson) {
      // Verificar se já é string JSON válida
      if (typeof relatedJobsJson === 'string' && relatedJobsJson.startsWith('[')) {
        relatedJobs = JSON.parse(relatedJobsJson)
      } else if (typeof relatedJobsJson === 'object') {
        // Se já é objeto/array, usar diretamente
        relatedJobs = Array.isArray(relatedJobsJson) ? relatedJobsJson : []
      }
    }
  } catch (e) {
    console.error('Erro ao parsear relatedJobs:', e, {
      value: typeof relatedJobsJson === 'string' ? relatedJobsJson.substring(0, 100) : relatedJobsJson
    })
  }

  if (relatedJobs.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Vagas Relacionadas
            </CardTitle>
            <CardDescription>
              {relatedJobs.length} {relatedJobs.length === 1 ? 'vaga adicional' : 'vagas adicionais'} da mesma empresa
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Ocultar
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Ver todas
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {relatedJobs.map((job, index) => {
            const postedDate = new Date(job.postedDate)
            const daysAgo = formatDistance(postedDate, new Date(), {
              addSuffix: true,
              locale: ptBR
            })

            return (
              <div key={index} className="border rounded-lg p-4 space-y-3 hover:bg-gray-50 transition">
                {/* Header da Vaga */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-base">{job.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{companyName}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={job.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>

                {/* Metadados */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{daysAgo}</span>
                  </div>
                  {job.candidateCount && (
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{job.candidateCount} candidatos</span>
                    </div>
                  )}
                </div>

                {/* Descrição (truncada) */}
                {job.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {job.description}
                  </p>
                )}

                {index < relatedJobs.length - 1 && <hr className="mt-4" />}
              </div>
            )
          })}

          {/* Resumo */}
          <div className="bg-blue-50 rounded-lg p-3 mt-4">
            <p className="text-sm text-blue-800">
               <strong>Insight:</strong> {companyName} tem {relatedJobs.length + 1} vagas abertas na área financeira,
              indicando forte expansão do setor de Controladoria. Momento ideal para abordagem consultiva!
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
