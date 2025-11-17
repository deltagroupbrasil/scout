/**
 * Phone Validator Service
 *
 * Valida e formata telefones brasileiros:
 * - Celular: (XX) 9XXXX-XXXX ou (XX) 9 XXXX-XXXX
 * - Fixo: (XX) XXXX-XXXX
 * - 0800: 0800 XXX XXXX
 * - DDI: +55 (XX) 9XXXX-XXXX
 */

import { parsePhoneNumber, isValidPhoneNumber, PhoneNumber } from 'libphonenumber-js'

export interface PhoneValidationResult {
  valid: boolean
  phone: string | null
  formatted: string | null
  type: 'mobile' | 'fixed' | 'toll-free' | 'unknown' | null
  region: string | null
  international: string | null
  national: string | null
  reason?: string
}

export class PhoneValidatorService {
  /**
   * Valida telefone brasileiro
   */
  validatePhone(phone: string): PhoneValidationResult {
    const result: PhoneValidationResult = {
      valid: false,
      phone: phone.trim(),
      formatted: null,
      type: null,
      region: null,
      international: null,
      national: null,
    }

    // Remover formatação
    const cleaned = this.cleanPhone(phone)

    // Validação básica de comprimento
    if (cleaned.length < 10 || cleaned.length > 13) {
      result.reason = 'Telefone deve ter entre 10 e 13 dígitos'
      return result
    }

    // Tentar parsear como telefone brasileiro
    try {
      // Adicionar +55 se não tiver código do país
      const phoneWithCountry = cleaned.startsWith('55') ? `+${cleaned}` : `+55${cleaned}`

      if (!isValidPhoneNumber(phoneWithCountry, 'BR')) {
        result.reason = 'Número inválido para Brasil'
        return result
      }

      const parsed = parsePhoneNumber(phoneWithCountry, 'BR')

      if (!parsed) {
        result.reason = 'Não foi possível parsear o número'
        return result
      }

      // Verificar se é telefone brasileiro
      if (parsed.country !== 'BR') {
        result.reason = 'Número não é brasileiro'
        return result
      }

      result.valid = true
      result.formatted = this.formatBrazilianPhone(parsed)
      result.type = this.getPhoneType(cleaned)
      result.region = `+${parsed.countryCallingCode}`
      result.international = parsed.formatInternational()
      result.national = parsed.formatNational()

      return result
    } catch (error) {
      result.reason = 'Erro ao validar telefone'
      return result
    }
  }

  /**
   * Valida batch de telefones
   */
  validatePhoneBatch(phones: string[]): PhoneValidationResult[] {
    return phones.map(phone => this.validatePhone(phone))
  }

  /**
   * Verifica se telefone é celular (9 dígitos)
   */
  isMobile(phone: string): boolean {
    const cleaned = this.cleanPhone(phone)

    // Celular tem 11 dígitos (DDD + 9 + 8 dígitos)
    // Ou 13 dígitos com +55
    if (cleaned.length === 11) {
      return cleaned[2] === '9'
    }

    if (cleaned.length === 13 && cleaned.startsWith('55')) {
      return cleaned[4] === '9'
    }

    return false
  }

  /**
   * Verifica se telefone é fixo (8 dígitos)
   */
  isFixed(phone: string): boolean {
    const cleaned = this.cleanPhone(phone)

    // Fixo tem 10 dígitos (DDD + 8 dígitos)
    // Ou 12 dígitos com +55
    if (cleaned.length === 10) {
      return cleaned[2] !== '9'
    }

    if (cleaned.length === 12 && cleaned.startsWith('55')) {
      return cleaned[4] !== '9'
    }

    return false
  }

  /**
   * Verifica se telefone é 0800
   */
  isTollFree(phone: string): boolean {
    const cleaned = this.cleanPhone(phone)
    return cleaned.startsWith('0800')
  }

  /**
   * Formata telefone no padrão brasileiro
   */
  formatPhone(phone: string): string | null {
    const result = this.validatePhone(phone)
    return result.valid ? result.formatted : null
  }

  /**
   * Extrai DDD do telefone
   */
  extractDDD(phone: string): string | null {
    const cleaned = this.cleanPhone(phone)

    // Remover +55 se houver
    const withoutCountry = cleaned.startsWith('55') ? cleaned.substring(2) : cleaned

    // DDD são os 2 primeiros dígitos
    if (withoutCountry.length >= 10) {
      return withoutCountry.substring(0, 2)
    }

    return null
  }

  /**
   * Verifica se telefone pertence a região específica
   */
  isFromRegion(phone: string, ddd: string): boolean {
    const extractedDDD = this.extractDDD(phone)
    return extractedDDD === ddd
  }

  /**
   * Lista de DDDs válidos do Brasil
   */
  getValidDDDs(): string[] {
    return [
      '11', '12', '13', '14', '15', '16', '17', '18', '19', // SP
      '21', '22', '24', // RJ
      '27', '28', // ES
      '31', '32', '33', '34', '35', '37', '38', // MG
      '41', '42', '43', '44', '45', '46', // PR
      '47', '48', '49', // SC
      '51', '53', '54', '55', // RS
      '61', // DF
      '62', '64', // GO
      '63', // TO
      '65', '66', // MT
      '67', // MS
      '68', // AC
      '69', // RO
      '71', '73', '74', '75', '77', // BA
      '79', // SE
      '81', '87', // PE
      '82', // AL
      '83', // PB
      '84', // RN
      '85', '88', // CE
      '86', '89', // PI
      '91', '93', '94', // PA
      '92', '97', // AM
      '95', // RR
      '96', // AP
      '98', '99', // MA
    ]
  }

  /**
   * Valida se DDD existe
   */
  isValidDDD(ddd: string): boolean {
    return this.getValidDDDs().includes(ddd)
  }

  /**
   * Remove formatação do telefone
   */
  private cleanPhone(phone: string): string {
    return phone.replace(/\D/g, '')
  }

  /**
   * Determina tipo de telefone
   */
  private getPhoneType(cleaned: string): 'mobile' | 'fixed' | 'toll-free' | 'unknown' {
    if (this.isTollFree(cleaned)) return 'toll-free'
    if (this.isMobile(cleaned)) return 'mobile'
    if (this.isFixed(cleaned)) return 'fixed'
    return 'unknown'
  }

  /**
   * Formata telefone brasileiro
   */
  private formatBrazilianPhone(parsed: PhoneNumber): string {
    const national = parsed.nationalNumber.toString()

    // 0800
    if (national.startsWith('0800')) {
      return national.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')
    }

    // Celular (11 dígitos)
    if (national.length === 11) {
      return national.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    }

    // Fixo (10 dígitos)
    if (national.length === 10) {
      return national.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
    }

    // Fallback
    return parsed.formatNational()
  }

  /**
   * Normaliza telefone (remove espaços, parênteses, hífens)
   */
  normalizePhone(phone: string): string {
    const cleaned = this.cleanPhone(phone)

    // Adicionar +55 se não tiver
    if (cleaned.startsWith('55')) {
      return `+${cleaned}`
    }

    return `+55${cleaned}`
  }

  /**
   * Compara dois telefones (ignora formatação)
   */
  areEqual(phone1: string, phone2: string): boolean {
    const cleaned1 = this.cleanPhone(phone1)
    const cleaned2 = this.cleanPhone(phone2)

    // Remover +55 de ambos se houver
    const normalized1 = cleaned1.startsWith('55') ? cleaned1.substring(2) : cleaned1
    const normalized2 = cleaned2.startsWith('55') ? cleaned2.substring(2) : cleaned2

    return normalized1 === normalized2
  }

  /**
   * Extrai telefones de texto
   */
  extractPhonesFromText(text: string): string[] {
    // Padrões comuns de telefone brasileiro
    const patterns = [
      /\+55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g,  // +55 (11) 91234-5678
      /\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g,          // (11) 91234-5678
      /0800\s?\d{3}\s?\d{4}/g,                   // 0800 123 4567
    ]

    const found: Set<string> = new Set()

    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) {
        matches.forEach(match => found.add(match.trim()))
      }
    }

    return Array.from(found)
  }
}

// Singleton export
export const phoneValidator = new PhoneValidatorService()
