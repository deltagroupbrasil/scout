'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, X, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ContactFeedbackButtonsProps {
  leadId: string
  contact: {
    name: string
    role: string
    email?: string | null
    phone?: string | null
    source?: string
  }
  onFeedbackSubmitted?: () => void
}

export default function ContactFeedbackButtons({
  leadId,
  contact,
  onFeedbackSubmitted
}: ContactFeedbackButtonsProps) {
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<boolean | null>(null)
  const { toast } = useToast()

  const submitFeedback = async (isCorrect: boolean) => {
    setLoading(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadId,
          contactName: contact.name,
          contactRole: contact.role,
          contactEmail: contact.email,
          contactPhone: contact.phone,
          contactSource: contact.source,
          isCorrect
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao enviar feedback')
      }

      const data = await response.json()

      setFeedback(isCorrect)

      toast({
        title: 'Feedback registrado',
        description: data.message || 'Obrigado pelo seu feedback!',
        variant: 'default'
      })

      onFeedbackSubmitted?.()

    } catch (error) {
      console.error('Erro ao enviar feedback:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar o feedback. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Se já tem feedback, mostrar status
  if (feedback !== null) {
    return (
      <div className="flex items-center gap-2">
        {feedback ? (
          <div className="flex items-center gap-1 text-sm text-green-600">
            <Check className="h-4 w-4" />
            <span>Marcado como correto</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-sm text-red-600">
            <X className="h-4 w-4" />
            <span>Marcado como incorreto</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFeedback(null)}
          className="text-xs"
        >
          Alterar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => submitFeedback(true)}
        disabled={loading}
        className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <Check className="h-3 w-3 mr-1" />
            Correto
          </>
        )}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => submitFeedback(false)}
        disabled={loading}
        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <>
            <X className="h-3 w-3 mr-1" />
            Incorreto
          </>
        )}
      </Button>
    </div>
  )
}
