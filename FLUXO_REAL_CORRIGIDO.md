# 🔄 FLUXO REAL DO LEAPSCOUT - ARQUITETURA CORRETA

**Versão:** 2.0 (Corrigida)
**Data:** 2025-01-14

---

## 🎯 STACK TECNOLÓGICA REAL

### **APIs e Serviços Utilizados:**
- ✅ **Bright Data** (Web Unlocker, SERP API, Browser API)
- ✅ **API Congonhas** (Consultas de CNPJ e CPF de sócios)
- ✅ **Claude API** (IA para descoberta e análise)
- ❌ **Apollo.io** - NÃO SERÁ USADO

---

## 🔄 FLUXO COMPLETO PASSO A PASSO

```
┌─────────────────────────────────────────────────┐
│ 1. BUSCA DE VAGAS                               │
│    Multi-source: LinkedIn, Indeed, Glassdoor,   │
│    Catho, Gupy, etc                             │
│    [Bright Data: Unlocker + SERP + Browser]     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. ENCONTRA WEBSITE DA EMPRESA                  │
│    [Claude API com web search]                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. ENCONTRA REDES SOCIAIS                       │
│    LinkedIn, Instagram, X, Facebook              │
│    [Scraper identifica no site + Google]        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4. ENCONTRA DECISORES NO LINKEDIN               │
│    [Bright Data Scraper - LinkedIn People]      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 5. ENCONTRA CNPJ DA EMPRESA                     │
│    [Google Scraper via Bright Data]             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 6. ENCONTRA NOTÍCIAS SOBRE A EMPRESA           │
│    [Claude API com web search]                  │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 7. CONSULTA EMPRESA POR CNPJ                    │
│    [API Congonhas - Dados oficiais]             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 8. CONSULTA CPF DOS SÓCIOS                      │
│    [API Congonhas - Dados dos sócios]           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 9. GUARDA TELEFONES E EMAILS DOS SÓCIOS         │
│    [API Congonhas - Contatos]                   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 10. SALVA NO BANCO + EXIBE NO DASHBOARD        │
└─────────────────────────────────────────────────┘
```

---

## 📍 PASSO 1: BUSCA DE VAGAS (MULTI-SOURCE)

### **Fontes de Vagas:**
1. **LinkedIn** via Bright Data Browser API
2. **Indeed** via Bright Data Web Unlocker
3. **Glassdoor** via Bright Data Web Unlocker
4. **Catho** via Bright Data Web Unlocker
5. **Gupy** via Bright Data Web Unlocker
6. **Outras** via Bright Data SERP API (busca no Google)

### **Como funciona:**

```typescript
// 1. LinkedIn (Browser API - JavaScript completo)
const linkedInJobs = await brightDataBrowser.scrape({
  url: 'https://linkedin.com/jobs/search/?keywords=CFO+São+Paulo',
  extractors: {
    jobs: {
      selector: '.job-card',
      fields: {
        title: '.job-title',
        company: '.company-name',
        description: '.job-description',
        url: 'a[href]',
        postedDate: '.posted-date',
        candidates: '.applicant-count'
      }
    }
  }
})

// 2. Indeed (Web Unlocker - HTML estático)
const indeedHtml = await brightDataUnlocker.fetch('https://indeed.com.br/jobs?q=CFO+São+Paulo')
const indeedJobs = parseIndeedHtml(indeedHtml)

// 3. Glassdoor (Web Unlocker)
const glassdoorHtml = await brightDataUnlocker.fetch('https://glassdoor.com.br/...')
const glassdoorJobs = parseGlassdoorHtml(glassdoorHtml)

// 4. Catho (Web Unlocker)
const cathoHtml = await brightDataUnlocker.fetch('https://catho.com.br/vagas/...')
const cathoJobs = parseCathoHtml(cathoHtml)

// 5. Gupy (Web Unlocker)
const gupyHtml = await brightDataUnlocker.fetch('https://portal.gupy.io/...')
const gupyJobs = parseGupyHtml(gupyHtml)

// Consolidar todas as vagas
const allJobs = [
  ...linkedInJobs,
  ...indeedJobs,
  ...glassdoorJobs,
  ...cathoJobs,
  ...gupyJobs
]
```

### **Output:**
```javascript
[
  {
    title: "CFO - Chief Financial Officer",
    company: "Nubank",
    description: "Buscamos CFO para...",
    url: "https://linkedin.com/jobs/view/123",
    source: "LinkedIn",
    postedDate: "2025-01-10",
    candidates: 47
  },
  {
    title: "Controller Pleno",
    company: "Magazine Luiza",
    url: "https://gupy.io/jobs/456",
    source: "Gupy",
    postedDate: "2025-01-12"
  }
]
```

---

## 📍 PASSO 2: ENCONTRAR WEBSITE DA EMPRESA

### **Como funciona (Claude API com Web Search):**

```typescript
const prompt = `Você é um especialista em busca de informações empresariais.

Empresa: "${companyName}"

Use web search para encontrar o website oficial da empresa.

Retorne JSON:
{
  "website": "https://...",
  "confidence": "high|medium|low",
  "reasoning": "..."
}

Regras:
- Priorize sites .com.br para empresas brasileiras
- Evite sites de terceiros (LinkedIn, Glassdoor, etc)
- Valide se o domínio faz sentido para o nome da empresa
`

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  messages: [{ role: 'user', content: prompt }],
  tools: [{ type: 'web_search' }]  // ← Web search habilitado
})
```

### **Output:**
```javascript
{
  website: "https://nubank.com.br",
  confidence: "high",
  reasoning: "Domínio oficial da Nubank, validado por múltiplas fontes"
}
```

---

## 📍 PASSO 3: ENCONTRAR REDES SOCIAIS

### **Estratégia Dupla:**

#### **3.1: Scraping do Website (Prioridade 1)**

```typescript
// Bright Data Web Unlocker para buscar HTML do site
const html = await brightDataUnlocker.fetch(websiteUrl)

// Cheerio para parsear
const $ = cheerio.load(html)

// Buscar links de redes sociais
const instagram = $('a[href*="instagram.com/"]').attr('href')
const facebook = $('a[href*="facebook.com/"]').attr('href')
const twitter = $('a[href*="twitter.com/"], a[href*="x.com/"]').attr('href')
const linkedin = $('a[href*="linkedin.com/company/"]').attr('href')

// Extrair handles
const instagramHandle = extractHandle(instagram, 'instagram.com')
// Exemplo: https://instagram.com/nubank → "nubank"
```

#### **3.2: Google Search (Fallback)**

```typescript
// Se não encontrou no website, buscar no Google via Bright Data SERP
const query = `"${companyName}" site:instagram.com OR site:facebook.com OR site:twitter.com OR site:linkedin.com`

const serpResults = await brightDataSERP.search(query)

// Parsear resultados e extrair handles
const socialMedia = parseSocialMediaFromSERP(serpResults)
```

### **Output:**
```javascript
{
  instagram: { handle: "nubank", verified: true },  // ✓ Encontrado no site
  facebook: { handle: "nubank", verified: true },   // ✓ Encontrado no site
  twitter: { handle: "nubank", verified: false },   // Encontrado no Google
  linkedin: { handle: "nubank", verified: true }    // ✓ Encontrado no site
}
```

**Flag `verified: true`** = Encontrado NO WEBSITE OFICIAL da empresa

---

## 📍 PASSO 4: ENCONTRAR DECISORES NO LINKEDIN

### **Como funciona (Bright Data Scraper - LinkedIn People):**

```typescript
const decisores = await brightDataBrowser.scrape({
  url: `https://linkedin.com/search/results/people/?keywords=CFO+at+${companyName}`,
  extractors: {
    people: {
      selector: '.entity-result',
      fields: {
        name: '.entity-result__title-text',
        role: '.entity-result__primary-subtitle',
        profileUrl: 'a.app-aware-link[href]',
        profilePicture: 'img.presence-entity__image'
      }
    }
  }
})

// Também buscar: Controller, Finance Director, VP Finance
const cargos = ['CFO', 'Controller', 'Finance Director', 'VP Finance', 'Diretor Financeiro']

const allDecisores = []
for (const cargo of cargos) {
  const results = await brightDataBrowser.scrape({
    url: `https://linkedin.com/search/results/people/?keywords=${cargo}+at+${companyName}`
  })
  allDecisores.push(...results)
}
```

### **Output:**
```javascript
[
  {
    name: "João Silva",
    role: "CFO at Nubank",
    linkedin: "https://linkedin.com/in/joaosilva",
    profilePicture: "https://...",
    source: "linkedin_scraper"
  },
  {
    name: "Maria Santos",
    role: "Controller at Nubank",
    linkedin: "https://linkedin.com/in/mariasantos",
    source: "linkedin_scraper"
  }
]
```

**IMPORTANTE:** Bright Data LinkedIn Scraper **NÃO revela** email/telefone direto. Esses dados virão da API Congonhas (via CPF dos sócios).

---

## 📍 PASSO 5: ENCONTRAR CNPJ DA EMPRESA

### **Estratégia em Cascata:**

#### **5.1: Scraping do Website (Prioridade 1)**

```typescript
// Já feito no Passo 3 (Website Intelligence)
const cnpjFromWebsite = websiteIntelligence.cnpj
// Exemplo: "18.236.120/0001-58"

if (cnpjFromWebsite) {
  return cnpjFromWebsite.replace(/\D/g, '')  // Remove formatação
}
```

#### **5.2: Google Search (Prioridade 2)**

```typescript
// Buscar via Bright Data SERP
const query = `CNPJ "${companyName}"`

const serpHtml = await brightDataSERP.search(query)

// Regex para encontrar CNPJ no HTML
const cnpjRegex = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g
const matches = serpHtml.match(cnpjRegex)

if (matches && matches.length > 0) {
  return matches[0].replace(/\D/g, '')
}
```

#### **5.3: Database Local (Prioridade 3)**

```typescript
// Fallback: database de CNPJs conhecidos
const KNOWN_CNPJS = {
  'Nubank': '18236120000158',
  'Magazine Luiza': '47960950000121',
  'PagBank': '33172537000108',
  // ... 30+ empresas
}

return KNOWN_CNPJS[companyName] || null
```

### **Output:**
```javascript
{
  cnpj: "18236120000158",  // Apenas números
  source: "website" | "google" | "database"
}
```

---

## 📍 PASSO 6: ENCONTRAR NOTÍCIAS SOBRE A EMPRESA

### **Como funciona (Claude API com Web Search):**

```typescript
const prompt = `Você é um analista de inteligência de mercado.

Empresa: "${companyName}"
Setor: "${sector}"

Use web search para encontrar:
1. Notícias recentes (últimos 30 dias)
2. Eventos futuros (próximos 90 dias)
3. Mudanças de liderança
4. Rodadas de investimento
5. Expansões/novos produtos

Retorne JSON:
{
  "recentNews": [
    {
      "title": "...",
      "date": "2025-01-10",
      "url": "https://...",
      "type": "funding|leadership_change|award|expansion|news",
      "sentiment": "positive|neutral|negative"
    }
  ],
  "upcomingEvents": [...]
}

Categorize por tipo e relevância.
`

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  messages: [{ role: 'user', content: prompt }],
  tools: [{ type: 'web_search' }]
})
```

### **Output:**
```javascript
{
  recentNews: [
    {
      title: "Nubank anuncia rodada Series G de R$ 500M",
      date: "2025-01-08",
      url: "https://valor.globo.com/...",
      type: "funding",
      sentiment: "positive"
    },
    {
      title: "Novo CFO assume comando financeiro",
      date: "2025-01-05",
      url: "https://exame.com/...",
      type: "leadership_change",
      sentiment: "neutral"
    }
  ],
  upcomingEvents: []
}
```

**Gatilhos automáticos gerados:**
- "Rodada de investimento recente: empresa em crescimento"
- "Nova liderança financeira: momento ideal para contato"

---

## 📍 PASSO 7: CONSULTA EMPRESA POR CNPJ (API CONGONHAS)

### **Como funciona:**

```typescript
const response = await fetch('https://api.congonhas.com.br/v1/cnpj/{cnpj}', {
  headers: {
    'Authorization': `Bearer ${API_CONGONHAS_KEY}`
  }
})

const data = await response.json()
```

### **Dados retornados:**
```javascript
{
  cnpj: "18236120000158",
  razaoSocial: "Nu Pagamentos S.A.",
  nomeFantasia: "Nubank",
  capitalSocial: 500000000.00,
  porte: "DEMAIS",  // ME, EPP, DEMAIS
  situacaoCadastral: "ATIVA",
  dataAbertura: "2013-05-06",
  naturezaJuridica: "Sociedade Empresária Limitada",
  cnae: "6499-9/99",  // Atividade Econômica
  endereco: {
    logradouro: "Rua Capote Valente",
    numero: "39",
    complemento: "7º andar",
    bairro: "Pinheiros",
    municipio: "São Paulo",
    uf: "SP",
    cep: "05409000"
  },
  telefone: "(11) 3004-8000",
  email: "contato@nubank.com.br",
  socios: [
    {
      nome: "DAVID VELEZ OSOMO",
      qualificacao: "Diretor",
      cpf: "***.***.123-**",  // Parcialmente mascarado
      dataEntrada: "2013-05-06"
    }
  ]
}
```

**Custo:** Verificar com API Congonhas (provavelmente pago)

---

## 📍 PASSO 8: CONSULTA CPF DOS SÓCIOS (API CONGONHAS)

### **Como funciona:**

Para cada sócio encontrado no PASSO 7:

```typescript
const socios = empresaData.socios

for (const socio of socios) {
  // API Congonhas aceita CPF parcialmente mascarado
  const cpfCompleto = await apiCongonhas.revelarCPF(socio.cpf)

  // OU busca direta por nome + empresa
  const dadosSocio = await fetch(`https://api.congonhas.com.br/v1/socios/{cpf}`, {
    headers: { 'Authorization': `Bearer ${API_CONGONHAS_KEY}` }
  })
}
```

### **Dados retornados:**
```javascript
{
  cpf: "12345678901",  // CPF completo (DESMASCARADO)
  nome: "DAVID VELEZ OSOMO",
  dataNascimento: "1981-04-12",
  empresasVinculadas: [
    {
      cnpj: "18236120000158",
      razaoSocial: "Nu Pagamentos S.A.",
      qualificacao: "Diretor"
    }
  ]
}
```

---

## 📍 PASSO 9: BUSCAR TELEFONES E EMAILS DOS SÓCIOS (API CONGONHAS)

### **Como funciona:**

```typescript
// Para cada CPF de sócio, buscar contatos
const contatosSocio = await fetch(`https://api.congonhas.com.br/v1/contatos/{cpf}`, {
  headers: { 'Authorization': `Bearer ${API_CONGONHAS_KEY}` }
})
```

### **Dados retornados:**
```javascript
{
  cpf: "12345678901",
  nome: "DAVID VELEZ OSOMO",
  telefones: [
    {
      numero: "11999998888",
      tipo: "celular",
      operadora: "Vivo",
      ativo: true
    },
    {
      numero: "1130048000",
      tipo: "fixo",
      ativo: true
    }
  ],
  emails: [
    {
      email: "david@nubank.com.br",
      tipo: "corporativo",
      verificado: true
    },
    {
      email: "david.velez@gmail.com",
      tipo: "pessoal",
      verificado: false
    }
  ],
  enderecos: [
    {
      logradouro: "Rua Capote Valente",
      numero: "39",
      bairro: "Pinheiros",
      cidade: "São Paulo",
      uf: "SP",
      cep: "05409000"
    }
  ]
}
```

**Custo:** Verificar com API Congonhas (provavelmente por consulta)

---

## 📍 PASSO 10: CONSOLIDAR E SALVAR NO BANCO

### **Estrutura de Dados Final:**

```typescript
// COMPANY
await prisma.company.create({
  data: {
    name: "Nubank",
    cnpj: "18236120000158",

    // Do LinkedIn Company Page
    employees: 5234,
    sector: "Financial Services",
    location: "São Paulo, SP",

    // Do Website Finder
    website: "https://nubank.com.br",

    // Do Website Intelligence (PASSO 3)
    instagramHandle: "nubank",
    instagramVerified: true,  // ✓
    facebookHandle: "nubank",
    facebookVerified: true,
    twitterHandle: "nubank",
    twitterVerified: false,  // Encontrado no Google
    linkedinUrl: "https://linkedin.com/company/nubank",

    // Da API Congonhas (PASSO 7)
    razaoSocial: "Nu Pagamentos S.A.",
    capitalSocial: 500000000.00,
    companyPhones: JSON.stringify(["1130048000"]),
    companyEmails: JSON.stringify(["contato@nubank.com.br"]),

    // Sócios + Contatos (PASSOS 8 e 9)
    partners: JSON.stringify([
      {
        nome: "David Vélez Osomo",
        cpf: "12345678901",
        qualificacao: "Diretor",
        telefones: ["11999998888", "1130048000"],
        emails: ["david@nubank.com.br", "david.velez@gmail.com"],
        linkedin: "https://linkedin.com/in/davidvelez"  // Do scraping
      }
    ]),
    partnersLastUpdate: new Date(),

    // Notícias (PASSO 6)
    recentNews: JSON.stringify([...]),
    upcomingEvents: JSON.stringify([...]),
    eventsDetectedAt: new Date()
  }
})

// LEAD
await prisma.lead.create({
  data: {
    companyId: company.id,

    jobTitle: "CFO - Chief Financial Officer",
    jobDescription: "...",
    jobUrl: "https://linkedin.com/jobs/view/123",
    jobSource: "LinkedIn",
    jobPostedDate: new Date("2025-01-10"),
    candidateCount: 47,

    // Decisores do LinkedIn (PASSO 4)
    suggestedContacts: JSON.stringify([
      {
        name: "João Silva",
        role: "CFO",
        linkedin: "https://linkedin.com/in/joaosilva",
        source: "linkedin_scraper"
      },
      {
        name: "David Vélez Osomo",  // Sócio encontrado via Congonhas
        role: "Diretor",
        email: "david@nubank.com.br",
        phone: "11999998888",
        linkedin: "https://linkedin.com/in/davidvelez",
        source: "congonhas_api"  // Nova fonte!
      }
    ]),

    // Gatilhos (PASSO 6)
    triggers: JSON.stringify([
      "Rodada de investimento recente: empresa em crescimento",
      "Nova liderança financeira: momento ideal para contato",
      "Empresa contratando 3+ vagas na área financeira"
    ]),

    priorityScore: 92,
    status: "NEW",
    isNew: true
  }
})
```

---

## 💰 CUSTOS REAIS (ARQUITETURA CORRIGIDA)

### **Por Lead Processado:**

| Serviço | Operação | Custo Unitário | Total |
|---------|----------|----------------|-------|
| **Bright Data Unlocker** | Fetch website | R$ 0.003 | R$ 0.003 |
| **Bright Data SERP** | Google search (2x) | R$ 0.002 | R$ 0.004 |
| **Bright Data Browser** | LinkedIn people | R$ 0.005 | R$ 0.005 |
| **Claude API** | Website finder | R$ 0.010 | R$ 0.010 |
| **Claude API** | News detection | R$ 0.015 | R$ 0.015 |
| **API Congonhas** | Consulta CNPJ | ? | **R$ 0.XX** |
| **API Congonhas** | Consulta CPF (3 sócios) | ? | **R$ 0.XX** |
| **API Congonhas** | Contatos (3 sócios) | ? | **R$ 0.XX** |
| **TOTAL** | | | **~R$ 0.50 - R$ 2.00** |

**IMPORTANTE:** Verificar custos reais da API Congonhas!

---

## 🎯 PRIORIDADES DE IMPLEMENTAÇÃO

### **JÁ IMPLEMENTADO ✅**
1. ✅ Multi-source scraping (LinkedIn, Indeed, Glassdoor, Catho, Gupy)
2. ✅ Website finder (Claude API)
3. ✅ Website Intelligence (redes sociais do site)
4. ✅ LinkedIn People Scraper (decisores)
5. ✅ CNPJ finder (website + Google + database)
6. ✅ News detection (Claude API)

### **PRECISA CORRIGIR ⚠️**
1. ⚠️ Remover Apollo.io do código
2. ⚠️ Implementar API Congonhas:
   - Consulta CNPJ
   - Consulta CPF de sócios
   - Busca de contatos (telefones/emails)
3. ⚠️ Ajustar orchestrator para seguir ordem correta
4. ⚠️ Atualizar waterfall: remover Apollo, adicionar Congonhas

---

## ✅ RESUMO DA ARQUITETURA REAL

```
VAGAS (Multi-source)
  ↓ [Bright Data: Unlocker, SERP, Browser]
WEBSITE
  ↓ [Claude API]
REDES SOCIAIS
  ↓ [Scraper + Google]
DECISORES LINKEDIN
  ↓ [Bright Data Browser]
CNPJ
  ↓ [Google Scraper]
NOTÍCIAS
  ↓ [Claude API]
DADOS EMPRESA (CNPJ)
  ↓ [API Congonhas]
CPF DOS SÓCIOS
  ↓ [API Congonhas]
TELEFONES/EMAILS
  ↓ [API Congonhas]
SALVA NO BANCO
```

**Sem Apollo.io** ❌
**Com API Congonhas** ✅

---

Vou ajustar o código agora para refletir essa arquitetura!
