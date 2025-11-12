# 📖 Como Usar o LeapScout

Guia completo para o usuário final usar o sistema de scraping de vagas.

---

## 🎯 3 Formas de Buscar Vagas

### **1. ⏰ Scraping Automático (Recomendado)**

O sistema roda **automaticamente todos os dias às 6h da manhã** buscando novas vagas.

**O que acontece:**
- Sistema busca vagas no LinkedIn, Gupy e Catho
- Enriquece dados da empresa (CNPJ, faturamento, funcionários)
- Gera insights com IA (contatos sugeridos, gatilhos de abordagem)
- Calcula score de prioridade (0-100)
- Salva tudo no dashboard

**Você não precisa fazer nada!** 🎉

---

### **2. 🖱️ Scraping Manual via Dashboard**

Acesse o dashboard e use o botão de scraping manual:

1. Abra **http://localhost:3000/dashboard**
2. Clique em **"Buscar Novas Vagas"** (botão azul no header, ao lado de "Exportar CSV")
3. Aguarde o processamento (pode levar 3-5 minutos)
4. Você verá notificações (toasts) informando:
   - "Buscando vagas..." (durante o processo)
   - "Busca concluída! X novas vagas encontradas em Y minutos" (sucesso)
   - Ou mensagem de erro se algo falhar
5. Vagas aparecerão automaticamente na lista após conclusão

**Importante**: O botão ficará desabilitado durante o processamento para evitar múltiplas execuções simultâneas.

---

### **3. 🔧 Scraping Manual via API**

Para desenvolvedores ou automações avançadas:

#### **Via Browser (teste rápido)**
```bash
# Abrir no navegador:
http://localhost:3000/api/cron/scrape-leads
```

#### **Via cURL**
```bash
curl -X POST http://localhost:3000/api/cron/scrape-leads
```

#### **Via Postman/Insomnia**
- **Method**: POST
- **URL**: http://localhost:3000/api/cron/scrape-leads
- **Headers**: Nenhum (em dev)

**Resposta esperada:**
```json
{
  "success": true,
  "leadsCreated": 12,
  "duration": 45,
  "message": "Scraping concluído com sucesso. 12 leads criados."
}
```

---

## 📊 Visualizar Resultados

### **Dashboard Principal**
http://localhost:3000/dashboard

**O que você vê:**
- ✅ Lista de todas as vagas encontradas
- ✅ Score de prioridade (Muito Alta, Alta, Média, Baixa)
- ✅ Dados da empresa (CNPJ, faturamento, funcionários)
- ✅ Filtros por status, data, prioridade
- ✅ Busca por palavra-chave

### **Detalhes do Lead**
Clique em qualquer vaga para ver:
- 📋 Descrição completa da vaga
- 🏢 Informações detalhadas da empresa
- 👥 Contatos sugeridos pela IA (nome, cargo, email, LinkedIn)
- 🎯 Gatilhos de abordagem (gerados pela IA)
- 📝 Notas e histórico de interações
- 📊 Score de prioridade com breakdown

---

## ⚙️ Configurações

### **Alterar Query de Busca**

As vagas buscadas são definidas no código. Para alterar:

**Arquivo**: `app/api/cron/scrape-leads/route.ts`
```typescript
// Linha 53 - Altere a query aqui
const query = 'Controller OR CFO OR "Gerente Controladoria" São Paulo'
```

**Exemplos de queries:**
```
"Controller São Paulo"
"CFO OR Controladoria Rio de Janeiro"
"Gerente Financeiro BPO Brasil"
"Controller AND (Controladoria OR CFO) São Paulo"
```

### **Alterar Frequência do Cron**

**Arquivo**: `vercel.json`
```json
{
  "crons": [{
    "path": "/api/cron/scrape-leads",
    "schedule": "0 6 * * *"  // ← Altere aqui (formato cron)
  }]
}
```

**Exemplos de schedules:**
- `0 6 * * *` - Todos os dias às 6h
- `0 */4 * * *` - A cada 4 horas
- `0 9 * * 1` - Todas segundas-feiras às 9h
- `0 8,18 * * *` - Todos os dias às 8h e 18h

> **Atenção**: O cron só funciona em produção (Vercel). Em desenvolvimento, use chamada manual.

---

## 🔍 Fontes de Vagas

O sistema busca vagas em **3 fontes simultaneamente**:

| Fonte | Status | Observação |
|-------|--------|------------|
| **LinkedIn** | ✅ Funcional | Usa Puppeteer da Bright Data |
| **Gupy** | ⚠️ Mock | Dados simulados (aguarda teste real) |
| **Catho** | ⚠️ Mock | Dados simulados (aguarda teste real) |

**Para ativar Gupy e Catho reais:**
1. Ajustar seletores CSS em `lib/services/web-unlocker.ts`
2. Testar com `npx tsx scripts/test-web-unlocker.ts`
3. Deploy automático após teste

---

## 📈 Monitoramento

### **Ver Logs de Scraping**

**Via Prisma Studio:**
```bash
npx prisma studio
```
1. Abrir **ScrapeLog** na sidebar
2. Ver histórico de execuções (status, duração, erros)

**Via Dashboard** (futuro):
- Seção "Histórico de Scraping" com estatísticas

---

## ❓ Perguntas Frequentes

### **1. Quanto tempo leva para buscar vagas?**
- LinkedIn: 30-60 segundos
- Gupy/Catho: 15-30 segundos cada
- **Total**: ~1-2 minutos para todas as fontes

### **2. Quantas vagas são encontradas por dia?**
Depende da query, mas em média:
- LinkedIn: 10-50 vagas
- Gupy: 5-20 vagas
- Catho: 5-20 vagas
- **Total**: 20-90 vagas/dia

### **3. O sistema busca vagas duplicadas?**
Não! O sistema verifica se a vaga já existe pela URL antes de criar.

### **4. Como sei se o scraping está funcionando?**
1. Acesse http://localhost:3000/dashboard
2. Verifique a data da última vaga criada
3. Ou acesse Prisma Studio e veja a tabela `ScrapeLog`

### **5. Erro "Rate limit exceeded"?**
Isso acontece quando você faz muitas requisições em pouco tempo.
**Solução**: Aguarde 1 minuto e tente novamente.

### **6. Posso buscar vagas de outras áreas?**
Sim! Basta alterar a query de busca (ver seção "Configurações")

---

## 🚀 Próximas Features

- [x] Botão "Buscar Vagas" no dashboard
- [ ] Configuração de query via interface
- [ ] Notificações de novas vagas de alta prioridade
- [ ] Relatórios semanais por email
- [ ] Dashboard de estatísticas de scraping

---

**Última atualização**: 12/11/2025
**Desenvolvido por**: Leap Solutions
