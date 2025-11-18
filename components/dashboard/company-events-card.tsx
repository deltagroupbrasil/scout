'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, TrendingUp, Award, Briefcase, Rocket, Newspaper } from 'lucide-react'
import { formatDistance } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CompanyEvent {
  type: 'news' | 'leadership_change' | 'funding' | 'award' | 'product_launch' | 'conference' | 'expansion'
  title: string
  description?: string
  date: string
  source: string
  url?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
}

interface CompanyEventsCardProps {
  recentNewsJson?: string | null
  upcomingEventsJson?: string | null
  eventsDetectedAt?: Date | null
}

export default function CompanyEventsCard({
  recentNewsJson,
  upcomingEventsJson,
  eventsDetectedAt
}: CompanyEventsCardProps) {
  // Parse JSON fields
  let recentNews: CompanyEvent[] = []
  let upcomingEvents: CompanyEvent[] = []

  try {
    if (recentNewsJson) {
      // Verificar se já é string JSON válida
      if (typeof recentNewsJson === 'string' && recentNewsJson.startsWith('[')) {
        recentNews = JSON.parse(recentNewsJson)
      } else if (typeof recentNewsJson === 'object') {
        // Se já é objeto/array, usar diretamente
        recentNews = Array.isArray(recentNewsJson) ? recentNewsJson : []
      }
    }
    if (upcomingEventsJson) {
      // Verificar se já é string JSON válida
      if (typeof upcomingEventsJson === 'string' && upcomingEventsJson.startsWith('[')) {
        upcomingEvents = JSON.parse(upcomingEventsJson)
      } else if (typeof upcomingEventsJson === 'object') {
        // Se já é objeto/array, usar diretamente
        upcomingEvents = Array.isArray(upcomingEventsJson) ? upcomingEventsJson : []
      }
    }
  } catch (e) {
    console.error('Erro ao parsear eventos:', e, {
      recentNews: typeof recentNewsJson === 'string' ? recentNewsJson.substring(0, 100) : recentNewsJson,
      upcomingEvents: typeof upcomingEventsJson === 'string' ? upcomingEventsJson.substring(0, 100) : upcomingEventsJson
    })
  }

  // Se não tem nenhum evento, não renderizar o card
  if (recentNews.length === 0 && upcomingEvents.length === 0) {
    return null
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'funding':
        return <TrendingUp className="h-4 w-4" />
      case 'leadership_change':
        return <Briefcase className="h-4 w-4" />
      case 'award':
        return <Award className="h-4 w-4" />
      case 'expansion':
        return <Rocket className="h-4 w-4" />
      case 'news':
      default:
        return <Newspaper className="h-4 w-4" />
    }
  }

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case 'funding':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'leadership_change':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'award':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'expansion':
        return 'bg-purple-100 text-purple-800 border-purple-300'
      case 'news':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getEventLabel = (type: string) => {
    switch (type) {
      case 'funding':
        return 'Investimento'
      case 'leadership_change':
        return 'Mudança de Liderança'
      case 'award':
        return 'Prêmio'
      case 'expansion':
        return 'Expansão'
      case 'product_launch':
        return 'Lançamento'
      case 'conference':
        return 'Evento'
      case 'news':
      default:
        return 'Notícia'
    }
  }

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return ''
      case 'negative':
        return ''
      case 'neutral':
      default:
        return '⚪'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Eventos e Notícias
        </CardTitle>
        <CardDescription>
          {eventsDetectedAt
            ? `Última atualização ${formatDistance(new Date(eventsDetectedAt), new Date(), { addSuffix: true, locale: ptBR })}`
            : 'Eventos detectados automaticamente'}
          {recentNews.length > 0 && upcomingEvents.length > 0 && (
            <span className="ml-2">
              • {recentNews.length} notícias • {upcomingEvents.length} eventos futuros
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notícias Recentes */}
        {recentNews.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Newspaper className="h-4 w-4" />
              Notícias Recentes ({recentNews.length})
            </h3>
            <div className="space-y-3">
              {recentNews.map((news, idx) => (
                <div key={idx} className="border-l-2 border-gray-200 pl-4 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {news.url ? (
                        <a
                          href={news.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm text-blue-600 hover:underline"
                        >
                          {news.title}
                        </a>
                      ) : (
                        <p className="font-medium text-sm">{news.title}</p>
                      )}
                      {news.description && (
                        <p className="text-xs text-gray-600 mt-1">{news.description}</p>
                      )}
                    </div>
                    {news.sentiment && (
                      <span className="text-lg" title={news.sentiment}>
                        {getSentimentIcon(news.sentiment)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{news.source}</span>
                    <span>•</span>
                    <span>
                      {formatDistance(new Date(news.date), new Date(), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Eventos Futuros */}
        {upcomingEvents.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Rocket className="h-4 w-4 text-purple-600" />
              Próximos Eventos ({upcomingEvents.length})
            </h3>
            <div className="space-y-3">
              {upcomingEvents.map((event, idx) => (
                <div key={idx} className="border-l-2 border-purple-300 pl-4 space-y-1 bg-purple-50/50 rounded-r-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className={getEventBadgeColor(event.type)}>
                      <span className="flex items-center gap-1">
                        {getEventIcon(event.type)}
                        {getEventLabel(event.type)}
                      </span>
                    </Badge>
                    <span className="text-xs font-medium text-purple-700">
                      🗓️ {formatDistance(new Date(event.date), new Date(), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </span>
                  </div>
                  <p className="font-medium text-sm text-purple-900">{event.title}</p>
                  {event.description && (
                    <p className="text-xs text-gray-700">{event.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>📍 {event.source}</span>
                  </div>
                  <div className="mt-2 p-2 bg-white rounded border border-purple-200">
                    <p className="text-xs text-purple-800 font-medium">
                      💡 Gatilho de abordagem: Use este evento como ponto de entrada para iniciar contato
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insight de Abordagem */}
        {(recentNews.length > 0 || upcomingEvents.length > 0) && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800 font-medium flex items-center gap-2">
              <span></span>
              <span>
                Use esses eventos como gatilhos de abordagem para iniciar conversas relevantes e contextualizadas.
              </span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
