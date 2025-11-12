# Sistema de Enriquecimento de Empresas com IA

Sistema completo de enriquecimento automático de empresas usando Claude AI para buscar not íciaias, eventos, redes sociais e insights.

## 🎯 Funcionalidades

### 1. Consolidação de Empresas Duplicadas

O sistema agora detecta e consolida empresas duplicadas automaticamente:

```
"Magazine Luiza" === "magazine luiza" === "MAGAZINE LUIZA"
```

**Como funciona:**
- Normaliza nomes removendo acentos, caracteres especiais e convertendo para lowercase
- Antes de criar nova empresa, verifica se já existe uma similar
- Consolida múltiplas vagas da mesma empresa em um único registro

**Vantagens:**
- ✅ Evita duplicação de dados
- ✅ Agrupa todas as vagas de uma empresa
- ✅ Histórico completo de contatos por empresa

### 2. Enriquecimento Automático com IA

Ao criar nova empresa, o sistema automaticamente busca e salva:

#### 💰 Dados Financeiros
- **Faturamento Estimado**: Faixa de receita anual (ex: "R$ 50M - R$ 100M")
- **Funcionários Estimados**: Número aproximado de colaboradores (ex: "200-500")

#### 📰 Notícias Recentes
- Últimas 3-5 notícias sobre a empresa (últimos 6 meses)
- Título, data, fonte e URL (quando disponível)
- Exemplo:
```json
{
  "title": "Magazine Luiza anuncia expansão no Nordeste",
  "date": "2025-01-15",
  "source": "Valor Econômico",
  "url": "https://..."
}
```

#### 📅 Eventos
- Participações em feiras, conferências, webinars
- Lançamentos de produtos
- Expansões ou mudanças
- Exemplo:
```json
{
  "name": "NRF 2025 - National Retail Federation",
  "date": "2025-03-20",
  "type": "feira"
}
```

#### 📱 Redes Sociais
- **Instagram**: @usuario, número de seguidores, último post
- **LinkedIn**: URL da empresa, número de seguidores

#### 📊 Insights de Mercado
- Posição no mercado (líder, challenger, nicho)
- 3-5 insights chave sobre a empresa
  - Desafios atuais
  - Oportunidades de mercado
  - Diferenciais competitivos

## 🏗️ Arquitetura

### Fluxo de Criação de Empresa

```
Nova vaga scraped
  ↓
Lead Orchestrator recebe
  ↓
Busca empresa no banco (nome normalizado)
  ↓
├─ Existe? → Consolida com empresa existente
│             └─ Enriquecimento expirou (>7 dias)? → Re-enriquecer
│
└─ Não existe? → Criar nova empresa
                  ├─ Buscar CNPJ (Brasil API)
                  ├─ Enriquecer dados oficiais (Receita Federal)
                  └─ Enriquecer com IA (Claude)
                      ├─ Notícias
                      ├─ Eventos
                      ├─ Instagram
                      ├─ Estimativas financeiras
                      └─ Insights de mercado
```

### Componentes

#### `ai-company-enrichment.ts`
```typescript
async enrichCompany(
  companyName: string,
  companySector?: string,
  companyWebsite?: string
): Promise<CompanyEnrichmentData>
```

**Retorna:**
- `estimatedRevenue`: Faixa estimada
- `estimatedEmployees`: Faixa estimada
- `recentNews[]`: Array de notícias
- `upcomingEvents[]`: Array de eventos
- `socialMedia`: Instagram + LinkedIn
- `industryPosition`: Posição no mercado
- `keyInsights[]`: Insights chave

#### `lead-orchestrator.ts`
```typescript
private async enrichCompanyWithAI(
  companyId: string,
  companyName: string,
  sector?: string | null,
  website?: string | null
): Promise<void>
```

**Processo:**
1. Chama `aiCompanyEnrichment.enrichCompany()`
2. Salva dados JSON no banco
3. Marca `enrichedAt` com timestamp
4. Logs detalhados do resultado

## 📊 Campos do Banco de Dados

### Tabela `companies`

```prisma
model Company {
  // ... campos existentes ...

  // AI Enrichment Data
  estimatedRevenue    String?   // "R$ 50M - R$ 100M"
  estimatedEmployees  String?   // "200-500"
  recentNews          String?   // JSON Array
  upcomingEvents      String?   // JSON Array
  instagramHandle     String?   // @magazineluiza
  instagramFollowers  String?   // "2.5M"
  linkedinFollowers   String?   // "500k"
  industryPosition    String?   // "Líder em e-commerce"
  keyInsights         String?   // JSON Array
  enrichedAt          DateTime? // 2025-01-12T10:00:00Z
}
```

## 🔄 Re-enriquecimento Automático

O sistema re-enriquece automaticamente empresas a cada **7 dias**:

```typescript
const shouldReenrich =
  !company.enrichedAt ||
  (Date.now() - new Date(company.enrichedAt).getTime()) > 7 * 24 * 60 * 60 * 1000

if (shouldReenrich) {
  await this.enrichCompanyWithAI(company.id, company.name, ...)
}
```

**Por quê?**
- Notícias são atualizadas constantemente
- Eventos futuros podem ser anunciados
- Redes sociais crescem
- Mantém dados sempre frescos

## 💡 Exemplo de Uso

### Input: Nova Vaga Scraped
```json
{
  "jobTitle": "Controller",
  "companyName": "Magazine Luiza",
  "jobUrl": "https://linkedin.com/jobs/123"
}
```

### Processamento

1. **Lead Orchestrator** recebe a vaga
2. Normaliza nome: `"magazine luiza"`
3. Busca no banco: não encontrado
4. **Cria nova empresa**:
   - CNPJ: `47.960.950/0001-21` (Brasil API)
   - Revenue: `R$ 35.600.000.000` (Receita Federal)
   - Employees: `15.000` (Receita Federal)
5. **Enriquece com IA**:
   ```json
   {
     "estimatedRevenue": "R$ 30B - R$ 40B",
     "estimatedEmployees": "10.000-20.000",
     "recentNews": [
       {
         "title": "Magalu anuncia parceria com Microsoft para IA",
         "date": "2025-01-10",
         "source": "Exame"
       }
     ],
     "upcomingEvents": [
       {
         "name": "NRF 2025",
         "date": "2025-03-15",
         "type": "feira"
       }
     ],
     "socialMedia": {
       "instagram": {
         "handle": "@magazineluiza",
         "followers": "12M"
       }
     },
     "industryPosition": "Líder em e-commerce no Brasil",
     "keyInsights": [
       "Forte presença omnichannel",
       "Investindo pesado em IA e marketplace",
       "Desafios com rentabilidade após expansão"
     ]
   }
   ```

### Output: Empresa Completa
```
Magazine Luiza
├─ CNPJ: 47.960.950/0001-21
├─ Revenue: R$ 35.6B
├─ Employees: 15.000
├─ Estimated Revenue: R$ 30B - R$ 40B
├─ Estimated Employees: 10.000-20.000
├─ Instagram: @magazineluiza (12M followers)
├─ Industry Position: Líder em e-commerce no Brasil
├─ Notícias: 3 recentes
├─ Eventos: 1 futuro
└─ Insights: 3 chave
```

## 📈 Benefícios para Prospecção

### 1. Contexto Completo
- Saiba se a empresa está crescendo ou enfrentando desafios
- Identifique oportunidades de abordagem via notícias
- Descubra eventos onde pode encontrar a empresa

### 2. Personalização de Abordagem
- Use insights para adaptar pitch
- Mencione notícias recentes no email
- Conecte com decisores via Instagram/LinkedIn

### 3. Priorização Inteligente
- Empresas com notícias positivas → maior chance de investir
- Empresas em eventos → momento ideal para contato
- Seguidores nas redes → indicador de tamanho/relevância

## 🧪 Testes

### Teste Manual
```bash
# Limpar banco
npx tsx scripts/clear-all-data.ts

# Disparar scraping
curl -X POST http://localhost:3000/api/cron/scrape-leads

# Verificar logs
# Busque por "🤖 [AI Enrichment]" nos logs
```

### Teste de Enriquecimento Isolado
```bash
npx tsx scripts/test-ai-company-enrichment.ts
```

**Nota**: Requer `CLAUDE_API_KEY` configurada no `.env`

## ⚙️ Configuração

### 1. API Key da Anthropic
```bash
# .env
CLAUDE_API_KEY="sk-ant-api03-..."
```

### 2. Prisma Schema
```bash
# Aplicar mudanças no banco
npx prisma db push

# Regenerar Prisma Client
npx prisma generate
```

### 3. Restart do Servidor
```bash
# Para pegar novos campos do Prisma
npm run dev
```

## 🔧 Troubleshooting

### "AI Enrichment não funciona"
1. Verificar se `CLAUDE_API_KEY` está no `.env`
2. Restart do servidor Next.js
3. Verificar logs: `console.log('🤖 [AI Enrichment]')`

### "Empresas duplicadas"
- Sistema normaliza automaticamente
- Se duplicação persistir, verificar função `normalizeCompanyName()`

### "Dados de enriquecimento não aparecem"
1. Verificar se `enrichedAt` está preenchido
2. Verificar campos JSON no banco (Prisma Studio)
3. Parsear JSON para exibir no dashboard

## 📝 Próximos Passos

1. **Dashboard**: Exibir notícias, eventos e insights
2. **Alertas**: Notificar quando empresa tiver notícia relevante
3. **Timeline**: Histórico de notícias e eventos por empresa
4. **Enriquecimento sob demanda**: Botão para re-enriquecer manualmente

---

**Status**: Production-ready (aguardando restart do servidor para ativar)
**Última atualização**: 2025-01-12
**Custo**: ~$0.05/empresa via Claude API (Haiku model)
