// Priority Score Service
// Calcula score de prioridade para leads baseado em múltiplos fatores

import { Company, Lead } from '@prisma/client'

export interface LeadWithCompany extends Lead {
  company: Company
}

export class PriorityScoreService {
  /**
   * Calcula score de prioridade (0-100) baseado em:
   * - Faturamento da empresa (35 pontos)
   * - Número de funcionários (25 pontos)
   * - Recenticidade da vaga (20 pontos)
   * - Número de candidatos (10 pontos)
   * - Presença de gatilhos de IA (10 pontos)
   */
  calculateScore(lead: LeadWithCompany): number {
    let score = 0

    // 1. Faturamento da empresa (0-35 pontos)
    score += this.scoreRevenue(lead.company.revenue)

    // 2. Número de funcionários (0-25 pontos)
    score += this.scoreEmployees(lead.company.employees)

    // 3. Recenticidade da vaga (0-20 pontos)
    score += this.scoreRecency(lead.jobPostedDate)

    // 4. Número de candidatos (0-10 pontos)
    // Menos candidatos = mais urgente
    score += this.scoreCandidates(lead.candidateCount)

    // 5. Presença de triggers de IA (0-10 pontos)
    score += this.scoreTriggers(lead.triggers)

    return Math.min(Math.round(score), 100)
  }

  /**
   * Faturamento (0-35 pontos)
   * > R$ 50M: 35 pontos
   * R$ 10M - R$ 50M: 30 pontos
   * R$ 5M - R$ 10M: 25 pontos
   * R$ 1M - R$ 5M: 20 pontos
   * < R$ 1M: 10 pontos
   */
  private scoreRevenue(revenue: number | null): number {
    if (!revenue) return 10 // Score mínimo se não tiver dados

    if (revenue >= 50_000_000) return 35
    if (revenue >= 10_000_000) return 30
    if (revenue >= 5_000_000) return 25
    if (revenue >= 1_000_000) return 20
    return 10
  }

  /**
   * Funcionários (0-25 pontos)
   * > 1000: 25 pontos
   * 500-1000: 20 pontos
   * 100-500: 15 pontos
   * 50-100: 10 pontos
   * < 50: 5 pontos
   */
  private scoreEmployees(employees: number | null): number {
    if (!employees) return 5

    if (employees >= 1000) return 25
    if (employees >= 500) return 20
    if (employees >= 100) return 15
    if (employees >= 50) return 10
    return 5
  }

  /**
   * Recenticidade (0-20 pontos)
   * Últimas 24h: 20 pontos
   * Últimos 3 dias: 15 pontos
   * Última semana: 10 pontos
   * Últimas 2 semanas: 5 pontos
   * Mais antigo: 0 pontos
   */
  private scoreRecency(postedDate: Date): number {
    const now = new Date()
    const daysSince = Math.floor(
      (now.getTime() - new Date(postedDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSince <= 1) return 20
    if (daysSince <= 3) return 15
    if (daysSince <= 7) return 10
    if (daysSince <= 14) return 5
    return 0
  }

  /**
   * Candidatos (0-10 pontos)
   * Inverso: menos candidatos = mais pontos (mais urgente)
   * < 10: 10 pontos
   * 10-50: 7 pontos
   * 50-100: 5 pontos
   * 100-200: 3 pontos
   * > 200: 0 pontos
   */
  private scoreCandidates(candidateCount: number | null): number {
    if (!candidateCount) return 5 // Score médio se não tiver dados

    if (candidateCount < 10) return 10
    if (candidateCount < 50) return 7
    if (candidateCount < 100) return 5
    if (candidateCount < 200) return 3
    return 0
  }

  /**
   * Triggers de IA (0-10 pontos)
   * Presença de triggers indica lead bem qualificado
   */
  private scoreTriggers(triggers: string | null): number {
    if (!triggers) return 0

    try {
      const parsedTriggers = JSON.parse(triggers) as string[]
      if (parsedTriggers.length >= 3) return 10
      if (parsedTriggers.length >= 2) return 7
      if (parsedTriggers.length >= 1) return 5
    } catch {
      return 0
    }

    return 0
  }

  /**
   * Calcula score baseado em valores individuais (usado durante criação de lead)
   */
  calculate(params: {
    revenue: number | null
    employees: number | null
    jobPostedDate: Date
    candidateCount?: number | null
    triggers: number  // Número de triggers, não a string JSON
  }): number {
    let score = 0

    // 1. Faturamento da empresa (0-35 pontos)
    score += this.scoreRevenue(params.revenue)

    // 2. Número de funcionários (0-25 pontos)
    score += this.scoreEmployees(params.employees)

    // 3. Recenticidade da vaga (0-20 pontos)
    score += this.scoreRecency(params.jobPostedDate)

    // 4. Número de candidatos (0-10 pontos)
    score += this.scoreCandidates(params.candidateCount || null)

    // 5. Presença de triggers de IA (0-10 pontos)
    // Aqui recebemos o número de triggers, não a string JSON
    const triggerCount = params.triggers
    if (triggerCount >= 3) score += 10
    else if (triggerCount >= 2) score += 7
    else if (triggerCount >= 1) score += 5

    return Math.min(Math.round(score), 100)
  }

  /**
   * Retorna label descritivo do score
   */
  getScoreLabel(score: number): string {
    if (score >= 80) return 'Muito Alta'
    if (score >= 60) return 'Alta'
    if (score >= 40) return 'Média'
    if (score >= 20) return 'Baixa'
    return 'Muito Baixa'
  }

  /**
   * Retorna cor do badge baseado no score
   */
  getScoreColor(score: number): 'red' | 'orange' | 'yellow' | 'green' | 'blue' {
    if (score >= 80) return 'red' // Urgente
    if (score >= 60) return 'orange'
    if (score >= 40) return 'yellow'
    if (score >= 20) return 'green'
    return 'blue'
  }
}

export const priorityScore = new PriorityScoreService()
