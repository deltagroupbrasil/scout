# 📡 LeapScout - API Documentation

## 🔐 Autenticação

Todas as APIs (exceto login) requerem autenticação via NextAuth session.

---

## 📋 Endpoints

### 1. **GET /api/leads**

Lista todos os leads com filtros opcionais.

**Query Parameters:**
```
?status=NEW|CONTACTED|QUALIFIED|DISCARDED|ALL
&search=nome_da_empresa
&dateRange=7d|30d|all
&page=1
&pageSize=20
```

**Response:**
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

---

### 2. **GET /api/leads/[id]**

Retorna detalhes completos de um lead específico.

**Response:**
```json
{
  "id": "uuid",
  "company": {...},
  "jobTitle": "Controller Sênior",
  "suggestedContacts": [...],
  "triggers": [...],
  "notes": [...]
}
```

---

### 3. **PATCH /api/leads/[id]**

Atualiza status ou flag isNew de um lead.

**Body:**
```json
{
  "status": "CONTACTED",
  "isNew": false
}
```

---

### 4. **POST /api/notes**

Cria uma nova nota em um lead.

**Body:**
```json
{
  "leadId": "uuid",
  "content": "Ligação agendada para amanhã"
}
```

---

### 5. **POST /api/scrape** (Manual)

Executa scraping manual de leads.

**Body:**
```json
{
  "query": "Controller OR CFO São Paulo"
}
```

---

### 6. **GET /api/cron/scrape-leads** (Automático)

Endpoint para cron job automático (executado diariamente às 6h).

**Headers:**
```
Authorization: Bearer {CRON_SECRET}
```

**Schedule (Vercel Cron):**
```json
{
  "crons": [{
    "path": "/api/cron/scrape-leads",
    "schedule": "0 6 * * *"
  }]
}
```

---

## 🔧 Configuração das APIs Externas

### 1. **Claude API (Anthropic)**

Para gerar insights com IA:

1. Crie uma conta em https://console.anthropic.com
2. Gere uma API key
3. Adicione ao `.env`:
```env
CLAUDE_API_KEY="sk-ant-api03-..."
```

**Custo estimado:** ~R$ 100/mês (dependendo do volume)

---

### 2. **Bright Data API (LinkedIn Scraping)**

Para scraping de vagas no LinkedIn:

1. Crie uma conta em https://brightdata.com
2. Configure Web Scraper API
3. Adicione ao `.env`:
```env
BRIGHT_DATA_API_KEY="your-api-key"
```

**Custo estimado:** ~R$ 200/mês

**Nota:** Implementação completa requer configuração adicional no `linkedin-scraper.ts`

---

### 3. **Hunter.io (Email Finder)**

Para buscar e-mails corporativos:

1. Crie uma conta em https://hunter.io
2. Gere uma API key
3. Adicione ao `.env`:
```env
HUNTER_IO_API_KEY="your-api-key"
```

**Custo:** ~R$ 250/mês (50 buscas)

---

### 4. **Receita Federal API (Grátis)**

Busca de dados de CNPJ via BrasilAPI:

- Endpoint: `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`
- **Grátis** e sem necessidade de API key
- Já implementado e funcional

---

## 🤖 Como Funciona o Pipeline de Scraping

```
1. LinkedIn Scraping (Bright Data)
   ↓
2. Identificar CNPJ da empresa
   ↓
3. Enriquecer com Receita Federal
   ↓
4. Gerar insights com Claude AI
   ↓
5. Buscar e-mails com Hunter.io (opcional)
   ↓
6. Salvar lead no banco de dados
```

---

## 📊 Logs de Scraping

Cada execução do scraping gera um log na tabela `scrape_logs`:

```sql
SELECT * FROM scrape_logs ORDER BY createdAt DESC LIMIT 10;
```

**Campos:**
- `status`: success, error, running
- `query`: Query usada
- `jobsFound`: Total de vagas encontradas
- `leadsCreated`: Total de leads criados
- `duration`: Tempo de execução (segundos)
- `errors`: Erros JSON (se houver)

---

## 🚀 Deploy em Produção

### Vercel

1. Push para GitHub
2. Conecte ao Vercel
3. Configure variáveis de ambiente:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `CRON_SECRET`
   - APIs (Claude, Bright Data, Hunter.io)

4. O cron job será ativado automaticamente via `vercel.json`

### Supabase (Database)

1. Crie projeto em https://supabase.com
2. Copie Connection String
3. Execute: `npx prisma db push`
4. Execute: `npm run db:seed`

---

## 🧪 Testando Localmente

### 1. Testar Scraping Manual
```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"query": "Controller São Paulo"}'
```

### 2. Testar Cron Job
```bash
curl http://localhost:3000/api/cron/scrape-leads
```

### 3. Ver Logs
```bash
npx prisma studio
# Abrir tabela "scrape_logs"
```

---

## ⚠️ Limitações Atuais

1. **Bright Data**: Implementação base criada, requer configuração completa
2. **Hunter.io**: Limite de 50 buscas/mês no plano básico
3. **Claude AI**: Custo por token, monitorar uso
4. **CNPJ Search**: Implementação manual pendente

---

## 📚 Próximos Passos

- [ ] Implementar integração completa com Bright Data
- [ ] Adicionar página de configurações/admin
- [ ] Criar sistema de notificações por e-mail
- [ ] Implementar exportação CSV de leads
- [ ] Adicionar análise de sentimento nos insights
- [ ] Score de prioridade automático

---

**Documentação atualizada em:** 11/11/2025
