/**
 * Company Deduplicator Service
 *
 * Detecta e resolve duplicatas de empresas usando:
 * - Fuzzy matching de nomes
 * - Normalização de CNPJ
 * - Match de domínio/website
 * - Match de LinkedIn URL
 */

import { prisma } from '@/lib/prisma'
import * as fuzzball from 'fuzzball'

export interface DuplicateCandidate {
  companyId: string
  companyName: string
  score: number
  reason: string[]
  confidence: 'high' | 'medium' | 'low'
}

export interface MergeResult {
  primaryId: string
  mergedIds: string[]
  leadsTransferred: number
  notesTransferred: number
}

export class CompanyDeduplicatorService {
  /**
   * Encontra possíveis duplicatas de uma empresa
   */
  async findDuplicates(
    companyName: string,
    cnpj?: string | null,
    website?: string | null,
    linkedinUrl?: string | null,
    threshold: number = 80
  ): Promise<DuplicateCandidate[]> {
    // Buscar todas as empresas (otimização: adicionar índices no Prisma)
    const allCompanies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        cnpj: true,
        website: true,
        linkedinUrl: true,
      }
    })

    const duplicates: DuplicateCandidate[] = []
    const normalizedInputName = this.normalizeName(companyName)

    for (const company of allCompanies) {
      const reasons: string[] = []
      let score = 0
      let exactMatch = false

      // 1. Match exato de CNPJ (100% confiança)
      if (cnpj && company.cnpj && this.normalizeCNPJ(cnpj) === this.normalizeCNPJ(company.cnpj)) {
        score = 100
        reasons.push('CNPJ idêntico')
        exactMatch = true
      }

      // 2. Match de website/domínio (95% confiança)
      if (!exactMatch && website && company.website) {
        const inputDomain = this.extractDomain(website)
        const companyDomain = this.extractDomain(company.website)

        if (inputDomain && companyDomain && inputDomain === companyDomain) {
          score = Math.max(score, 95)
          reasons.push('Website/domínio idêntico')
        }
      }

      // 3. Match de LinkedIn URL (90% confiança)
      if (!exactMatch && linkedinUrl && company.linkedinUrl) {
        const inputLinkedIn = this.normalizeLinkedInUrl(linkedinUrl)
        const companyLinkedIn = this.normalizeLinkedInUrl(company.linkedinUrl)

        if (inputLinkedIn === companyLinkedIn) {
          score = Math.max(score, 90)
          reasons.push('LinkedIn URL idêntico')
        }
      }

      // 4. Fuzzy matching de nome
      const normalizedCompanyName = this.normalizeName(company.name)

      // Token Set Ratio (melhor para empresas com nomes parecidos)
      const tokenSetScore = fuzzball.token_set_ratio(normalizedInputName, normalizedCompanyName)

      // Partial Ratio (detecta substrings)
      const partialScore = fuzzball.partial_ratio(normalizedInputName, normalizedCompanyName)

      // Ratio simples
      const simpleScore = fuzzball.ratio(normalizedInputName, normalizedCompanyName)

      // Usar o melhor score
      const nameScore = Math.max(tokenSetScore, partialScore, simpleScore)

      if (nameScore >= threshold) {
        score = Math.max(score, nameScore)
        reasons.push(`Nome similar (${nameScore}% match)`)
      }

      // Adicionar à lista se passou do threshold
      if (score >= threshold && reasons.length > 0) {
        const confidence = this.calculateConfidence(score, reasons)

        duplicates.push({
          companyId: company.id,
          companyName: company.name,
          score,
          reason: reasons,
          confidence,
        })
      }
    }

    // Ordenar por score descendente
    return duplicates.sort((a, b) => b.score - a.score)
  }

  /**
   * Mescla empresas duplicadas (transfere leads e dados)
   */
  async mergeCompanies(
    primaryId: string,
    duplicateIds: string[]
  ): Promise<MergeResult> {
    let leadsTransferred = 0
    let notesTransferred = 0

    // Usar transação para garantir consistência
    await prisma.$transaction(async (tx) => {
      for (const duplicateId of duplicateIds) {
        // 1. Transferir leads
        const leads = await tx.lead.updateMany({
          where: { companyId: duplicateId },
          data: { companyId: primaryId },
        })
        leadsTransferred += leads.count

        // 2. Transferir notas de leads (se houver)
        const leadNotes = await tx.note.count({
          where: {
            lead: {
              companyId: duplicateId,
            },
          },
        })
        notesTransferred += leadNotes

        // 3. Mesclar dados da empresa duplicada na primária (se faltarem)
        const duplicate = await tx.company.findUnique({
          where: { id: duplicateId },
        })

        const primary = await tx.company.findUnique({
          where: { id: primaryId },
        })

        if (duplicate && primary) {
          // Mesclar campos que estão vazios na primária
          const updates: any = {}

          if (!primary.cnpj && duplicate.cnpj) updates.cnpj = duplicate.cnpj
          if (!primary.revenue && duplicate.revenue) updates.revenue = duplicate.revenue
          if (!primary.employees && duplicate.employees) updates.employees = duplicate.employees
          if (!primary.sector && duplicate.sector) updates.sector = duplicate.sector
          if (!primary.location && duplicate.location) updates.location = duplicate.location
          if (!primary.website && duplicate.website) updates.website = duplicate.website
          if (!primary.linkedinUrl && duplicate.linkedinUrl) updates.linkedinUrl = duplicate.linkedinUrl

          if (Object.keys(updates).length > 0) {
            await tx.company.update({
              where: { id: primaryId },
              data: updates,
            })
          }
        }

        // 4. Deletar empresa duplicada
        await tx.company.delete({
          where: { id: duplicateId },
        })
      }
    })

    return {
      primaryId,
      mergedIds: duplicateIds,
      leadsTransferred,
      notesTransferred,
    }
  }

  /**
   * Encontra todas as duplicatas no banco de dados
   */
  async findAllDuplicates(threshold: number = 85): Promise<Map<string, DuplicateCandidate[]>> {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        cnpj: true,
        website: true,
        linkedinUrl: true,
      },
    })

    const duplicateGroups = new Map<string, DuplicateCandidate[]>()

    for (const company of companies) {
      const duplicates = await this.findDuplicates(
        company.name,
        company.cnpj,
        company.website,
        company.linkedinUrl,
        threshold
      )

      // Filtrar a própria empresa
      const filtered = duplicates.filter(d => d.companyId !== company.id)

      if (filtered.length > 0) {
        duplicateGroups.set(company.id, filtered)
      }
    }

    return duplicateGroups
  }

  /**
   * Resolve automaticamente duplicatas com alta confiança (score > 95)
   */
  async autoResolveDuplicates(
    minConfidence: 'high' | 'medium' = 'high'
  ): Promise<MergeResult[]> {
    const allDuplicates = await this.findAllDuplicates(95)
    const results: MergeResult[] = []
    const processed = new Set<string>()

    for (const [primaryId, duplicates] of allDuplicates) {
      if (processed.has(primaryId)) continue

      // Filtrar apenas duplicatas com alta confiança
      const highConfidence = duplicates.filter(d => {
        if (minConfidence === 'high') return d.confidence === 'high'
        return d.confidence === 'high' || d.confidence === 'medium'
      })

      if (highConfidence.length > 0) {
        const duplicateIds = highConfidence.map(d => d.companyId)

        // Verificar se alguma duplicata já foi processada
        const alreadyProcessed = duplicateIds.some(id => processed.has(id))
        if (alreadyProcessed) continue

        // Mesclar
        const result = await this.mergeCompanies(primaryId, duplicateIds)
        results.push(result)

        // Marcar como processados
        processed.add(primaryId)
        duplicateIds.forEach(id => processed.add(id))
      }
    }

    return results
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Normaliza nome de empresa
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      // Remover caracteres especiais
      .replace(/[^\w\s]/g, '')
      // Remover sufixos comuns
      .replace(/\b(ltda|s\.a\.|sa|me|epp|eireli)\b/g, '')
      // Remover espaços extras
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Normaliza CNPJ (remove formatação)
   */
  private normalizeCNPJ(cnpj: string): string {
    return cnpj.replace(/\D/g, '')
  }

  /**
   * Extrai domínio de URL
   */
  private extractDomain(url: string): string | null {
    try {
      // Adicionar protocolo se não houver
      const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`
      const parsed = new URL(urlWithProtocol)

      // Remover www.
      return parsed.hostname.replace(/^www\./, '').toLowerCase()
    } catch {
      return null
    }
  }

  /**
   * Normaliza LinkedIn URL
   */
  private normalizeLinkedInUrl(url: string): string {
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .replace('linkedin.com/company/', '')
  }

  /**
   * Calcula confiança com base no score e razões
   */
  private calculateConfidence(
    score: number,
    reasons: string[]
  ): 'high' | 'medium' | 'low' {
    // Alta confiança: CNPJ idêntico ou múltiplos matches fortes
    if (score === 100 || reasons.some(r => r.includes('CNPJ'))) {
      return 'high'
    }

    // Alta confiança: website + nome muito similar
    if (score >= 95 && reasons.some(r => r.includes('Website'))) {
      return 'high'
    }

    // Média confiança: score alto ou múltiplos matches
    if (score >= 90 || reasons.length >= 2) {
      return 'medium'
    }

    // Baixa confiança
    return 'low'
  }

  /**
   * Sugere empresa primária de um grupo de duplicatas
   */
  async suggestPrimary(companyIds: string[]): Promise<string> {
    const companies = await prisma.company.findMany({
      where: { id: { in: companyIds } },
      include: {
        _count: {
          select: { leads: true }
        }
      }
    })

    // Critérios (em ordem de prioridade):
    // 1. Mais leads
    // 2. Mais dados completos
    // 3. Criada mais recentemente

    let best = companies[0]
    let bestScore = this.scoreCompanyCompleteness(best)

    for (const company of companies.slice(1)) {
      const score = this.scoreCompanyCompleteness(company)

      // Mais leads = prioridade
      if (company._count.leads > best._count.leads) {
        best = company
        bestScore = score
      } else if (company._count.leads === best._count.leads && score > bestScore) {
        best = company
        bestScore = score
      }
    }

    return best.id
  }

  /**
   * Pontua completude de dados de uma empresa
   */
  private scoreCompanyCompleteness(company: any): number {
    let score = 0

    if (company.cnpj) score += 10
    if (company.revenue) score += 5
    if (company.employees) score += 5
    if (company.sector) score += 3
    if (company.location) score += 2
    if (company.website) score += 5
    if (company.linkedinUrl) score += 5
    if (company.estimatedRevenue) score += 3
    if (company.estimatedEmployees) score += 3
    if (company._count?.leads) score += company._count.leads

    return score
  }
}

// Singleton export
export const companyDeduplicator = new CompanyDeduplicatorService()
