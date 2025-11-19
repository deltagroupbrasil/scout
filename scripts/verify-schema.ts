/**
 * Verifica se o schema do Prisma está sincronizado com o banco de dados
 */

import { Client } from 'pg'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.production') })

async function verifySchema() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })

  try {
    await client.connect()
    console.log('✅ Conectado ao banco de produção!\n')

    // Verificar colunas da tabela User
    const userColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'User'
      ORDER BY ordinal_position
    `)

    console.log('📋 Colunas da tabela User:')
    userColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(nullable)'}`)
    })

    // Verificar se isAdmin existe
    const hasIsAdmin = userColumns.rows.some(col => col.column_name === 'isAdmin')
    console.log(`\n${hasIsAdmin ? '✅' : '❌'} Campo isAdmin: ${hasIsAdmin ? 'EXISTS' : 'MISSING'}`)

    // Verificar colunas da tabela Company
    const companyColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Company'
      ORDER BY ordinal_position
    `)

    console.log('\n📋 Colunas da tabela Company (primeiras 20):')
    companyColumns.rows.slice(0, 20).forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`)
    })

    // Verificar se websiteSource existe
    const hasWebsiteSource = companyColumns.rows.some(col => col.column_name === 'websiteSource')
    console.log(`\n${hasWebsiteSource ? '✅' : '❌'} Campo websiteSource: ${hasWebsiteSource ? 'EXISTS' : 'MISSING'}`)

    // Verificar índices únicos
    const uniqueConstraints = await client.query(`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_name IN ('User', 'Company', 'Lead')
      ORDER BY tc.table_name, tc.constraint_name
    `)

    console.log('\n🔑 Índices únicos:')
    uniqueConstraints.rows.forEach(idx => {
      console.log(`  - ${idx.table_name}.${idx.column_name} (${idx.constraint_name})`)
    })

    await client.end()
    console.log('\n✅ Verificação concluída!')

  } catch (error) {
    console.error('❌ ERRO:', error)
    await client.end()
    process.exit(1)
  }
}

verifySchema()
