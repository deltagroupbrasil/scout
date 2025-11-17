import { describe, it, expect } from 'vitest'
import { phoneValidator } from '@/lib/services/phone-validator'

describe('PhoneValidatorService', () => {
  describe('validatePhone', () => {
    it('deve validar celular com DDD (11 dígitos)', () => {
      const phones = [
        '11987654321',
        '(11) 98765-4321',
        '11 98765-4321',
        '+55 11 98765-4321',
        '+5511987654321',
      ]

      phones.forEach(phone => {
        const result = phoneValidator.validatePhone(phone)
        expect(result.valid).toBe(true)
        expect(result.type).toBe('mobile')
      })
    })

    it('deve validar telefone fixo (10 dígitos)', () => {
      const phones = [
        '1123456789',
        '(11) 2345-6789',
        '11 2345-6789',
        '+55 11 2345-6789',
      ]

      phones.forEach(phone => {
        const result = phoneValidator.validatePhone(phone)
        expect(result.valid).toBe(true)
        expect(result.type).toBe('fixed')
      })
    })

    it('deve validar 0800', () => {
      const phones = [
        '08001234567',
        '0800 123 4567',
        '0800-123-4567',
      ]

      phones.forEach(phone => {
        const result = phoneValidator.validatePhone(phone)
        expect(result.valid).toBe(true)
        expect(result.type).toBe('toll-free')
      })
    })

    it('deve rejeitar telefones inválidos', () => {
      const invalidPhones = [
        '123',                    // Muito curto
        '12345678901234567',     // Muito longo
        '1187654321',            // Celular sem 9
        '(99) 98765-4321',       // DDD inválido
      ]

      invalidPhones.forEach(phone => {
        const result = phoneValidator.validatePhone(phone)
        expect(result.valid).toBe(false)
      })
    })
  })

  describe('formatPhone', () => {
    it('deve formatar celular corretamente', () => {
      expect(phoneValidator.formatPhone('11987654321')).toBe('(11) 98765-4321')
      expect(phoneValidator.formatPhone('21987654321')).toBe('(21) 98765-4321')
    })

    it('deve formatar fixo corretamente', () => {
      expect(phoneValidator.formatPhone('1123456789')).toBe('(11) 2345-6789')
    })

    it('deve formatar 0800 corretamente', () => {
      expect(phoneValidator.formatPhone('08001234567')).toBe('0800 123 4567')
    })

    it('deve retornar null para telefone inválido', () => {
      expect(phoneValidator.formatPhone('invalid')).toBeNull()
    })
  })

  describe('isMobile', () => {
    it('deve identificar celular corretamente', () => {
      expect(phoneValidator.isMobile('11987654321')).toBe(true)
      expect(phoneValidator.isMobile('(21) 98765-4321')).toBe(true)
      expect(phoneValidator.isMobile('+55 11 98765-4321')).toBe(true)
    })

    it('deve rejeitar telefone fixo', () => {
      expect(phoneValidator.isMobile('1123456789')).toBe(false)
      expect(phoneValidator.isMobile('(11) 2345-6789')).toBe(false)
    })
  })

  describe('isFixed', () => {
    it('deve identificar fixo corretamente', () => {
      expect(phoneValidator.isFixed('1123456789')).toBe(true)
      expect(phoneValidator.isFixed('(11) 2345-6789')).toBe(true)
    })

    it('deve rejeitar celular', () => {
      expect(phoneValidator.isFixed('11987654321')).toBe(false)
    })
  })

  describe('isTollFree', () => {
    it('deve identificar 0800', () => {
      expect(phoneValidator.isTollFree('08001234567')).toBe(true)
      expect(phoneValidator.isTollFree('0800 123 4567')).toBe(true)
    })

    it('deve rejeitar não-0800', () => {
      expect(phoneValidator.isTollFree('11987654321')).toBe(false)
    })
  })

  describe('extractDDD', () => {
    it('deve extrair DDD corretamente', () => {
      expect(phoneValidator.extractDDD('11987654321')).toBe('11')
      expect(phoneValidator.extractDDD('(21) 98765-4321')).toBe('21')
      expect(phoneValidator.extractDDD('+55 11 98765-4321')).toBe('11')
    })

    it('deve retornar null para telefone muito curto', () => {
      expect(phoneValidator.extractDDD('123')).toBeNull()
    })
  })

  describe('isValidDDD', () => {
    it('deve validar DDDs existentes', () => {
      const validDDDs = ['11', '21', '31', '41', '51', '61', '71', '81', '91']
      validDDDs.forEach(ddd => {
        expect(phoneValidator.isValidDDD(ddd)).toBe(true)
      })
    })

    it('deve rejeitar DDDs inválidos', () => {
      const invalidDDDs = ['00', '99', '10', '20']
      invalidDDDs.forEach(ddd => {
        expect(phoneValidator.isValidDDD(ddd)).toBe(false)
      })
    })
  })

  describe('isFromRegion', () => {
    it('deve verificar se telefone é de região específica', () => {
      expect(phoneValidator.isFromRegion('11987654321', '11')).toBe(true)
      expect(phoneValidator.isFromRegion('(21) 98765-4321', '21')).toBe(true)
    })

    it('deve retornar false para região diferente', () => {
      expect(phoneValidator.isFromRegion('11987654321', '21')).toBe(false)
    })
  })

  describe('areEqual', () => {
    it('deve comparar telefones ignorando formatação', () => {
      expect(phoneValidator.areEqual('11987654321', '(11) 98765-4321')).toBe(true)
      expect(phoneValidator.areEqual('+55 11 98765-4321', '11987654321')).toBe(true)
    })

    it('deve retornar false para telefones diferentes', () => {
      expect(phoneValidator.areEqual('11987654321', '11987654322')).toBe(false)
    })
  })

  describe('extractPhonesFromText', () => {
    it('deve extrair telefones de texto', () => {
      const text = `
        Entre em contato:
        Celular: (11) 98765-4321
        Fixo: (11) 2345-6789
        0800: 0800 123 4567
        Whatsapp: +55 21 98765-4321
      `

      const phones = phoneValidator.extractPhonesFromText(text)

      expect(phones.length).toBeGreaterThan(0)
      expect(phones).toContain('(11) 98765-4321')
    })

    it('deve retornar array vazio se não houver telefones', () => {
      const text = 'Texto sem telefones'
      const phones = phoneValidator.extractPhonesFromText(text)

      expect(phones).toEqual([])
    })
  })

  describe('normalizePhone', () => {
    it('deve normalizar telefone com +55', () => {
      expect(phoneValidator.normalizePhone('11987654321')).toBe('+5511987654321')
      expect(phoneValidator.normalizePhone('(11) 98765-4321')).toBe('+5511987654321')
    })

    it('não deve duplicar +55', () => {
      expect(phoneValidator.normalizePhone('+5511987654321')).toBe('+5511987654321')
    })
  })
})
