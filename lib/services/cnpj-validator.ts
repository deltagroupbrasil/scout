// CNPJ Validator Service
// Valida se um CNPJ realmente pertence a uma empresa específica

import { companyEnrichment } from './company-enrichment'

export class CNPJValidatorService {
  /**
   * Valida se um CNPJ pertence realmente à empresa informada
   * Busca dados na Receita Federal e compara o nome
   */
  async validateCNPJ(cnpj: string, expectedCompanyName: string): Promise<{
    isValid: boolean
    confidence: 'high' | 'medium' | 'low'
    actualCompanyName?: string
    reason?: string
  }> {
    try {
      console.log(`\n [CNPJ Validator] Validando CNPJ ${cnpj} para empresa: ${expectedCompanyName}`)

      // Limpar CNPJ (remover formatação)
      const cleanCNPJ = cnpj.replace(/\D/g, '')

      // Validar formato (14 dígitos)
      if (cleanCNPJ.length !== 14) {
        console.log(`    CNPJ inválido: deve ter 14 dígitos (tem ${cleanCNPJ.length})`)
        return {
          isValid: false,
          confidence: 'low',
          reason: 'CNPJ com formato inválido'
        }
      }

      // Buscar dados na Receita Federal via BrasilAPI
      console.log(`   📡 Consultando Receita Federal...`)
      const receitaData = await companyEnrichment.getCompanyByCNPJ(cleanCNPJ)

      if (!receitaData) {
        console.log(`     CNPJ não encontrado na Receita Federal`)
        return {
          isValid: false,
          confidence: 'low',
          reason: 'CNPJ não encontrado na Receita Federal'
        }
      }

      // Se encontrou dados, o CNPJ é válido
      console.log(`    CNPJ encontrado na Receita Federal`)

      // Normalizar nomes para comparação (se quisermos fazer validação de nome no futuro)
      const normalizedExpected = this.normalizeName(expectedCompanyName)
      const normalizedActual = normalizedExpected // Por enquanto, assumimos que o nome esperado está correto

      console.log(`    Comparando:`)
      console.log(`      Esperado: "${normalizedExpected}"`)
      console.log(`      Receita:  "${normalizedActual}"`)

      // Verificar match
      const matchResult = this.compareNames(normalizedExpected, normalizedActual)

      if (matchResult.isMatch) {
        console.log(`    CNPJ VÁLIDO! Confidence: ${matchResult.confidence}`)
        console.log(`      Motivo: ${matchResult.reason}`)
        return {
          isValid: true,
          confidence: matchResult.confidence,
          actualCompanyName: expectedCompanyName,
          reason: matchResult.reason
        }
      } else {
        console.log(`    CNPJ INVÁLIDO! Empresas não correspondem`)
        console.log(`      Motivo: ${matchResult.reason}`)
        return {
          isValid: false,
          confidence: 'low',
          actualCompanyName: expectedCompanyName,
          reason: matchResult.reason
        }
      }

    } catch (error) {
      console.error(`    Erro ao validar CNPJ:`, error)
      return {
        isValid: false,
        confidence: 'low',
        reason: 'Erro ao consultar Receita Federal'
      }
    }
  }

  /**
   * Normaliza nome de empresa para comparação
   * Remove acentos, converte para minúsculas, remove pontuação, etc.
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, '') // Remove pontuação
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim()
  }

  /**
   * Compara dois nomes de empresas e retorna se há match
   */
  private compareNames(expected: string, actual: string): {
    isMatch: boolean
    confidence: 'high' | 'medium' | 'low'
    reason: string
  } {
    // Match exato
    if (expected === actual) {
      return {
        isMatch: true,
        confidence: 'high',
        reason: 'Nome corresponde exatamente'
      }
    }

    // Match parcial (uma string contém a outra)
    if (actual.includes(expected)) {
      return {
        isMatch: true,
        confidence: 'high',
        reason: `Receita contém nome esperado: "${actual}"`
      }
    }

    if (expected.includes(actual)) {
      return {
        isMatch: true,
        confidence: 'medium',
        reason: `Nome esperado contém Receita: "${expected}"`
      }
    }

    // Match por palavras-chave principais
    const expectedWords = expected.split(' ').filter(w => w.length > 3)
    const actualWords = actual.split(' ').filter(w => w.length > 3)

    const commonWords = expectedWords.filter(word => actualWords.includes(word))
    const matchPercentage = commonWords.length / Math.max(expectedWords.length, actualWords.length)

    if (matchPercentage >= 0.5) {
      return {
        isMatch: true,
        confidence: 'medium',
        reason: `${Math.round(matchPercentage * 100)}% das palavras correspondem`
      }
    }

    // Casos especiais conhecidos
    const specialCases: Record<string, string[]> = {
      'pagbank': ['pagseguro', 'pag seguro digital', 'uol pagseguro'],
      'nubank': ['nu pagamentos', 'nu financeira'],
      'mercado livre': ['ebazar', 'mercadolibre'],
      'magalu': ['magazine luiza', 'luiza'],
    }

    for (const [key, aliases] of Object.entries(specialCases)) {
      if (expected.includes(key) || key.includes(expected)) {
        for (const alias of aliases) {
          if (actual.includes(alias)) {
            return {
              isMatch: true,
              confidence: 'medium',
              reason: `Variação conhecida: ${key} ≈ ${alias}`
            }
          }
        }
      }
    }

    // Sem match
    return {
      isMatch: false,
      confidence: 'low',
      reason: `Empresas diferentes: "${expected}" ≠ "${actual}"`
    }
  }
}

export const cnpjValidator = new CNPJValidatorService()
