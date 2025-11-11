# 🧪 Guia de Testes - LeapScout

Este guia mostra como testar todas as funcionalidades do sistema.

---

## 🚀 Pré-requisitos

1. **Servidor rodando:**
```bash
cd leapscout
npm run dev
```

2. **Navegador aberto em:** http://localhost:3000

---

## 1️⃣ Teste de Autenticação

### Login no Sistema

1. Acesse: http://localhost:3000/login
2. Use as credenciais:
   - **Email:** `admin@leapsolutions.com.br`
   - **Senha:** `admin123`
3. Clique em "Entrar"

✅ **Resultado esperado:** Redirecionamento para o dashboard

---

## 2️⃣ Teste do Dashboard

### Visualizar Leads

1. Após login, você verá o dashboard principal
2. Observe as 3 cards de estatísticas no topo:
   - Total de Leads
   - Leads Novos
   - Contatados

✅ **Resultado esperado:**
- Total: 1 lead (Ambev)
- Card com estatísticas visíveis

### Visualizar Tabela de Leads

Na tabela, você deve ver:
- **Coluna Empresa:** Ambev S.A. com badge "Novo" verde
- **Coluna Faturamento:** Valor em R$
- **Coluna Cargo:** Controller Sênior
- **Coluna Prioridade:** Badge colorido + score (ex: "Muito Alta 97/100")
- **Coluna Status:** Badge com status atual
- **Coluna Data:** Tempo relativo (ex: "há 2 dias")

✅ **Resultado esperado:** Tabela exibindo o lead da Ambev com todas as colunas

---

## 3️⃣ Teste de Filtros

### Testar Filtro de Status

1. Clique no dropdown "Status"
2. Selecione "Novo"
3. Observe a tabela atualizar

✅ **Resultado esperado:** Lead da Ambev continua aparecendo (status = NEW)

### Testar Filtro de Data

1. Clique no dropdown "Período"
2. Teste as opções:
   - Últimos 7 dias
   - Últimos 30 dias
   - Últimos 90 dias

✅ **Resultado esperado:** Lead aparece/desaparece conforme a data de criação

### Testar Busca

1. No campo de busca, digite "Ambev"
2. Pressione Enter ou aguarde

✅ **Resultado esperado:** Lead da Ambev aparece

3. Digite "XYZ" (empresa inexistente)

✅ **Resultado esperado:** Mensagem "Nenhum lead encontrado"

---

## 4️⃣ Teste de Detalhes do Lead

### Acessar Página do Lead

1. Clique em qualquer linha da tabela (lead da Ambev)
2. Você será redirecionado para `/dashboard/leads/[id]`

✅ **Resultado esperado:** Página de detalhes abre

### Verificar Informações Exibidas

Na página de detalhes, verifique se aparecem:

**Seção "Informações da Empresa":**
- Nome da empresa
- CNPJ
- Faturamento
- Funcionários
- Setor
- Website
- LinkedIn

**Seção "Detalhes da Vaga":**
- Título da vaga
- Data de publicação
- Número de candidatos
- URL da vaga
- Descrição completa

**Seção "Decisores Sugeridos" (IA):**
- Lista de contatos gerados pela IA
- Nome, cargo, email (se disponível)

**Seção "Gatilhos de Abordagem" (IA):**
- Lista de triggers contextualizados
- Insights sobre momento da empresa

**Seção "Notas":**
- Timeline de notas
- Campo para adicionar nova nota

✅ **Resultado esperado:** Todas as seções visíveis com dados

---

## 5️⃣ Teste de Sistema de Notas

### Adicionar Nova Nota

1. Na página de detalhes do lead
2. Role até a seção "Notas"
3. Digite uma nota no campo de texto:
   - Ex: "Empresa com grande potencial. Agendar reunião."
4. Clique em "Adicionar Nota"

✅ **Resultado esperado:**
- Nota aparece na timeline
- Campo de texto limpa
- Mostra data/hora da nota

### Verificar Timeline

1. Adicione mais 2-3 notas
2. Observe a ordem cronológica

✅ **Resultado esperado:** Notas mais recentes aparecem primeiro

---

## 6️⃣ Teste de Mudança de Status

### Alterar Status do Lead

1. Na página de detalhes do lead
2. Localize o dropdown de status (próximo ao título)
3. Mude de "Novo" para "Contatado"

✅ **Resultado esperado:**
- Status atualiza visualmente
- Badge muda de cor
- Badge "Novo" verde desaparece

4. Volte ao dashboard (botão "← Voltar")

✅ **Resultado esperado:**
- Status atualizado na tabela
- Badge "Novo" não aparece mais

---

## 7️⃣ Teste de Exportação CSV

### Exportar Leads para CSV

1. No dashboard principal
2. Localize o botão "Exportar CSV" no canto superior direito
3. Clique no botão

✅ **Resultado esperado:**
- Download automático de arquivo CSV
- Nome do arquivo: `leapscout-leads-YYYY-MM-DD.csv`

### Verificar Conteúdo do CSV

1. Abra o arquivo CSV no Excel ou Google Sheets
2. Verifique as colunas:
   - Empresa, CNPJ, Faturamento, Funcionários, Setor
   - Vaga, Data Publicação, Status, Score Prioridade
   - Candidatos, URL Vaga, Website, LinkedIn
   - Contatos Sugeridos, Gatilhos, Data Captação

✅ **Resultado esperado:**
- Arquivo abre corretamente
- Dados do lead da Ambev aparecem
- Formatação correta (R$ para valores monetários)

### Testar Exportação com Filtros

1. Volte ao dashboard
2. Aplique filtro de status = "Contatado"
3. Clique em "Exportar CSV"

✅ **Resultado esperado:** CSV contém apenas leads com status "Contatado"

---

## 8️⃣ Teste do Sistema de Score

### Verificar Score na Tabela

1. No dashboard, observe a coluna "Prioridade"
2. Veja o badge colorido e score numérico

✅ **Resultado esperado:**
- Badge "Muito Alta" (vermelho) ou similar
- Score próximo de 97/100 para Ambev

### Recalcular Scores

Execute o script de recálculo:

```bash
cd leapscout
npx tsx scripts/recalculate-priority-scores.ts
```

✅ **Resultado esperado:**
```
🔢 Recalculando scores de prioridade...
📊 Encontrados 1 leads
✅ Ambev S.A. - Controller Sênior: 97/100 (Muito Alta)
✨ Recálculo concluído!
```

---

## 9️⃣ Teste de Scraping Multi-Fonte

### Testar Scrapers (Mock)

Execute o script de teste:

```bash
cd leapscout
npx tsx scripts/test-multi-source-scraping.ts
```

✅ **Resultado esperado:**
```
🧪 Testando scraping multi-fonte...

1️⃣ Testando Gupy...
[Gupy] Buscando vagas para: "Controller Controladoria Financeiro"
   ✅ Gupy: 3 vagas encontradas
   📝 Exemplo: Analista de Controladoria - Lojas Americanas S.A.

2️⃣ Testando Catho...
[Catho] Buscando vagas para: "Controller Controladoria Financeiro"
   ✅ Catho: 4 vagas encontradas
   📝 Exemplo: Controller - Grupo Pão de Açúcar

📊 Resumo:
   - Gupy: 3 vagas
   - Catho: 4 vagas
   - Total: 7 vagas

✨ Teste concluído!
```

### Testar Pipeline Completo (Cron)

**⚠️ ATENÇÃO:** Isso criará novos leads no banco de dados!

Execute o endpoint de scraping:

```bash
curl http://localhost:3000/api/cron/scrape-leads
```

OU acesse no navegador:
http://localhost:3000/api/cron/scrape-leads

✅ **Resultado esperado:**
```json
{
  "success": true,
  "leadsCreated": 7,
  "duration": 15,
  "message": "Scraping concluído com sucesso. 7 leads criados."
}
```

Depois, verifique no dashboard se os novos leads aparecem!

---

## 🔟 Teste de IA (Claude API)

### Testar Geração de Insights

Execute o script de teste:

```bash
cd leapscout
npx tsx scripts/test-ai-insights.ts
```

✅ **Resultado esperado:**
```
🤖 Testando integração com Claude API...

📊 Gerando insights para: Natura Cosméticos
📋 Vaga: Gerente de Controladoria

✅ Insights gerados com sucesso!

👥 DECISORES SUGERIDOS:
──────────────────────────────────────────────────
1. Carlos Mendes
   Cargo: CFO

2. Ana Paula Silva
   Cargo: Gerente de Controladoria

🎯 GATILHOS DE ABORDAGEM:
──────────────────────────────────────────────────
1. Empresa está contratando para Gerente de Controladoria - sinal de expansão
2. Oportunidade de apresentar soluções de controladoria
3. Momento ideal para prospecção ativa

✨ Teste concluído com sucesso!
```

### Regenerar Insights com IA

Execute o script de regeneração:

```bash
cd leapscout
npx tsx scripts/regenerate-leads-with-ai.ts
```

✅ **Resultado esperado:**
```
🔄 Regenerando insights dos leads com IA...

📊 Encontrados 1 leads

🤖 Processando: Ambev S.A. - Controller Sênior
   ✅ 2 contatos e 3 gatilhos gerados

✨ Regeneração concluída!
```

Depois, veja os novos insights na página de detalhes do lead!

---

## 1️⃣1️⃣ Teste do Prisma Studio

### Visualizar Banco de Dados

Execute:

```bash
cd leapscout
npx prisma studio
```

✅ **Resultado esperado:**
- Interface web abre em http://localhost:5555
- Você pode ver todas as tabelas:
  - users
  - companies
  - leads
  - notes
  - scrape_logs

### Explorar os Dados

1. Clique em "Lead"
2. Veja todos os campos do lead da Ambev
3. Observe os campos JSON (`suggestedContacts`, `triggers`)
4. Veja o `priorityScore`

---

## 1️⃣2️⃣ Teste de Responsividade

### Desktop

1. Use o navegador em tela cheia
2. Navegue pelo dashboard

✅ **Resultado esperado:** Layout fluido e organizado

### Mobile

1. Abra DevTools (F12)
2. Ative o modo responsivo (Ctrl+Shift+M)
3. Teste em diferentes tamanhos:
   - iPhone (375px)
   - iPad (768px)
   - Desktop pequeno (1024px)

✅ **Resultado esperado:** Interface se adapta bem

---

## 1️⃣3️⃣ Checklist Completo de Testes

Marque conforme você testa:

### Autenticação
- [ ] Login com credenciais corretas
- [ ] Login com credenciais incorretas (deve dar erro)
- [ ] Logout

### Dashboard
- [ ] Cards de estatísticas aparecem
- [ ] Tabela de leads carrega
- [ ] Score de prioridade visível
- [ ] Badges de status corretos

### Filtros
- [ ] Filtro por status funciona
- [ ] Filtro por data funciona
- [ ] Busca por nome funciona
- [ ] Combinação de filtros funciona

### Detalhes do Lead
- [ ] Página abre corretamente
- [ ] Informações da empresa visíveis
- [ ] Detalhes da vaga visíveis
- [ ] Decisores (IA) aparecem
- [ ] Gatilhos (IA) aparecem
- [ ] Timeline de notas funciona

### Notas
- [ ] Adicionar nova nota funciona
- [ ] Nota aparece na timeline
- [ ] Ordem cronológica correta

### Status
- [ ] Mudar status funciona
- [ ] Badge atualiza
- [ ] Mudança reflete no dashboard

### Exportação CSV
- [ ] Botão "Exportar CSV" funciona
- [ ] Arquivo baixa automaticamente
- [ ] CSV abre no Excel/Sheets
- [ ] Dados estão corretos
- [ ] Filtros afetam exportação

### Scripts
- [ ] test-ai-insights.ts funciona
- [ ] recalculate-priority-scores.ts funciona
- [ ] test-multi-source-scraping.ts funciona
- [ ] regenerate-leads-with-ai.ts funciona

### APIs
- [ ] GET /api/leads funciona
- [ ] GET /api/leads/[id] funciona
- [ ] PATCH /api/leads/[id] funciona
- [ ] POST /api/notes funciona
- [ ] GET /api/leads/export funciona
- [ ] GET /api/cron/scrape-leads funciona

---

## 🐛 Problemas Comuns

### Servidor não inicia
```bash
npx kill-port 3000
npm run dev
```

### Erro no Prisma
```bash
npx prisma generate
npx prisma db push
```

### Banco de dados corrompido
```bash
rm prisma/dev.db
npx prisma db push
npm run db:seed
```

### Nenhum lead aparece
```bash
npm run db:seed
npx tsx scripts/regenerate-leads-with-ai.ts
```

---

## 📊 Resultados Esperados

Após todos os testes, você deve ter:

✅ **1 lead inicial** (Ambev - do seed)
✅ **7 leads novos** (se executou o cron: Gupy + Catho mocks)
✅ **Várias notas** criadas durante testes
✅ **Arquivo CSV** baixado
✅ **Scores calculados** para todos os leads
✅ **Insights de IA** gerados

---

## 🎯 Próximos Passos

Depois de testar tudo:

1. **Deploy na Vercel** (quando estiver pronto)
2. **Adicionar mais empresas** via seed
3. **Integrar APIs reais** (Gupy, Catho)
4. **Implementar notificações** por email

---

**Dúvidas?** Consulte a documentação:
- `README.md` - Visão geral
- `CLAUDE.md` - Guia técnico
- `QUICKSTART.md` - Início rápido
- `API_DOCS.md` - Referência de APIs
