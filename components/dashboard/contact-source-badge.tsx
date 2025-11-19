import { Badge } from "@/components/ui/badge"

interface ContactSourceBadgeProps {
  source?: 'linkedin' | 'google' | 'website' | 'estimated' | 'congonhas_api' | 'novavidati'
  className?: string
}

export default function ContactSourceBadge({ source, className }: ContactSourceBadgeProps) {
  if (!source) return null

  const config = {
    novavidati: {
      label: 'SCOUT',
      className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: '🎯'
    },
    congonhas_api: {
      label: 'Verificado - API',
      className: 'bg-green-100 text-green-800 border-green-300',
      icon: '✓'
    },
    linkedin: {
      label: 'LinkedIn',
      className: 'bg-sky-100 text-sky-800 border-sky-300',
      icon: '🔗'
    },
    google: {
      label: 'Google Search',
      className: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: ''
    },
    website: {
      label: 'Website',
      className: 'bg-purple-100 text-purple-800 border-purple-300',
      icon: ''
    },
    estimated: {
      label: 'Estimado',
      className: 'bg-gray-100 text-gray-800 border-gray-300',
      icon: '⚡'
    }
  }

  const badgeConfig = config[source] || {
    label: source,
    className: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: '📌'
  }

  return (
    <Badge variant="outline" className={`text-xs ${badgeConfig.className} ${className}`}>
      <span className="mr-1">{badgeConfig.icon}</span>
      {badgeConfig.label}
    </Badge>
  )
}
