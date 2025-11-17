'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp, User, Phone, Mail, ExternalLink } from 'lucide-react'

interface Partner {
  nome: string
  qualificacao: string  // Administrador, Sócio, Presidente, etc
  telefones: string[]
  emails: string[]
  linkedin: string | null
}

interface PartnersCardProps {
  partnersJson?: string | null
  companyPhones?: string | null
  companyEmails?: string | null
  companyWhatsApp?: string | null
}

export default function PartnersCard({
  partnersJson,
  companyPhones,
  companyEmails,
  companyWhatsApp
}: PartnersCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Parse JSON data
  let partners: Partner[] = []
  let phones: string[] = []
  let emails: string[] = []

  try {
    partners = partnersJson ? JSON.parse(partnersJson) : []
    phones = companyPhones ? JSON.parse(companyPhones) : []
    emails = companyEmails ? JSON.parse(companyEmails) : []
  } catch (error) {
    console.error('Erro ao parsear dados de sócios:', error)
  }

  // Se não há dados, não exibir
  if (partners.length === 0 && phones.length === 0 && emails.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Sócios e Contatos Corporativos
            </CardTitle>
            <CardDescription>
              {partners.length > 0 && `${partners.length} sócio(s)`}
              {partners.length > 0 && (phones.length > 0 || emails.length > 0) && ' • '}
              {phones.length > 0 && `${phones.length} telefone(s)`}
              {phones.length > 0 && emails.length > 0 && ' • '}
              {emails.length > 0 && `${emails.length} email(s)`}
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
                Ver detalhes
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Contatos Corporativos */}
          {(phones.length > 0 || emails.length > 0 || companyWhatsApp) && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contatos da Empresa
              </h4>
              <div className="grid gap-2 pl-6">
                {phones.map((phone, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span className="font-mono">{phone}</span>
                  </div>
                ))}
                {companyWhatsApp && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      WhatsApp
                    </Badge>
                    <span className="font-mono">{companyWhatsApp}</span>
                  </div>
                )}
                {emails.map((email, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <a href={`mailto:${email}`} className="text-blue-600 hover:underline">
                      {email}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sócios */}
          {partners.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                Sócios e Administradores
              </h4>
              <div className="space-y-4">
                {partners.map((partner, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 bg-gray-50 space-y-2"
                  >
                    {/* Nome e Cargo */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{partner.nome}</p>
                        <p className="text-sm text-gray-600">{partner.qualificacao}</p>
                      </div>
                      {partner.linkedin && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={partner.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            LinkedIn
                          </a>
                        </Button>
                      )}
                    </div>

                    {/* Telefones do Sócio */}
                    {partner.telefones && partner.telefones.length > 0 && (
                      <div className="space-y-1">
                        {partner.telefones.map((phone, phoneIdx) => (
                          <div key={phoneIdx} className="flex items-center gap-2 text-sm text-gray-700">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="font-mono">{phone}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Emails do Sócio */}
                    {partner.emails && partner.emails.length > 0 && (
                      <div className="space-y-1">
                        {partner.emails.map((email, emailIdx) => (
                          <div key={emailIdx} className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <a
                              href={`mailto:${email}`}
                              className="text-blue-600 hover:underline"
                            >
                              {email}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Se não tem contatos */}
                    {(!partner.telefones || partner.telefones.length === 0) &&
                     (!partner.emails || partner.emails.length === 0) && (
                      <p className="text-xs text-gray-500 italic">
                        Contatos não disponíveis
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fonte dos Dados */}
          <div className="pt-3 border-t text-xs text-gray-500">
            <p className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Fonte Oficial
              </Badge>
              Dados de socios: OpenCNPJ (Receita Federal)
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
