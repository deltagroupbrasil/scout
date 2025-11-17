'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, Mail, User, Building2 } from 'lucide-react'

interface Partner {
  nome: string
  qualificacao: string
  telefones: string[]
  emails: string[]
  linkedin: string | null
}

interface AllContactsCardProps {
  partnersJson?: string | null
  companyPhones?: string | null
  companyEmails?: string | null
  companyWhatsApp?: string | null
}

export default function AllContactsCard({
  partnersJson,
  companyPhones,
  companyEmails,
  companyWhatsApp
}: AllContactsCardProps) {
  // Parse JSON data
  let partners: Partner[] = []
  let phones: string[] = []
  let emails: string[] = []

  try {
    partners = partnersJson ? JSON.parse(partnersJson) : []
    phones = companyPhones ? JSON.parse(companyPhones) : []
    emails = companyEmails ? JSON.parse(companyEmails) : []
  } catch (error) {
    console.error('Erro ao parsear dados de contatos:', error)
  }

  // Coletar todos os telefones e emails (empresa + socios)
  const allPhones: Array<{ phone: string; owner: string; type: 'company' | 'partner' }> = []
  const allEmails: Array<{ email: string; owner: string; type: 'company' | 'partner' }> = []

  // Telefones e emails da empresa
  phones.forEach(phone => {
    allPhones.push({ phone, owner: 'Empresa', type: 'company' })
  })

  emails.forEach(email => {
    allEmails.push({ email, owner: 'Empresa', type: 'company' })
  })

  // Telefones e emails dos socios
  partners.forEach(partner => {
    partner.telefones?.forEach(phone => {
      allPhones.push({ phone, owner: partner.nome, type: 'partner' })
    })

    partner.emails?.forEach(email => {
      allEmails.push({ email, owner: partner.nome, type: 'partner' })
    })
  })

  // Se nao ha contatos, nao exibir
  if (allPhones.length === 0 && allEmails.length === 0) {
    return null
  }

  const totalContacts = allPhones.length + allEmails.length

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Todos os Contatos
        </CardTitle>
        <CardDescription>
          {totalContacts} contato(s) disponiveis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Telefones */}
        {allPhones.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Telefones ({allPhones.length})
            </h4>
            <div className="space-y-2">
              {allPhones.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-2 p-2 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start gap-2 flex-1">
                    <Phone className="h-3 w-3 text-gray-400 mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-semibold text-gray-900">
                        {item.phone}
                      </p>
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                        {item.type === 'company' ? (
                          <Building2 className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        {item.owner}
                      </p>
                    </div>
                  </div>
                  {item.type === 'company' && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      Empresa
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Emails */}
        {allEmails.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              E-mails ({allEmails.length})
            </h4>
            <div className="space-y-2">
              {allEmails.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-2 p-2 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Mail className="h-3 w-3 text-gray-400 mt-1" />
                    <div className="flex-1 min-w-0">
                      <a
                        href={`mailto:${item.email}`}
                        className="text-sm text-blue-600 hover:underline font-medium block truncate"
                      >
                        {item.email}
                      </a>
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                        {item.type === 'company' ? (
                          <Building2 className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        {item.owner}
                      </p>
                    </div>
                  </div>
                  {item.type === 'company' && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                      Empresa
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WhatsApp */}
        {companyWhatsApp && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              WhatsApp
            </h4>
            <div className="flex items-center gap-2 p-2 rounded bg-green-50 border border-green-200">
              <Phone className="h-3 w-3 text-green-600" />
              <span className="font-mono text-sm font-semibold text-green-900">
                {companyWhatsApp}
              </span>
              <Badge variant="outline" className="ml-auto text-xs bg-green-100 text-green-700 border-green-300">
                WhatsApp
              </Badge>
            </div>
          </div>
        )}

        {/* Fonte */}
        <div className="pt-3 border-t text-xs text-gray-500">
          <p className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Fonte Oficial
            </Badge>
            Receita Federal
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
