import { describe, it, expect } from 'vitest'
import { priorityScore } from '@/lib/services/priority-score'
import { LinkedInJobData } from '@/types'

describe('PriorityScoreService', () => {
  const mockJobData: LinkedInJobData = {
    companyName: 'Petrobras',
    jobTitle: 'CFO',
    jobDescription: 'Procuramos CFO experiente',
    jobUrl: 'https://linkedin.com/jobs/123',
    jobPostedDate: new Date(),
    candidateCount: 50,
  }

  describe('calculateScore', () => {
    it('deve calcular score máximo para empresa grande, vaga nova e poucos candidatos', () => {
      const score = priorityScore.calculateScore({
        revenue: 10_000_000_000,  // R$ 10B
        employees: 10000,
        jobPostedDate: new Date(),  // Hoje
        candidateCount: 10,
        triggers: ['Expansão internacional', 'Novo projeto'],
      })

      expect(score).toBeGreaterThanOrEqual(80)
      expect(score).toBeLessThanOrEqual(100)
    })

    it('deve calcular score baixo para empresa pequena, vaga antiga e muitos candidatos', () => {
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 60)  // 60 dias atrás

      const score = priorityScore.calculateScore({
        revenue: 1_000_000,  // R$ 1M
        employees: 10,
        jobPostedDate: oldDate,
        candidateCount: 500,
        triggers: [],
      })

      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThan(40)
    })

    it('deve pontuar receita corretamente', () => {
      const noRevenue = priorityScore.calculateScore({
        revenue: null,
        employees: null,
        jobPostedDate: new Date(),
        candidateCount: null,
        triggers: [],
      })

      const lowRevenue = priorityScore.calculateScore({
        revenue: 5_000_000,  // R$ 5M
        employees: null,
        jobPostedDate: new Date(),
        candidateCount: null,
        triggers: [],
      })

      const highRevenue = priorityScore.calculateScore({
        revenue: 1_000_000_000,  // R$ 1B
        employees: null,
        jobPostedDate: new Date(),
        candidateCount: null,
        triggers: [],
      })

      expect(lowRevenue).toBeGreaterThan(noRevenue)
      expect(highRevenue).toBeGreaterThan(lowRevenue)
    })

    it('deve pontuar recência corretamente', () => {
      const today = new Date()
      const week = new Date()
      week.setDate(week.getDate() - 7)
      const month = new Date()
      month.setDate(month.getDate() - 30)

      const scoreToday = priorityScore.calculateScore({
        revenue: null,
        employees: null,
        jobPostedDate: today,
        candidateCount: null,
        triggers: [],
      })

      const scoreWeek = priorityScore.calculateScore({
        revenue: null,
        employees: null,
        jobPostedDate: week,
        candidateCount: null,
        triggers: [],
      })

      const scoreMonth = priorityScore.calculateScore({
        revenue: null,
        employees: null,
        jobPostedDate: month,
        candidateCount: null,
        triggers: [],
      })

      expect(scoreToday).toBeGreaterThan(scoreWeek)
      expect(scoreWeek).toBeGreaterThan(scoreMonth)
    })

    it('deve pontuar triggers corretamente', () => {
      const noTriggers = priorityScore.calculateScore({
        revenue: null,
        employees: null,
        jobPostedDate: new Date(),
        candidateCount: null,
        triggers: [],
      })

      const someTriggers = priorityScore.calculateScore({
        revenue: null,
        employees: null,
        jobPostedDate: new Date(),
        candidateCount: null,
        triggers: ['IPO recente', 'Expansão'],
      })

      const manyTriggers = priorityScore.calculateScore({
        revenue: null,
        employees: null,
        jobPostedDate: new Date(),
        candidateCount: null,
        triggers: ['IPO', 'Expansão', 'Fusão', 'Investimento', 'Prêmio'],
      })

      expect(someTriggers).toBeGreaterThan(noTriggers)
      expect(manyTriggers).toBeGreaterThan(someTriggers)
    })
  })

  describe('getPriorityLevel', () => {
    it('deve classificar corretamente por nível', () => {
      expect(priorityScore.getPriorityLevel(90)).toBe('Muito Alta')
      expect(priorityScore.getPriorityLevel(70)).toBe('Alta')
      expect(priorityScore.getPriorityLevel(50)).toBe('Média')
      expect(priorityScore.getPriorityLevel(30)).toBe('Baixa')
      expect(priorityScore.getPriorityLevel(10)).toBe('Muito Baixa')
    })

    it('deve lidar com edge cases', () => {
      expect(priorityScore.getPriorityLevel(0)).toBe('Muito Baixa')
      expect(priorityScore.getPriorityLevel(100)).toBe('Muito Alta')
    })
  })

  describe('getPriorityColor', () => {
    it('deve retornar cores corretas', () => {
      expect(priorityScore.getPriorityColor(90)).toBe('red')
      expect(priorityScore.getPriorityColor(70)).toBe('orange')
      expect(priorityScore.getPriorityColor(50)).toBe('yellow')
      expect(priorityScore.getPriorityColor(30)).toBe('blue')
      expect(priorityScore.getPriorityColor(10)).toBe('gray')
    })
  })

  describe('calculateForLead', () => {
    it('deve calcular score com dados completos', () => {
      const result = priorityScore.calculateForLead(
        mockJobData,
        10_000_000_000,  // R$ 10B
        5000,
        ['Expansão', 'IPO']
      )

      expect(result.score).toBeGreaterThan(0)
      expect(result.score).toBeLessThanOrEqual(100)
      expect(result.level).toBeTruthy()
      expect(result.color).toBeTruthy()
      expect(result.breakdown).toBeDefined()
      expect(result.breakdown.revenue).toBeDefined()
      expect(result.breakdown.employees).toBeDefined()
      expect(result.breakdown.recency).toBeDefined()
    })

    it('deve lidar com dados incompletos', () => {
      const result = priorityScore.calculateForLead(
        mockJobData,
        null,  // Sem receita
        null,  // Sem funcionários
        []     // Sem triggers
      )

      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
      expect(result.breakdown.revenue).toBe(0)
      expect(result.breakdown.employees).toBe(0)
    })
  })

  describe('recomputeScore', () => {
    it('deve recalcular score com base em novos dados', () => {
      const originalScore = priorityScore.calculateScore({
        revenue: 1_000_000,
        employees: 10,
        jobPostedDate: new Date(),
        candidateCount: 100,
        triggers: [],
      })

      const newScore = priorityScore.recomputeScore(originalScore, {
        revenue: 100_000_000,
        employees: 500,
        triggers: ['Expansão', 'IPO', 'Fusão'],
      })

      expect(newScore).toBeGreaterThan(originalScore)
    })
  })
})
