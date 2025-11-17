// Teste das funções de extração de revenue e employees
import 'dotenv/config'

// Copiar as funções do lead-orchestrator para testar
function extractEmployeesFromString(employeesStr: string): number | null {
  try {
    console.log(`\n🔍 Input: "${employeesStr}"`)

    // Remove caracteres especiais
    const cleaned = employeesStr
      .replace(/\./g, '')
      .replace(/,/g, '')
      .trim()

    console.log(`   Cleaned: "${cleaned}"`)

    // Padrão de faixa: "500-1000"
    const rangeMatch = cleaned.match(/(\d+)\s*[-–]\s*(\d+)/)
    if (rangeMatch) {
      console.log(`   Range match: ${rangeMatch[0]}`)
      const min = parseInt(rangeMatch[1])
      const max = parseInt(rangeMatch[2])
      const avg = Math.round((min + max) / 2)
      console.log(`   Min: ${min}, Max: ${max}, Avg: ${avg}`)
      return avg
    }

    // Padrão de valor único: "1200"
    const singleMatch = cleaned.match(/(\d+)/)
    if (singleMatch) {
      console.log(`   Single match: ${singleMatch[0]}`)
      const value = parseInt(singleMatch[1])
      console.log(`   Value: ${value}`)
      return value
    }

    console.log('   ❌ No match')
    return null
  } catch (error) {
    console.error('   ❌ Erro ao extrair employees:', error)
    return null
  }
}

function extractRevenueFromString(revenueStr: string): number | null {
  try {
    console.log(`\n🔍 Input: "${revenueStr}"`)

    const cleaned = revenueStr
      .toLowerCase()
      .replace(/[r$]/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .trim()

    console.log(`   Cleaned: "${cleaned}"`)

    // Faixa: "50M - 100M" ou "50 milhões - 100 milhões"
    const rangePatterns = [
      /(\d+(?:\.\d+)?)\s*(milh[õo]es?|m)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(milh[õo]es?|m)/,
      /(\d+(?:\.\d+)?)\s*(bilh[õo]es?|b)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(bilh[õo]es?|b)/
    ]

    for (const pattern of rangePatterns) {
      const match = cleaned.match(pattern)
      if (match) {
        console.log(`   Range match: ${match[0]}`)
        const min = parseFloat(match[1])
        const max = parseFloat(match[3])
        const unit = match[2]

        const avg = (min + max) / 2
        console.log(`   Min: ${min}, Max: ${max}, Avg: ${avg}, Unit: ${unit}`)

        if (unit.includes('bilh')) {
          return avg * 1_000_000_000
        } else if (unit.includes('m') || unit.includes('milh')) {
          return avg * 1_000_000
        }
      }
    }

    // Valor único: "500 milhões" ou "50M"
    const singlePatterns = [
      /(\d+(?:\.\d+)?)\s*(milh[õo]es?|m)/,
      /(\d+(?:\.\d+)?)\s*(bilh[õo]es?|b)/
    ]

    for (const pattern of singlePatterns) {
      const match = cleaned.match(pattern)
      if (match) {
        console.log(`   Single match: ${match[0]}`)
        const value = parseFloat(match[1])
        const unit = match[2]
        console.log(`   Value: ${value}, Unit: ${unit}`)

        if (unit.includes('bilh')) {
          return value * 1_000_000_000
        } else if (unit.includes('m') || unit.includes('milh')) {
          return value * 1_000_000
        }
      }
    }

    console.log('   ❌ No match')
    return null
  } catch (error) {
    console.error('   ❌ Erro ao extrair revenue:', error)
    return null
  }
}

console.log('🧪 TESTE DE EXTRAÇÃO DE DADOS\n')
console.log('='.repeat(70))

console.log('\n📊 EMPLOYEES:')
console.log('='.repeat(70))

const employeeTests = [
  '500-1.000',
  '1.200',
  '50-100',
  'Não disponível',
  '100'
]

employeeTests.forEach(test => {
  const result = extractEmployeesFromString(test)
  console.log(`   ✅ Result: ${result}`)
})

console.log('\n💰 REVENUE:')
console.log('='.repeat(70))

const revenueTests = [
  'R$ 500 milhões',
  'R$ 1 bilhão',
  '50M - 100M',
  '50 milhões - 100 milhões',
  'Não disponível',
  'R$ 50M'
]

revenueTests.forEach(test => {
  const result = extractRevenueFromString(test)
  console.log(`   ✅ Result: ${result ? `R$ ${(result / 1_000_000).toFixed(1)}M` : 'NULL'}`)
})

console.log('\n' + '='.repeat(70))
console.log('✅ Teste finalizado!')
