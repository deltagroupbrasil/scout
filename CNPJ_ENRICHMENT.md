# CNPJ Enrichment System

Sistema automático de enriquecimento de dados de empresas usando CNPJ (Cadastro Nacional da Pessoa Jurídica).

## 🎯 Objetivo

Quando o LeapScout encontra uma nova empresa através de scraping de vagas, o sistema automaticamente:
1. Busca o CNPJ da empresa
2. Consulta dados na Receita Federal (via Brasil API)
3. Enriquece com faturamento estimado, número de funcionários e setor

## 📊 Dados Obtidos

| Campo | Fonte | Transformação |
|-------|-------|---------------|
| CNPJ | Database local → API | 14 dígitos sem formatação |
| Revenue (Faturamento) | capital_social | `capital_social × 5` |
| Employees (Funcionários) | porte | ME=10, EPP=50, DEMAIS=500 |
| Sector (Setor) | cnae_fiscal_descricao | Texto direto |
| Website | email domain | Extrai domínio do email |

## 🔧 Arquitetura

### Serviços

1. **`lib/services/cnpj-finder.ts`**
   - Busca CNPJ por nome da empresa
   - Database local com 30+ CNPJs conhecidos (Magazine Luiza, Petrobras, Vale, etc.)
   - Método `findCNPJByName(companyName)`

2. **`lib/services/company-enrichment.ts`**
   - Consulta Brasil API com CNPJ
   - Transforma dados brutos em formato estruturado
   - Método `getCompanyByCNPJ(cnpj)`

3. **`lib/services/lead-orchestrator.ts`**
   - Orquestra todo o fluxo
   - Chama CNPJ Finder → Company Enrichment → Salva no DB
   - Inclui delays (3s) para evitar rate limiting

### Fluxo de Dados

```
Scraping encontra empresa
  ↓
CNPJFinder.findCNPJByName()
  ├─ Busca em database local (instantâneo)
  └─ [Futuro] Busca em APIs públicas
  ↓
CompanyEnrichment.getCompanyByCNPJ()
  ├─ Consulta Brasil API
  ├─ Transforma capital_social → revenue
  ├─ Transforma porte → employees
  └─ Retorna CompanyEnrichmentData
  ↓
Prisma.company.create()
  └─ Salva no banco de dados
```

## 💾 Database Local de CNPJs

### Empresas Incluídas (30+)

**Varejo**: Magazine Luiza, Lojas Americanas, Via Varejo, Casas Bahia, Carrefour, Pão de Açúcar

**Indústria**: Petrobras, Vale, Ambev, Natura, Embraer, Gerdau

**Bancos**: Banco do Brasil, Bradesco, Itaú, Santander, Caixa Econômica

**Tecnologia**: TOTVS, Stefanini, CI&T

**Saúde**: Grupo Fleury, DASA, Rede D'Or

**Alimentos**: BRF, JBS, Marfrig

### Como Adicionar Novos CNPJs

Edite `lib/services/cnpj-finder.ts`:

```typescript
const KNOWN_CNPJS: Record<string, string> = {
  // Formato: 'nome normalizado': 'CNPJ 14 dígitos'
  'nome da empresa': '12345678000190',
  'magazine luiza': '47960950000121',  // Exemplo real
}
```

**Importante**:
- Nome deve ser lowercase sem acentos
- CNPJ deve ter exatamente 14 dígitos numéricos
- Sem formatação (sem pontos, traços ou barras)

## 🔐 APIs Utilizadas

### Brasil API (Receita Federal)
- **Endpoint**: `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`
- **Custo**: Gratuito
- **Rate Limit**: ~3-10 req/min (não documentado oficialmente)
- **Retorno**: JSON com dados completos da Receita Federal

#### Exemplo de Response:

```json
{
  "cnpj": "47960950000121",
  "razao_social": "MAGAZINE LUIZA S/A",
  "nome_fantasia": "MAGAZINE LUIZA",
  "capital_social": 13802162000,
  "porte": "DEMAIS",
  "cnae_fiscal_descricao": "Lojas de departamentos...",
  "qsa": [...]  // Quadro de sócios e administradores
}
```

### Rate Limiting

**Problema**: Brasil API retorna 403 Forbidden quando excede limite

**Solução Implementada**:
1. Delay de 3 segundos entre requisições
2. Graceful fallback: salva CNPJ mas deixa revenue/employees null
3. Script separado (`enrich-companies.ts`) para tentar novamente depois

**Logs**:
```
⚠️  [Enrichment] Rate limit atingido (403), usando apenas CNPJ
```

## 📜 Scripts Disponíveis

### 1. Testar CNPJ Finder
```bash
npx tsx scripts/test-cnpj-finder.ts
```
Testa busca de CNPJ para empresas conhecidas (Magazine Luiza, Petrobras, etc.)

### 2. Verificar Empresas no DB
```bash
npx tsx scripts/check-companies.ts
```
Lista todas as empresas com seus CNPJs e dados de enriquecimento:
```
📍 Magazine Luiza
   CNPJ: 47960950000121
   Faturamento: R$ 69.0M
   Funcionários: 500
   Setor: Lojas de departamentos...
```

### 3. Enriquecer Empresas Existentes
```bash
npx tsx scripts/enrich-companies.ts
```
Busca empresas que já têm CNPJ mas não têm revenue/employees e tenta enriquecer.

**Use quando**:
- Rate limit da API já resetou (após algumas horas)
- Banco tem empresas com CNPJ null (revenue/employees)

### 4. Limpar Database
```bash
npx tsx scripts/clear-leads.ts
```
Remove todas as empresas, leads e logs do banco (útil para testes)

## ⚠️ Troubleshooting

### Problema: "Erro ao buscar CNPJ: 403"

**Causa**: Rate limit da Brasil API atingido

**Soluções**:
1. **Aguardar**: Rate limit reseta automaticamente (1-24 horas)
2. **Verificar delays**: Garantir que há 3s entre requisições
3. **Rodar script de enriquecimento**: Usar `enrich-companies.ts` depois

### Problema: "CNPJ não encontrado"

**Causa**: Empresa não está no database local

**Soluções**:
1. **Adicionar manualmente**: Editar `KNOWN_CNPJS` em `cnpj-finder.ts`
2. **Buscar CNPJ**: Consultar em https://cnpj.biz ou Receita Federal
3. **Aceitar null**: Sistema funciona normalmente sem CNPJ

### Problema: Revenue/Employees são null mesmo com CNPJ

**Causa**: Brasil API retornou 403 durante scraping

**Solução**: Rodar script de enriquecimento quando API voltar:
```bash
npx tsx scripts/enrich-companies.ts
```

## 🚀 Melhorias Futuras

1. **Cache de Requisições**: Evitar consultar mesmo CNPJ múltiplas vezes
2. **API Paga**: Considerar ReceitaWS ou serviços pagos para maior volume
3. **Queue System**: Enfileirar enriquecimentos para processar fora do scraping
4. **Scraping de CNPJ**: Extrair CNPJ de páginas "Sobre" das empresas
5. **Database maior**: Expandir KNOWN_CNPJS para 100+ empresas

## 📚 Referências

- Brasil API Docs: https://brasilapi.com.br/docs
- Receita Federal: https://www.gov.br/receitafederal
- CNPJ.biz (consulta gratuita): https://cnpj.biz
