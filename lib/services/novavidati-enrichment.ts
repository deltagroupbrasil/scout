// Nova Vida TI - API Official JSON Enrichment Service
// Documentação oficial: Manual de Integração de Consultas 2024
// Website: https://novavidati.com.br/api-consultas/
// Custo: R$ 0.06 por consulta
// Base URL: https://wsnv.novavidati.com.br/wslocalizador.asmx

import { prisma } from '@/lib/prisma'

export interface NovaVidaTIPartner {
  nome: string
  cpf?: string  // CPF completo (uso interno, não armazenar)
  qualificacao: string  // Cargo/Função
  telefones: string[]
  emails: string[]
  participacao?: string
  linkedin?: string  // Buscaremos via LinkedIn após obter nome
}

export interface NovaVidaTICompanyData {
  cnpj: string
  razaoSocial: string
  nomeFantasia?: string
  telefones: string[]  // Telefones da empresa
  emails: string[]     // Emails corporativos
  whatsapp?: string[]  // WhatsApp da empresa
  socios: NovaVidaTIPartner[]
  porte?: string
  capitalSocial?: number
  qtdeFuncionarios?: number
  dataAbertura?: string
}

export interface NovaVidaTIUsageRecord {
  companyName: string
  cnpj: string
  cost: number  // R$ 0.06
  createdAt: Date
}

export class NovaVidaTIEnrichmentService {
  private usuario: string | null = null
  private senha: string | null = null
  private cliente: string | null = null
  private baseUrl = 'https://wsnv.novavidati.com.br/wslocalizador.asmx'
  private costPerQuery = 0.06  // R$ 0.06 por consulta
  private token: string | null = null
  private tokenExpiry: Date | null = null

  constructor() {
    this.usuario = process.env.NOVA_VIDA_TI_USUARIO || null
    this.senha = process.env.NOVA_VIDA_TI_SENHA || null
    this.cliente = process.env.NOVA_VIDA_TI_CLIENTE || null

    if (!this.usuario || !this.senha || !this.cliente) {
      console.warn('  Nova Vida TI credenciais não configuradas - enrichment desabilitado')
    }
  }

  /**
   * Gera token de autenticação (válido por 24 horas)
   * Método oficial: GerarTokenJson
   * URL: https://wsnv.novavidati.com.br/wslocalizador.asmx/GerarTokenJson
   *
   * IMPORTANTE: Credenciais devem ser enviadas em TEXTO PURO (não Base64)
   */
  private async generateToken(): Promise<string | null> {
    if (!this.usuario || !this.senha || !this.cliente) {
      console.log(' [Nova Vida TI] Credenciais não configuradas')
      return null
    }

    // Verificar se token ainda é válido
    if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.token
    }

    try {
      console.log('🔑 [Nova Vida TI] Gerando novo token...')

      // Credenciais em texto puro (NÃO usar Base64)
      const credenciais = {
        usuario: this.usuario,
        senha: this.senha,
        cliente: this.cliente
      }

      const response = await fetch(`${this.baseUrl}/GerarTokenJson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          credencial: credenciais
        })
      })

      if (!response.ok) {
        console.error(`    Erro ao gerar token: ${response.status}`)
        return null
      }

      const result = await response.json()

      // Parse token da resposta JSON
      const token = result.d || result.token || result

      if (token && typeof token === 'string' && token !== 'ERRO') {
        this.token = token
        // Token válido por 24 horas conforme documentação
        this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
        console.log('    Token gerado com sucesso')
        return token
      }

      console.error('    Falha ao gerar token:', result)
      return null

    } catch (error) {
      console.error('[Nova Vida TI] Erro ao gerar token:', error)
      return null
    }
  }

  /**
   * Consulta dados via CNPJ usando NVCHECKJson (método oficial documentado)
   * URL: https://wsnv.novavidati.com.br/wslocalizador.asmx/NVCHECKJson
   */
  private async queryDocument(document: string, token: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/NVCHECKJson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Token': token  // Token no header conforme documentação
        },
        body: JSON.stringify({
          nvcheck: {
            Documento: document
          }
        })
      })

      if (!response.ok) {
        console.error(`    Erro na consulta: ${response.status}`)
        return null
      }

      const result = await response.json()
      return result.d || result

    } catch (error) {
      console.error('[Nova Vida TI] Erro na consulta:', error)
      return null
    }
  }

  /**
   * Enriquece dados da empresa via CNPJ
   * Retorna: telefones, emails, WhatsApp, dados de sócios com contatos
   */
  async enrichCompanyContacts(cnpj: string, companyName: string): Promise<NovaVidaTICompanyData | null> {
    // Limpar CNPJ
    const cleanCNPJ = cnpj.replace(/\D/g, '')

    if (cleanCNPJ.length !== 14) {
      console.error(`[Nova Vida TI] CNPJ inválido: ${cnpj}`)
      return null
    }

    // Gerar token
    const token = await this.generateToken()
    if (!token) {
      return null
    }

    try {
      console.log(`\n💼 [Nova Vida TI] Enriquecendo: ${companyName}`)
      console.log(`   CNPJ: ${this.formatCNPJ(cleanCNPJ)}`)

      // Consultar dados da empresa usando NVCHECK
      const companyData = await this.queryDocument(cleanCNPJ, token)

      if (!companyData || !companyData.CONSULTA) {
        console.log('     Dados não encontrados')
        return null
      }

      // Parse da resposta oficial
      const enrichedData = this.parseCompanyResponse(companyData, cleanCNPJ)

      if (enrichedData) {
        console.log(`    Dados enriquecidos:`)
        console.log(`      Razão Social: ${enrichedData.razaoSocial}`)
        console.log(`      Telefones: ${enrichedData.telefones.length}`)
        console.log(`      Emails: ${enrichedData.emails.length}`)
        console.log(`      Sócios: ${enrichedData.socios.length}`)

        // Para cada sócio, buscar contatos via CPF (se disponível)
        for (const socio of enrichedData.socios) {
          if (socio.cpf) {
            const cleanCPF = socio.cpf.replace(/\D/g, '')
            if (cleanCPF.length === 11) {
              console.log(`       Buscando contatos de ${socio.nome}...`)
              const socioData = await this.queryDocument(cleanCPF, token)
              if (socioData && socioData.CONSULTA) {
                const socioContacts = this.parsePersonResponse(socioData)
                socio.telefones = socioContacts.telefones
                socio.emails = socioContacts.emails
                console.log(`         ✓ ${socioContacts.telefones.length} telefones, ${socioContacts.emails.length} emails`)
              }
              // Delay entre consultas (rate limiting)
              await this.sleep(1500)
            }
          }
        }

        // Registrar uso e custo (1 consulta empresa + N consultas sócios)
        const totalQueries = 1 + enrichedData.socios.filter(s => s.cpf).length
        await this.recordUsage(companyName, cleanCNPJ, totalQueries)
      }

      return enrichedData

    } catch (error) {
      console.error('[Nova Vida TI] Erro ao enriquecer:', error)
      return null
    }
  }

  /**
   * Parse da resposta de consulta de empresa (CNPJ)
   * Estrutura oficial conforme seção 3.3c da documentação
   */
  private parseCompanyResponse(data: any, cnpj: string): NovaVidaTICompanyData {
    try {
      const consulta = data.CONSULTA
      const cadastrais = consulta.CADASTRAIS || {}
      const enderecos = consulta.ENDERECOS || []
      const telefones = consulta.TELEFONES || []
      const emails = consulta.EMAILS || []
      const qsa = consulta.QSA || []

      return {
        cnpj,
        razaoSocial: cadastrais.RAZAO || cadastrais.NOME || '',
        nomeFantasia: cadastrais.NOME_FANTASIA || undefined,
        porte: cadastrais.PORTE || undefined,
        capitalSocial: cadastrais.CAPITALSOCIAL ? parseFloat(cadastrais.CAPITALSOCIAL) : undefined,
        qtdeFuncionarios: cadastrais.QTDEFUNCIONARIOS ? parseInt(cadastrais.QTDEFUNCIONARIOS) : undefined,
        dataAbertura: cadastrais.DATA_ABERTURA || undefined,
        telefones: this.extractPhonesFromArray(telefones),
        emails: this.extractEmailsFromArray(emails),
        whatsapp: this.extractWhatsAppFromPhones(telefones),
        socios: this.extractPartnersFromQSA(qsa)
      }
    } catch (error) {
      console.error('[Nova Vida TI] Erro ao parsear resposta empresa:', error)
      return {
        cnpj,
        razaoSocial: '',
        telefones: [],
        emails: [],
        socios: []
      }
    }
  }

  /**
   * Parse da resposta de consulta de pessoa (CPF)
   * Estrutura oficial conforme seção 3.3b da documentação
   */
  private parsePersonResponse(data: any): { telefones: string[], emails: string[] } {
    try {
      const consulta = data.CONSULTA
      const telefones = consulta.TELEFONES || []
      const emails = consulta.EMAILS || []

      return {
        telefones: this.extractPhonesFromArray(telefones),
        emails: this.extractEmailsFromArray(emails)
      }
    } catch (error) {
      console.error('[Nova Vida TI] Erro ao parsear resposta pessoa:', error)
      return { telefones: [], emails: [] }
    }
  }

  /**
   * Extrai telefones do array de telefones oficial
   */
  private extractPhonesFromArray(telefonesArray: any[]): string[] {
    const phones: string[] = []

    for (const tel of telefonesArray) {
      if (tel.DDD && tel.TELEFONE) {
        const fullPhone = `${tel.DDD}${tel.TELEFONE}`
        const cleaned = this.cleanPhone(fullPhone)
        if (cleaned && cleaned.length >= 10) {
          phones.push(cleaned)
        }
      }
    }

    return [...new Set(phones)]
  }

  /**
   * Extrai WhatsApp dos telefones (quando TIPO_TELEFONE indica celular)
   */
  private extractWhatsAppFromPhones(telefonesArray: any[]): string[] | undefined {
    const whatsappNumbers: string[] = []

    for (const tel of telefonesArray) {
      // Celular geralmente tem 9 dígitos após o DDD
      if (tel.DDD && tel.TELEFONE && tel.TELEFONE.length >= 9) {
        const fullPhone = `${tel.DDD}${tel.TELEFONE}`
        const cleaned = this.cleanPhone(fullPhone)
        if (cleaned && cleaned.length === 11) {
          whatsappNumbers.push(cleaned)
        }
      }
    }

    return whatsappNumbers.length > 0 ? [...new Set(whatsappNumbers)] : undefined
  }

  /**
   * Extrai emails do array de emails oficial
   */
  private extractEmailsFromArray(emailsArray: any[]): string[] {
    const emails: string[] = []

    for (const emailObj of emailsArray) {
      if (emailObj.EMAIL && this.isValidEmail(emailObj.EMAIL)) {
        emails.push(emailObj.EMAIL.toLowerCase())
      }
    }

    return [...new Set(emails)]
  }

  /**
   * Extrai dados dos sócios do QSA (Quadro de Sócios e Administradores)
   * Estrutura oficial conforme documentação seção 3.3c
   */
  private extractPartnersFromQSA(qsaArray: any[]): NovaVidaTIPartner[] {
    const partners: NovaVidaTIPartner[] = []

    for (const qsaGroup of qsaArray) {
      if (qsaGroup.QSA && Array.isArray(qsaGroup.QSA)) {
        for (const socio of qsaGroup.QSA) {
          const partner: NovaVidaTIPartner = {
            nome: socio.NOME || '',
            qualificacao: socio.QUALIFICACAO || 'Sócio',
            participacao: socio.PARTICIPACAO || undefined,
            telefones: [],
            emails: []
          }

          // Telefone do sócio (se disponível)
          if (socio.DDD_SOCIO && socio.CEL_SOCIO) {
            const phone = this.cleanPhone(`${socio.DDD_SOCIO}${socio.CEL_SOCIO}`)
            if (phone && phone.length >= 10) {
              partner.telefones.push(phone)
            }
          }

          // CPF para busca posterior (não armazenar no retorno final)
          if (socio.CPF) {
            partner.cpf = socio.CPF
          }

          if (partner.nome) {
            partners.push(partner)
          }
        }
      }
    }

    return partners
  }

  /**
   * Registra uso da API para monitoramento de custos
   */
  private async recordUsage(companyName: string, cnpj: string, queries: number = 1): Promise<void> {
    try {
      const totalCost = this.costPerQuery * queries

      await prisma.novaVidaTIUsage.create({
        data: {
          companyName,
          cnpj,
          cost: totalCost,
        }
      })

      console.log(`    [Nova Vida TI] ${queries} consultas - Custo total: R$ ${totalCost.toFixed(2)}`)
    } catch (error) {
      console.error(' [Nova Vida TI] Erro ao registrar uso:', error)
    }
  }

  /**
   * Limpa telefone (remove formatação)
   */
  private cleanPhone(phone: string): string {
    return phone.replace(/\D/g, '')
  }

  /**
   * Valida formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    return emailRegex.test(email)
  }

  /**
   * Formata CNPJ (XX.XXX.XXX/XXXX-XX)
   */
  private formatCNPJ(cnpj: string): string {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  /**
   * Sleep helper (rate limiting)
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Retorna estatísticas de uso mensal
   */
  async getMonthlyUsage(): Promise<{
    queries: number
    totalCost: number
    currentMonth: string
  }> {
    try {
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const usageRecords = await prisma.novaVidaTIUsage.findMany({
        where: {
          createdAt: {
            gte: firstDayOfMonth
          }
        }
      })

      const totalCost = usageRecords.reduce((sum, record) => sum + record.cost, 0)

      return {
        queries: usageRecords.length,
        totalCost,
        currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      }
    } catch (error) {
      console.error('[Nova Vida TI] Erro ao buscar uso:', error)
      return { queries: 0, totalCost: 0, currentMonth: '' }
    }
  }
}

export const novaVidaTIEnrichment = new NovaVidaTIEnrichmentService()
