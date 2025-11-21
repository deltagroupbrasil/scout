# 🕐 Cronograma de Scraping Automatizado

## 📅 Estratégia de Execução

O sistema executa scraping automatizado **6 vezes por dia**, de 10 em 10 minutos, entre **5h e 6h da manhã** (horário de Brasília).

### ⏰ Horários de Execução

| Execução | Horário Brasil | Horário UTC | Empresas/Execução |
|----------|----------------|-------------|-------------------|
| 1        | 05:00          | 08:00       | 20                |
| 2        | 05:10          | 08:10       | 20                |
| 3        | 05:20          | 08:20       | 20                |
| 4        | 05:30          | 08:30       | 20                |
| 5        | 05:40          | 08:40       | 20                |
| 6        | 05:50          | 08:50       | 20                |

**Total por dia:** Até **120 empresas únicas**

## 🎯 Vantagens desta Estratégia

### 1. **Distribuição de Carga**
- Execuções menores (20 empresas) evitam timeouts
- Timeout de 5 minutos (Vercel Fluid Compute) é suficiente

### 2. **Maior Volume**
- 120 empresas/dia (vs 50 no modelo anterior)
- Aumenta em 140% a capacidade de prospecção

### 3. **Resiliência**
- Se 1 execução falhar, as outras 5 continuam
- No modelo anterior (1x/dia), uma falha = zero leads

### 4. **Horário Estratégico**
- 5h-6h da manhã = período de baixo tráfego
- Leads ficam disponíveis desde cedo para o time

## 📊 Cálculo de Leads Esperados

Assumindo uma média de **1.5 vagas por empresa**:
- 120 empresas × 1.5 vagas = **~180 leads/dia**
- **~1,260 leads/semana**
- **~5,400 leads/mês**

## 🔧 Configuração Técnica

### Arquivo: `vercel.json`
```json
{
  "crons": [
    { "path": "/api/cron/scrape-leads", "schedule": "0 8 * * *" },
    { "path": "/api/cron/scrape-leads", "schedule": "10 8 * * *" },
    { "path": "/api/cron/scrape-leads", "schedule": "20 8 * * *" },
    { "path": "/api/cron/scrape-leads", "schedule": "30 8 * * *" },
    { "path": "/api/cron/scrape-leads", "schedule": "40 8 * * *" },
    { "path": "/api/cron/scrape-leads", "schedule": "50 8 * * *" }
  ]
}
```

### Endpoint: `/api/cron/scrape-leads`
- **Timeout:** 300s (5 minutos)
- **Empresas por execução:** 20
- **Query:** "Controller OR CFO OR Gerente Financeiro OR Diretor Financeiro OR Controladoria São Paulo"

## 📈 Monitoramento

Para verificar o histórico de execuções:

```bash
# Verificar logs de scraping
DATABASE_URL="..." npx tsx scripts/check-scrape-logs.ts

# Verificar leads criados por data
DATABASE_URL="..." npx tsx scripts/check-leads-by-date.ts
```

### Métricas Esperadas

**Sucesso:**
- 6 execuções/dia com status "success"
- ~20 leads criados por execução
- Duração: 60-180s por execução

**Alertas:**
- Taxa de sucesso < 80% (< 5 execuções com sucesso)
- Duração > 240s (próximo do timeout)
- Leads criados < 10 por execução

## 🚨 Troubleshooting

### Cron não está executando?
1. Verificar Vercel Dashboard → Cron Jobs
2. Verificar `CRON_SECRET` nas variáveis de ambiente
3. Testar manualmente: `curl https://leapscout.vercel.app/api/cron/scrape-leads -H "Authorization: Bearer YOUR_SECRET"`

### Execuções falhando?
1. Verificar logs no Vercel Dashboard
2. Verificar se Bright Data tem créditos
3. Verificar se DATABASE_URL está configurado
4. Verificar timeout (max 300s no Hobby plan)

### Muitas duplicatas?
- O sistema já valida duplicatas por `jobUrl`
- Se necessário, ajustar limite de empresas para 15 ou 10

## 🔄 Alterações Futuras

### Se precisar aumentar volume:
- Adicionar mais horários (ex: 6h-7h também)
- Aumentar para 25-30 empresas/execução

### Se precisar economizar créditos:
- Reduzir para 4 execuções (a cada 15min)
- Reduzir para 15 empresas/execução
