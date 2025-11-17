import { describe, it, expect } from 'vitest'
import { emailValidatorService } from '@/lib/services/email-validator'

describe('EmailValidatorService', () => {
  describe('validateEmailFast', () => {
    it('deve validar emails com formato correto', () => {
      const validEmails = [
        'joao.silva@petrobras.com.br',
        'maria@magazineluiza.com.br',
        'teste@gmail.com',
        'user+tag@domain.com',
      ]

      validEmails.forEach(email => {
        const result = emailValidatorService.validateEmailFast(email)
        expect(result.valid).toBe(true)
        expect(result.checks.format).toBe(true)
      })
    })

    it('deve rejeitar emails com formato inválido', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@domain.com',
        'in valid@domain.com',
        'invalid@domain',
      ]

      invalidEmails.forEach(email => {
        const result = emailValidatorService.validateEmailFast(email)
        expect(result.valid).toBe(false)
        expect(result.checks.format).toBe(false)
      })
    })

    it('deve rejeitar emails descartáveis', () => {
      const disposableEmails = [
        'test@guerrillamail.com',
        'user@tempmail.com',
        'fake@10minutemail.com',
      ]

      disposableEmails.forEach(email => {
        const result = emailValidatorService.validateEmailFast(email)
        expect(result.valid).toBe(false)
        expect(result.checks.disposable).toBe(false)
      })
    })
  })

  describe('isBusinessEmail', () => {
    it('deve identificar emails corporativos', () => {
      const businessEmails = [
        'joao@petrobras.com.br',
        'maria@magazineluiza.com.br',
        'admin@empresa-xpto.com.br',
        'contato@vale.com',
      ]

      businessEmails.forEach(email => {
        expect(emailValidatorService.isBusinessEmail(email)).toBe(true)
      })
    })

    it('deve identificar emails pessoais', () => {
      const personalEmails = [
        'teste@gmail.com',
        'user@hotmail.com',
        'contato@yahoo.com.br',
        'admin@outlook.com',
        'user@uol.com.br',
      ]

      personalEmails.forEach(email => {
        expect(emailValidatorService.isBusinessEmail(email)).toBe(false)
      })
    })
  })

  describe('extractDomain', () => {
    it('deve extrair domínio corretamente', () => {
      expect(emailValidatorService.extractDomain('joao@petrobras.com.br')).toBe('petrobras.com.br')
      expect(emailValidatorService.extractDomain('maria@gmail.com')).toBe('gmail.com')
    })

    it('deve retornar null para email inválido', () => {
      expect(emailValidatorService.extractDomain('invalid')).toBeNull()
      expect(emailValidatorService.extractDomain('invalid@')).toBeNull()
    })
  })

  describe('normalizeEmail', () => {
    it('deve normalizar email (lowercase e trim)', () => {
      expect(emailValidatorService.normalizeEmail('  Joao@Gmail.COM  ')).toBe('joao@gmail.com')
      expect(emailValidatorService.normalizeEmail('MARIA@TESTE.COM.BR')).toBe('maria@teste.com.br')
    })

    it('deve remover pontos em emails Gmail', () => {
      expect(emailValidatorService.normalizeEmail('joao.silva@gmail.com')).toBe('joaosilva@gmail.com')
      expect(emailValidatorService.normalizeEmail('m.a.r.i.a@gmail.com')).toBe('maria@gmail.com')
    })

    it('não deve remover pontos em emails não-Gmail', () => {
      expect(emailValidatorService.normalizeEmail('joao.silva@petrobras.com.br')).toBe('joao.silva@petrobras.com.br')
    })
  })

  describe('matchesDomain', () => {
    it('deve verificar se email pertence ao domínio', () => {
      expect(emailValidatorService.matchesDomain('joao@petrobras.com.br', 'petrobras.com.br')).toBe(true)
      expect(emailValidatorService.matchesDomain('maria@petrobras.com.br', 'www.petrobras.com.br')).toBe(true)
    })

    it('deve aceitar subdomínios', () => {
      expect(emailValidatorService.matchesDomain('joao@mail.petrobras.com.br', 'petrobras.com.br')).toBe(true)
    })

    it('deve rejeitar domínios diferentes', () => {
      expect(emailValidatorService.matchesDomain('joao@gmail.com', 'petrobras.com.br')).toBe(false)
      expect(emailValidatorService.matchesDomain('maria@vale.com', 'petrobras.com.br')).toBe(false)
    })
  })

  describe('suggestEmailPattern', () => {
    it('deve gerar padrões de email comuns', () => {
      const suggestions = emailValidatorService.suggestEmailPattern('João', 'Silva', 'petrobras.com.br')

      expect(suggestions).toContain('joão.silva@petrobras.com.br')
      expect(suggestions).toContain('joão@petrobras.com.br')
      expect(suggestions).toContain('joãosilva@petrobras.com.br')
      expect(suggestions).toContain('jsilva@petrobras.com.br')
      expect(suggestions.length).toBeGreaterThan(5)
    })
  })
})
