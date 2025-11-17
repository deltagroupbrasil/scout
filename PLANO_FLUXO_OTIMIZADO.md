# 🚀 Plano de Implementação - Fluxo Otimizado LeapScout

**Data**: 2025-01-14
**Status**: 📋 **AGUARDANDO APROVAÇÃO**

---

## 🎯 Visão Geral

Este documento detalha o plano de implementação para o **fluxo otimizado de enriquecimento de leads**, baseado na análise técnica completa do projeto LeapScout.

### Fluxo Proposto (Validado)

```
1. Busca da Vaga (LinkedIn, Indeed, GlassDoor, Catho, Gupy, etc)
   [BrightData Unlocker, SERP, Browser API]
   ↓
2. Encontra Site da Empresa
   [Claude API - já implementado]
   ↓
3. Encontra Redes Sociais (LinkedIn, Instagram, X, Facebook)
   [Scraper identifica no site + Google Search]
   ↓
4. Encontra Decisores LinkedIn
   [BrightData Scraper - já existe, precisa integrar]
   ↓
5. Encontra CNPJ da Empresa
   [Sistema atual de validação - já implementado]
   ↓
6. Encontra Notícias sobre a Empresa
   [Claude API - já implementado]
   ↓
7. Consulta a Empresa por CNPJ
   [API Congonhas/Nova Vida TI - NOVO]
   ↓
8. Consulta CPF dos Sócios
   [API Congonhas - NOVO]
   ↓
9. Guarda Telefones e E-mails de Cada Sócio
   [API Congonhas - NOVO]
```

---

## 📊 Status Atual vs Proposto

| Etapa | Status Atual | O Que Falta | Esforço |
|-------|-------------|-------------|---------|
| **1. Busca da Vaga** | ✅ 100% | Nada (multi-source implementado) | - |
| **2. Site da Empresa** | ✅ 100% | Nada (Claude AI já encontra) | - |
| **3. Redes Sociais** | ⚠️ 30% | Validação ativa dos handles | 2-3 dias |
| **4. Decisores LinkedIn** | ⚠️ 50% | Integrar scraper no orchestrator | 1 dia |
| **5. CNPJ** | ✅ 100% | Nada (sistema robusto implementado) | - |
| **6. Notícias** | ✅ 100% | Nada (Claude AI já busca) | - |
| **7. Consulta CNPJ** | ❌ 0% | Integração API Congonhas/OpenCNPJ | 3-4 dias |
| **8. CPF Sócios** | ❌ 0% | Integração API Congonhas | 2 dias |
| **9. Contatos Sócios** | ❌ 0% | Armazenamento e validação | 1-2 dias |

**Total Implementado**: 70%
**Total Faltante**: 30% (9-12 dias de desenvolvimento)

---

## 🔍 Análise de Gaps Críticos

### Gap #1: Redes Sociais - Validação Ativa (Etapa 3)

**Status Atual**:
- ✅ Claude AI estima handles (Instagram, LinkedIn, Twitter)
- ❌ Não valida se os handles estão corretos
- ❌ Não busca handles via scraping ativo

**O Que Implementar**:
```typescript
// lib/services/social-media-validator.ts
class SocialMediaValidator {
  async validateInstagram(handle: string): Promise<boolean>
  async validateTwitter(handle: string): Promise<boolean>
  async validateFacebook(handle: string): Promise<boolean>
  async scrapeSocialHandles(companyWebsite: string): Promise<SocialHandles>
}
```

**Estratégias**:
1. **Google Search**: `"site:instagram.com ${companyName}"`
2. **Website Scraping**: Buscar links de redes sociais no footer/header
3. **Bright Data Validation**: Acessar perfil e confirmar que existe

**Custo Estimado**:
- Bright Data Web Unlocker: ~$0.001-0.003 por validação
- 3 redes × 20 empresas/dia = 60 validações/dia = ~$0.18/dia

---

### Gap #2: Decisores LinkedIn - Integração (Etapa 4)

**Status Atual**:
- ✅ Serviço `linkedin-people-scraper.ts` já existe
- ✅ Scraper funcional (testado com PagBank)
- ❌ **NÃO está integrado** no `lead-orchestrator.ts`

**O Que Implementar**:

```typescript
// lib/services/lead-orchestrator.ts

// ANTES (linha ~350)
const apolloContacts = await apolloEnrichment.findFinancialDecisionMakers(...)

// DEPOIS (estratégia waterfall)
let enrichedContacts: SuggestedContact[] = []

// 1️⃣ Prioridade 1: Apollo.io (dados verificados)
const apolloContacts = await apolloEnrichment.findFinancialDecisionMakers(...)
if (apolloContacts.length >= 2) {
  enrichedContacts = apolloContacts.map(c => ({ ...c, source: 'apollo' }))
} else {
  // 2️⃣ Prioridade 2: LinkedIn Scraper (perfis reais)
  const linkedinPeople = await linkedinPeopleScraper.findDecisionMakers(
    company.name,
    company.linkedinUrl
  )
  enrichedContacts = [...apolloContacts, ...linkedinPeople]
}

// 3️⃣ Fallback: Google + Website (já implementado)
if (enrichedContacts.length < 2) {
  const googlePeople = await googlePeopleFinder.findRealPeople(...)
  enrichedContacts = [...enrichedContacts, ...googlePeople]
}

// 4️⃣ Último recurso: Contatos estimados (IA)
if (enrichedContacts.length === 0) {
  enrichedContacts = this.generateEstimatedContacts(...)
}
```

**Custo Estimado**:
- LinkedIn Scraper via Bright Data: ~$0.005 por perfil
- 3 decisores × 20 empresas = 60 perfis/dia = ~$0.30/dia

**Benefício**:
- Taxa de sucesso aumenta de 60-90% para **85-95%**
- Dados mais atualizados que Google Search

---

### Gap #3: API Congonhas/Nova Vida TI (Etapas 7-9)

**Status Atual**:
- ✅ Brasil API fornece: razão social, CNAE, porte, capital social
- ❌ Não fornece: telefones, emails, CPF sócios, dados atualizados

**Decisão Arquitetural Necessária**:

| Opção | Vantagens | Desvantagens | Custo |
|-------|-----------|--------------|-------|
| **OpenCNPJ** (Receita Federal) | ✅ Grátis<br>✅ Dados oficiais<br>✅ API pública | ❌ CPF mascarado (privacidade)<br>❌ Sem contatos diretos<br>❌ Rate limits | Grátis |
| **Nova Vida TI (API Congonhas)** | ✅ Telefones verificados<br>✅ Emails corporativos<br>✅ CPF completo<br>✅ 1600+ fontes | ❌ Pago (preço sob consulta)<br>⚠️ LGPD: CPF sem consentimento | Sob consulta |

**Recomendação**:

```
Estratégia Híbrida:
1. Brasil API (atual) → Dados básicos da empresa
2. OpenCNPJ → Lista de sócios (nome + CPF mascarado)
3. LinkedIn Scraper → Contatos dos sócios via perfil profissional
4. (Opcional) Nova Vida TI → Validação de telefones/emails
```

**Implementação OpenCNPJ**:

```typescript
// lib/services/opencnpj-enrichment.ts
class OpenCNPJService {
  async getCompanyData(cnpj: string): Promise<{
    razaoSocial: string
    nomeFantasia: string
    socios: Array<{
      nome: string
      cpfMasked: string  // XXX.XXX.XXX-**
      qualificacao: string  // Administrador, Sócio, etc
    }>
    email?: string
    telefone?: string
  }>
}
```

**Implementação Nova Vida TI** (APROVADO):

```typescript
// lib/services/novavidati-enrichment.ts
class NovaVidaTIService {
  async enrichCompanyContacts(cnpj: string): Promise<{
    phones: string[]
    emails: string[]
    partners: Array<{
      name: string
      cpf: string  // Usado apenas para enriquecer dados
      phones: string[]
      emails: string[]
      role: string
    }>
  }>
}
```

**Custo Real Nova Vida TI**: ✅ **R$ 0.06 por consulta**
- 20 consultas/dia = R$ 1.20/dia = **R$ 36/mês**
- 100 consultas/dia = R$ 6/dia = **R$ 180/mês**
- **Custo extremamente baixo** comparado à estimativa inicial (era R$ 300-1200/mês)

**⚠️ Atenção LGPD**:
- Armazenar CPF de sócios sem consentimento explícito **pode violar LGPD Art. 7º**
- **Recomendação**:
  - Não armazenar CPF completo no banco
  - Usar CPF apenas para buscar LinkedIn/contato profissional
  - Armazenar apenas dados profissionais públicos (nome, cargo, LinkedIn)

---

## 🏗️ Plano de Implementação - 5 Fases

### 📦 Fase 1: Social Media Validation (2-3 dias)

**Objetivo**: Validar e complementar handles de redes sociais sugeridos pela IA

**Tarefas**:
1. ✅ Criar `lib/services/social-media-validator.ts`
2. ✅ Implementar validação Instagram (Bright Data Web Unlocker)
3. ✅ Implementar validação Twitter/X
4. ✅ Implementar validação Facebook
5. ✅ Adicionar scraping de handles no website da empresa
6. ✅ Integrar no `lead-orchestrator.ts` após etapa de AI enrichment
7. ✅ Adicionar cache para evitar validações duplicadas
8. ✅ Criar badge visual "✅ Verificado" vs "~ Estimado"

**Schema Changes**:
```prisma
model Company {
  // ...existing fields
  instagramVerified Boolean @default(false)
  twitterVerified   Boolean @default(false)
  facebookVerified  Boolean @default(false)
}
```

**Entregáveis**:
- Serviço de validação funcional
- Dashboard mostra badges de verificação
- Taxa de acurácia de handles aumenta de ~60% para ~90%

---

### 📦 Fase 2: LinkedIn Scraper Integration (1 dia)

**Objetivo**: Integrar scraper de decisores LinkedIn no pipeline principal

**Tarefas**:
1. ✅ Modificar `lead-orchestrator.ts` (método `processCompanyWithMultipleJobs`)
2. ✅ Implementar estratégia waterfall: Apollo → LinkedIn → Google → Estimated
3. ✅ Adicionar source tracking: `'linkedin'` como novo tipo
4. ✅ Criar badge específico para contatos LinkedIn: "🔗 LinkedIn"
5. ✅ Adicionar rate limiting (delay 3s entre scrapes)
6. ✅ Criar script de teste: `scripts/test-linkedin-integration.ts`

**Schema Changes**:
```typescript
// types/index.ts
export interface SuggestedContact {
  // ...existing fields
  source?: 'apollo' | 'linkedin' | 'google' | 'website' | 'estimated'
}
```

**Entregáveis**:
- Pipeline usa LinkedIn Scraper como estratégia prioritária #2
- Dashboard mostra origem de cada contato
- Taxa de sucesso de contatos reais aumenta para 85-95%

---

### 📦 Fase 3: OpenCNPJ Integration (3-4 dias)

**Objetivo**: Complementar Brasil API com dados de sócios da Receita Federal

**Tarefas**:
1. ✅ Criar `lib/services/opencnpj-enrichment.ts`
2. ✅ Implementar busca de dados oficiais via ReceitaWS ou OpenCNPJ
3. ✅ Adicionar campo `partners` no model Company (JSON)
4. ✅ Buscar LinkedIn dos sócios via nome + empresa
5. ✅ Armazenar: nome, cargo (qualificação), LinkedIn, email profissional
6. ✅ **NÃO armazenar CPF completo** (compliance LGPD)
7. ✅ Criar UI para exibir sócios no dashboard
8. ✅ Adicionar na página de detalhes do lead

**Schema Changes**:
```prisma
model Company {
  // ...existing fields
  partners String? // JSON: Array<{name, role, linkedin, email}>
  partnersLastUpdate DateTime?
}
```

**API Endpoints**:
- ReceitaWS: `https://www.receitaws.com.br/v1/cnpj/{cnpj}`
- OpenCNPJ: Múltiplos endpoints com dados oficiais

**Entregáveis**:
- Dados de sócios disponíveis no dashboard
- Possibilidade de abordagem multi-stakeholder
- Compliance total com LGPD

---

### 📦 Fase 4: Event Detection from Social Media (3-4 dias)

**Objetivo**: Identificar participação em eventos via posts nas redes sociais

**Tarefas**:
1. ✅ Criar `lib/services/events-detector.ts`
2. ✅ Scraper posts recentes (últimos 30 dias):
   - Instagram: Via Bright Data (feed da empresa)
   - LinkedIn: Via Bright Data (company updates)
   - Twitter/X: Via Bright Data
3. ✅ Análise de posts com Claude AI:
   - Detectar menções a eventos (NeurIPS, Web Summit, ExpoGestão)
   - Classificar tipo: expositor, palestrante, participante, patrocinador
   - Extrair data e localização do evento
4. ✅ Adicionar campo `detectedEvents` no Company
5. ✅ Exibir eventos no dashboard com badge especial
6. ✅ Adicionar trigger: "Empresa participando de evento X em Y dias"

**Schema Changes**:
```prisma
model Company {
  // ...existing fields
  detectedEvents String? // JSON: Array<{name, date, type, source, postUrl}>
}
```

**Exemplo de Output**:
```json
{
  "detectedEvents": [
    {
      "name": "Web Summit 2025",
      "date": "2025-03-15",
      "type": "expositor",
      "source": "instagram",
      "postUrl": "https://instagram.com/p/abc123",
      "confidence": "high"
    }
  ]
}
```

**Entregáveis**:
- Sistema detecta eventos automaticamente
- Dashboard exibe próximos eventos da empresa
- Trigger de abordagem: "Ideal abordar antes/durante evento X"

---

### 📦 Fase 5: User Feedback System (2-3 dias)

**Objetivo**: Sistema de validação manual de contatos pelo usuário

**Tarefas**:
1. ✅ Criar model `ContactFeedback` no Prisma
2. ✅ Criar `lib/services/feedback-validator.ts`
3. ✅ Adicionar botões ✅/❌ ao lado de cada contato no dashboard
4. ✅ Criar endpoint `/api/feedback` (POST)
5. ✅ Criar página `/dashboard/feedback-metrics`:
   - Taxa de acurácia por fonte (Apollo, LinkedIn, Google, etc)
   - Contatos mais reportados como incorretos
   - Sugestões de melhoria
6. ✅ Implementar auto-correção: Se 3+ usuários marcam incorreto → desabilita

**Schema Changes**:
```prisma
model ContactFeedback {
  id          String   @id @default(uuid())
  leadId      String
  contactName String
  contactEmail String?
  isCorrect   Boolean  // true = ✅, false = ❌
  userId      String
  createdAt   DateTime @default(now())

  lead Lead @relation(fields: [leadId], references: [id])
  user User @relation(fields: [userId], references: [id])
}
```

**UI Mockup**:
```
┌─────────────────────────────────────────┐
│ 👤 João Silva                           │
│ CFO                                     │
│ 📧 joao.silva@empresa.com               │
│ 🔗 LinkedIn                             │
│                                         │
│ [✅ Correto]  [❌ Incorreto]            │
└─────────────────────────────────────────┘
```

**Entregáveis**:
- Sistema de feedback funcional
- Métricas de qualidade por fonte
- Melhoria contínua do sistema

---

## 💰 Análise de Custos

### Custos Atuais (já implementados)

| Serviço | Custo Mensal | Uso |
|---------|--------------|-----|
| **Apollo.io** | Grátis | 50 unlocks/mês |
| **Claude AI (Haiku)** | ~R$ 150 | 20 empresas/dia × R$ 0.25 |
| **Bright Data (atual)** | ~R$ 100 | 60 requests/dia × R$ 0.005 |
| **Brasil API** | Grátis | Ilimitado |
| **Total Atual** | **~R$ 250/mês** | - |

### Custos Novos (após implementação)

| Serviço | Custo Mensal | Uso |
|---------|--------------|-----|
| **Social Media Validation** | ~R$ 50 | 60 validações/dia |
| **LinkedIn Scraper** | ~R$ 90 | 60 perfis/dia |
| **OpenCNPJ** | Grátis | Ilimitado |
| **Event Detection** | ~R$ 40 | 20 análises/dia |
| **Nova Vida TI** ✅ | **R$ 36** | 20 consultas/dia × R$ 0.06 |
| **Total Novo** | **~R$ 216/mês** | - |

### Custo Total Projetado ✅

- **Total com TODAS as features**: R$ 250 + R$ 216 = **R$ 466/mês**
- **Custo por lead enriquecido**: R$ 466 ÷ 600 leads/mês = **R$ 0.78/lead**

**ROI Estimado**:
- Custo por lead enriquecido: **R$ 0.78/lead**
- Taxa de conversão esperada: 5-10%
- Valor médio de contrato: R$ 50.000
- ROI: 1 conversão/mês = **10700% de retorno** (R$ 50k ÷ R$ 466)

---

## 📈 Melhorias de Performance Esperadas

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Taxa de Contatos Reais** | 60-90% | 85-95% | +15-25% |
| **Acurácia de Redes Sociais** | ~60% | ~90% | +50% |
| **Detecção de Eventos** | 0% | 40-60% | ∞ |
| **Dados de Sócios** | 0% | 100% | ∞ |
| **Feedback de Qualidade** | Não existe | Ativo | ∞ |
| **Telefones Corporativos** | 0% | 80-95% | ∞ |
| **Emails de Sócios** | 0% | 80-95% | ∞ |

*Nova Vida TI aprovado (R$ 0.06/consulta) - dados altamente precisos.

---

## ⚠️ Riscos e Mitigações

### Risco #1: LGPD - Armazenamento de CPF
**Problema**: Armazenar CPF de sócios sem consentimento pode violar LGPD Art. 7º

**Mitigação**:
- ✅ **NÃO armazenar CPF completo** no banco
- ✅ Usar CPF apenas para buscar dados profissionais públicos (LinkedIn)
- ✅ Armazenar apenas: nome, cargo, email corporativo, LinkedIn
- ✅ Base legal: LGPD Art. 7º, X (legítimo interesse em dados públicos)

### Risco #2: Rate Limiting - Bright Data
**Problema**: Scraping intensivo pode atingir limites (15k req/min)

**Mitigação**:
- ✅ Delays entre requisições (3s)
- ✅ Cache de resultados (evitar scraping duplicado)
- ✅ Priorização: scraping apenas se Apollo falhar
- ✅ Monitoramento de quotas via dashboard

### Risco #3: Custo Variável - Nova Vida TI ✅ RESOLVIDO
**Custo Confirmado**: R$ 0.06 por consulta (extremamente baixo)

**Controle de Custos**:
- ✅ Monitorar custos em tempo real via dashboard
- ✅ Definir limite diário de consultas (padrão: 20/dia = R$ 36/mês)
- ✅ Possibilidade de aumentar para 100/dia (R$ 180/mês) se ROI justificar
- ✅ Cache de resultados para evitar consultas duplicadas

### Risco #4: Qualidade de Dados - Social Media
**Problema**: Handles estimados pela IA podem estar incorretos

**Mitigação**:
- ✅ Validação ativa via Bright Data
- ✅ Badges "✅ Verificado" vs "~ Estimado"
- ✅ Sistema de feedback do usuário
- ✅ Auto-correção baseada em feedbacks

---

## ✅ Decisões Aprovadas

### 1. **Nova Vida TI**: ✅ APROVADO

**Decisão**: Implementar Nova Vida TI (API Congonhas)
- ✅ Custo real: **R$ 0.06/consulta** (muito inferior à estimativa)
- ✅ Dados completos: telefones, emails, CPF dos sócios
- ✅ Estratégia híbrida:
  - OpenCNPJ para dados oficiais básicos
  - Nova Vida TI para enriquecimento de contatos
  - LinkedIn Scraper como validação adicional

**Justificativa**: Com custo de apenas R$ 36-180/mês, o ROI é extremamente positivo.

---

### 2. **Social Media Scraping**: ✅ Bright Data (já configurado)

**Decisão**: Usar Bright Data Web Unlocker
- ✅ Já está configurado e testado
- ✅ Infraestrutura unificada (menos complexidade)
- ✅ Custo ~R$ 0.003/request é aceitável

---

### 3. **Ordem de Implementação**: ✅ Priorizar Alto Impacto

**Decisão**: Implementar na ordem de maior ROI
1. **Fase 2** - LinkedIn Scraper Integration (+25% contatos reais)
2. **Fase 3** - Nova Vida TI + OpenCNPJ (dados completos de sócios)
3. **Fase 5** - User Feedback System (melhoria contínua)
4. **Fase 1** - Social Media Validation (refinamento)
5. **Fase 4** - Event Detection (diferencial competitivo)

---

## 📅 Cronograma Aprovado (2 semanas)

### Semana 1: High-Impact Features (Core)
- **Dia 1**: Fase 2 - LinkedIn Scraper Integration
- **Dia 2-5**: Fase 3 - Nova Vida TI + OpenCNPJ Integration
  - Dia 2-3: OpenCNPJ (dados básicos de sócios)
  - Dia 4-5: Nova Vida TI (telefones, emails, enriquecimento)
- **Dia 6**: Testes integrados + ajustes

### Semana 2: Quality & Engagement Features
- **Dia 7-9**: Fase 5 - User Feedback System
- **Dia 10-11**: Fase 1 - Social Media Validation
- **Dia 12-13**: Fase 4 - Event Detection
- **Dia 14**: Deploy final + documentação completa

---

## ✅ Aprovações Confirmadas

- ✅ **Fluxo otimizado validado** (9 etapas, 70% já implementado)
- ✅ **Nova Vida TI aprovado** (R$ 0.06/consulta)
- ✅ **Ordem de implementação** (Fase 2 → 3 → 5 → 1 → 4)
- ✅ **Budget aprovado** (R$ 466/mês total)
- ✅ **Estratégia LGPD** (armazenar dados profissionais públicos)
- ✅ **Social Media scraping** (Bright Data Web Unlocker)
- ✅ **Cronograma** (2 semanas, 14 dias úteis)

---

## 🚀 Status de Execução

**AGUARDANDO CONFIRMAÇÃO FINAL PARA INICIAR IMPLEMENTAÇÃO**

**Próximo passo imediato**:
- Iniciar **Fase 2: LinkedIn Scraper Integration** (Dia 1)
- Impacto: +25% taxa de contatos reais
- Esforço: 1 dia
- Código já existe, apenas integrar ao orchestrator

**Arquivos que serão modificados**:
1. `lib/services/lead-orchestrator.ts` (adicionar waterfall strategy)
2. `types/index.ts` (adicionar source: 'linkedin')
3. `components/dashboard/contact-source-badge.tsx` (adicionar badge LinkedIn)
4. `app/(dashboard)/dashboard/leads/[id]/page.tsx` (exibir badge)

---

**Preparado por**: Claude Code
**Data**: 2025-01-14
**Versão**: 2.0 (Atualizado com custo real Nova Vida TI)
**Status**: ✅ **PRONTO PARA EXECUÇÃO**
