/**
 * Validação de Variáveis de Ambiente Críticas
 * Garante que todas as variáveis essenciais estão configuradas
 */

export function validateEnvVars() {
  const required = {
    // Autenticação
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,

    // Banco de Dados
    DATABASE_URL: process.env.DATABASE_URL,
  }

  const critical = {
    // AI (crítico para enrichment)
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
  }

  const optional = {
    // APIs Externas (degradação graceful)
    BRIGHT_DATA_UNLOCKER_KEY: process.env.BRIGHT_DATA_UNLOCKER_KEY,
    BRIGHT_DATA_SERP_KEY: process.env.BRIGHT_DATA_SERP_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
  }

  // Validar variáveis obrigatórias
  const missingRequired = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missingRequired.length > 0) {
    const error = `ERRO CRÍTICO: Variáveis de ambiente obrigatórias não configuradas:\n${missingRequired.map(k => `  - ${k}`).join('\n')}`
    console.error(error)
    throw new Error(error)
  }

  // Avisar sobre variáveis críticas faltando
  const missingCritical = Object.entries(critical)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missingCritical.length > 0) {
    console.warn(`⚠️  Variáveis críticas não configuradas (funcionalidade limitada):\n${missingCritical.map(k => `  - ${k}`).join('\n')}`)
  }

  // Informar sobre variáveis opcionais faltando
  const missingOptional = Object.entries(optional)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missingOptional.length > 0 && process.env.NODE_ENV !== 'production') {
    console.log(`ℹ️  Variáveis opcionais não configuradas:\n${missingOptional.map(k => `  - ${k}`).join('\n')}`)
  }

  console.log('✅ Validação de variáveis de ambiente concluída')

  return {
    valid: true,
    missingCritical,
    missingOptional
  }
}

// Executar validação ao importar (servidor)
if (typeof window === 'undefined') {
  try {
    validateEnvVars()
  } catch (error) {
    // Erro já foi logado, apenas re-throw
    throw error
  }
}
