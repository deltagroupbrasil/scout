/**
 * Email Validation Service
 *
 * Valida emails em múltiplos níveis:
 * 1. Formato (RFC 5322)
 * 2. Domínio existe (DNS MX records)
 * 3. Mailbox existe (SMTP verification - opcional)
 * 4. Não é descartável (disposable email detector)
 */

import * as emailValidator from 'email-validator'
import * as mailchecker from 'mailchecker'
import * as dns from 'dns'
import { promisify } from 'util'

const resolveMx = promisify(dns.resolveMx)

export interface EmailValidationResult {
  valid: boolean
  email: string
  reason?: string
  checks: {
    format: boolean
    domain: boolean
    disposable: boolean
    smtp?: boolean
  }
  confidence: 'high' | 'medium' | 'low'
}

export class EmailValidatorService {
  /**
   * Valida email completo (formato + domínio + disposable)
   */
  async validateEmail(email: string): Promise<EmailValidationResult> {
    const result: EmailValidationResult = {
      valid: false,
      email: email.toLowerCase().trim(),
      checks: {
        format: false,
        domain: false,
        disposable: false
      },
      confidence: 'low'
    }

    // 1. Validar formato (RFC 5322)
    result.checks.format = emailValidator.validate(result.email)
    if (!result.checks.format) {
      result.reason = 'Formato de email inválido'
      return result
    }

    // 2. Verificar se não é email descartável
    result.checks.disposable = mailchecker.isValid(result.email)
    if (!result.checks.disposable) {
      result.reason = 'Email descartável/temporário (ex: guerrillamail, tempmail)'
      return result
    }

    // 3. Verificar se domínio existe (DNS MX records)
    const domain = result.email.split('@')[1]
    try {
      const mxRecords = await resolveMx(domain)
      result.checks.domain = mxRecords && mxRecords.length > 0

      if (!result.checks.domain) {
        result.reason = 'Domínio não possui servidor de email (sem MX records)'
        return result
      }
    } catch (error) {
      result.checks.domain = false
      result.reason = 'Domínio não existe ou inacessível'
      return result
    }

    // 4. Verificação SMTP (opcional, pode ser lenta)
    // Desabilitado por padrão para não gerar tráfego SMTP desnecessário
    // result.checks.smtp = await this.verifySMTP(result.email)

    // Calcular confiança
    if (result.checks.format && result.checks.domain && result.checks.disposable) {
      result.valid = true
      result.confidence = 'high'
    }

    return result
  }

  /**
   * Valida email de forma RÁPIDA (apenas formato + disposable)
   * Use quando precisa de velocidade e não pode esperar DNS lookup
   */
  validateEmailFast(email: string): EmailValidationResult {
    const normalizedEmail = email.toLowerCase().trim()

    const result: EmailValidationResult = {
      valid: false,
      email: normalizedEmail,
      checks: {
        format: false,
        domain: false,
        disposable: false
      },
      confidence: 'low'
    }

    // Validar formato
    result.checks.format = emailValidator.validate(normalizedEmail)
    if (!result.checks.format) {
      result.reason = 'Formato de email inválido'
      return result
    }

    // Verificar se não é descartável
    result.checks.disposable = mailchecker.isValid(normalizedEmail)
    if (!result.checks.disposable) {
      result.reason = 'Email descartável/temporário'
      return result
    }

    // Assumir domínio válido (otimista)
    result.checks.domain = true
    result.valid = true
    result.confidence = 'medium'

    return result
  }

  /**
   * Valida se é email corporativo (não gmail, hotmail, etc)
   */
  isBusinessEmail(email: string): boolean {
    const normalizedEmail = email.toLowerCase().trim()
    const domain = normalizedEmail.split('@')[1]

    // Lista de domínios públicos comuns
    const publicDomains = [
      'gmail.com',
      'hotmail.com',
      'outlook.com',
      'yahoo.com',
      'yahoo.com.br',
      'icloud.com',
      'me.com',
      'live.com',
      'msn.com',
      'aol.com',
      'protonmail.com',
      'mail.com',
      'gmx.com',
      'yandex.com',
      'mail.ru',
      'qq.com',
      '163.com',
      'zoho.com',
      'bol.com.br',
      'uol.com.br',
      'ig.com.br',
      'terra.com.br',
      'globo.com',
      'r7.com',
    ]

    return !publicDomains.includes(domain)
  }

  /**
   * Valida batch de emails (em paralelo com rate limiting)
   */
  async validateEmailBatch(
    emails: string[],
    options: { fast?: boolean; maxConcurrent?: number } = {}
  ): Promise<EmailValidationResult[]> {
    const { fast = false, maxConcurrent = 5 } = options

    // Processar em chunks para evitar sobrecarga
    const chunks: string[][] = []
    for (let i = 0; i < emails.length; i += maxConcurrent) {
      chunks.push(emails.slice(i, i + maxConcurrent))
    }

    const results: EmailValidationResult[] = []

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(email =>
          fast ? Promise.resolve(this.validateEmailFast(email)) : this.validateEmail(email)
        )
      )
      results.push(...chunkResults)

      // Delay entre chunks para não sobrecarregar DNS
      if (!fast) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    return results
  }

  /**
   * Extrai domínio do email
   */
  extractDomain(email: string): string | null {
    const normalizedEmail = email.toLowerCase().trim()
    if (!emailValidator.validate(normalizedEmail)) {
      return null
    }
    return normalizedEmail.split('@')[1]
  }

  /**
   * Normaliza email (lowercase, trim, remove dots em gmail)
   */
  normalizeEmail(email: string): string {
    let normalized = email.toLowerCase().trim()

    // Gmail ignora pontos antes do @
    if (normalized.endsWith('@gmail.com')) {
      const [local, domain] = normalized.split('@')
      normalized = local.replace(/\./g, '') + '@' + domain
    }

    return normalized
  }

  /**
   * Verifica se email pertence ao domínio da empresa
   */
  matchesDomain(email: string, companyDomain: string): boolean {
    const emailDomain = this.extractDomain(email)
    if (!emailDomain) return false

    // Normalizar domínios
    const normalizedEmailDomain = emailDomain.toLowerCase().replace(/^www\./, '')
    const normalizedCompanyDomain = companyDomain.toLowerCase().replace(/^www\./, '')

    // Match exato ou subdomínio
    return (
      normalizedEmailDomain === normalizedCompanyDomain ||
      normalizedEmailDomain.endsWith('.' + normalizedCompanyDomain)
    )
  }

  /**
   * Gera sugestão de email baseado em padrões comuns
   */
  suggestEmailPattern(
    firstName: string,
    lastName: string,
    domain: string
  ): string[] {
    const first = firstName.toLowerCase().trim()
    const last = lastName.toLowerCase().trim()
    const firstInitial = first[0]
    const lastInitial = last[0]

    // Padrões mais comuns no Brasil
    return [
      `${first}.${last}@${domain}`,           // joao.silva@empresa.com
      `${first}@${domain}`,                   // joao@empresa.com
      `${first}${last}@${domain}`,            // joaosilva@empresa.com
      `${firstInitial}${last}@${domain}`,     // jsilva@empresa.com
      `${firstInitial}.${last}@${domain}`,    // j.silva@empresa.com
      `${last}${firstInitial}@${domain}`,     // silvaj@empresa.com
      `${last}.${first}@${domain}`,           // silva.joao@empresa.com
    ]
  }

  /**
   * Score de qualidade do email (0-100)
   */
  async scoreEmail(email: string): Promise<number> {
    let score = 0

    // Formato válido: +20
    if (emailValidator.validate(email)) {
      score += 20
    } else {
      return 0 // Email inválido
    }

    // Não é descartável: +20
    if (mailchecker.isValid(email)) {
      score += 20
    }

    // É email corporativo: +30
    if (this.isBusinessEmail(email)) {
      score += 30
    }

    // Domínio existe: +30
    const domain = this.extractDomain(email)
    if (domain) {
      try {
        const mxRecords = await resolveMx(domain)
        if (mxRecords && mxRecords.length > 0) {
          score += 30
        }
      } catch {
        // Domínio não existe, não adicionar pontos
      }
    }

    return score
  }
}

// Singleton export
export const emailValidatorService = new EmailValidatorService()
