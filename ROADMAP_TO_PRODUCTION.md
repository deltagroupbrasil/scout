# 🚀 Roadmap para Produção - LeapScout

Plano completo de sprints para preparar o LeapScout para produção.

---

## ✅ Sprints Concluídos

### Sprint 1 - Estabilização ✅ (5-8 dias)
- ✅ Migração PostgreSQL
- ✅ Validação SMTP de emails
- ✅ Rate limiting & retry logic
- ✅ Error tracking (Sentry)
- ✅ Testes básicos

### Sprint 2 - Qualidade de Dados ✅ (5-7 dias)
- ✅ Deduplicação inteligente de empresas
- ✅ Validação de telefones brasileiros
- ✅ Cache agressivo de enriquecimento
- ✅ LinkedIn profile scraping (base)
- ✅ Dashboard de custos Nova Vida TI

---

## 📋 Sprints Restantes

### Sprint 3 - UX & Features (5-7 dias) 🔄

**Objetivo**: Melhorar experiência do usuário e adicionar features essenciais

#### 1. Filtros Avançados (1-2 dias)
**Prioridade**: Alta

**O que fazer**:
- [ ] Filtros por receita (ranges: < R$ 10M, R$ 10M-50M, R$ 50M-100M, > R$ 100M)
- [ ] Filtros por número de funcionários (< 50, 50-200, 200-500, > 500)
- [ ] Filtros por setor (usando CNAE ou setor detectado)
- [ ] Filtros por prioridade (Muito Alta, Alta, Média, Baixa)
- [ ] Filtros por fonte (LinkedIn, Gupy, Catho, etc)
- [ ] Filtros por região/estado (extrair de location)
- [ ] Salvar filtros favoritos
- [ ] URL params para compartilhar filtros

**Arquivos a criar**:
- `components/dashboard/advanced-filters.tsx`
- `lib/utils/filter-presets.ts`
- API: `GET /api/leads/filters` (retorna opções disponíveis)

**Benefício**: Encontrar leads qualificados 3x mais rápido

---

#### 2. Bulk Actions (1 dia)
**Prioridade**: Alta

**O que fazer**:
- [ ] Checkbox multi-seleção na tabela de leads
- [ ] Ações em massa:
  - Atualizar status (NEW → CONTACTED, etc)
  - Atribuir para usuário
  - Adicionar tag/label
  - Exportar selecionados
  - Excluir em massa
- [ ] Confirmação antes de ações destrutivas
- [ ] Progress bar para ações lentas

**Arquivos a criar**:
- `components/dashboard/bulk-actions-bar.tsx`
- API: `PATCH /api/leads/bulk`

**Benefício**: Gerenciar 100 leads em segundos vs minutos

---

#### 3. Templates de Email (1-2 dias)
**Prioridade**: Média

**O que fazer**:
- [ ] Editor de templates (variáveis: {{nome}}, {{empresa}}, {{cargo}})
- [ ] Templates pré-definidos por gatilho:
  - "Empresa expandindo" (quando detecta contratação)
  - "Novo funding" (quando detecta investimento)
  - "Crescimento rápido" (quando detecta aumento de vagas)
- [ ] Preview de email com dados reais
- [ ] Integração com Gmail/Outlook (OAuth)
- [ ] Envio em massa com rate limiting

**Arquivos a criar**:
- `app/(dashboard)/dashboard/templates/page.tsx`
- `lib/services/email-sender.ts`
- `components/dashboard/email-template-editor.tsx`
- Model: `EmailTemplate` no Prisma

**Benefício**: Personalização em escala, 10x mais rápido que manual

---

#### 4. Sistema de Notificações (1 dia)
**Prioridade**: Média

**O que fazer**:
- [ ] Notificações in-app (bell icon no header)
- [ ] Tipos de notificação:
  - Novos leads (X leads adicionados hoje)
  - Leads de alta prioridade
  - Empresas que você marcou "watch"
  - Erros de scraping
- [ ] Email digest diário/semanal
- [ ] Integração Slack (webhook)
- [ ] Configurações de preferências

**Arquivos a criar**:
- Model: `Notification` no Prisma
- `app/api/notifications/route.ts`
- `components/dashboard/notification-center.tsx`
- `lib/services/notification-service.ts`

**Benefício**: Nunca perder um lead importante

---

#### 5. Dark Mode (4-6 horas)
**Prioridade**: Baixa (mas fácil)

**O que fazer**:
- [ ] Configurar Tailwind dark mode (class strategy)
- [ ] Toggle no header
- [ ] Salvar preferência em localStorage
- [ ] Classes dark: para todos componentes

**Arquivos a modificar**:
- `tailwind.config.ts` - Habilitar dark mode
- `components/dashboard/theme-toggle.tsx` - Novo componente
- Todos componentes: adicionar classes `dark:`

**Benefício**: UX moderna, menos cansaço visual

---

### Sprint 4 - Analytics & Insights (3-5 dias) 📊

**Objetivo**: Dashboards e relatórios para tomada de decisão

#### 1. Dashboard de Analytics (2 dias)
**Prioridade**: Alta

**O que criar**:
- [ ] Métricas principais (KPIs):
  - Taxa de conversão (NEW → CONTACTED → QUALIFIED)
  - Tempo médio até primeiro contato
  - Leads por fonte (LinkedIn, Gupy, etc)
  - Empresas por setor
  - Distribuição geográfica
- [ ] Gráficos (Chart.js ou Recharts):
  - Line chart: Leads ao longo do tempo
  - Bar chart: Leads por status
  - Pie chart: Leads por fonte
  - Funnel: Conversão de status
- [ ] Filtros de período (7d, 30d, 90d, custom)
- [ ] Comparação com período anterior

**Arquivos a criar**:
- `app/(dashboard)/dashboard/analytics/page.tsx`
- `components/dashboard/analytics-charts.tsx`
- API: `GET /api/analytics/summary`
- `lib/services/analytics-service.ts`

**Benefício**: Visão completa do funil de vendas

---

#### 2. Relatórios Exportáveis (1 dia)
**Prioridade**: Média

**O que criar**:
- [ ] Relatório de performance (PDF)
- [ ] Relatório de custos (CSV)
- [ ] Relatório de leads qualificados (Excel)
- [ ] Agendamento de relatórios (diário/semanal)
- [ ] Envio automático por email

**Arquivos a criar**:
- `lib/services/report-generator.ts`
- API: `GET /api/reports/generate`

**Benefício**: Reporting para gestores

---

#### 3. Lead Scoring Avançado (1-2 dias)
**Prioridade**: Média

**O que implementar**:
- [ ] Machine Learning para scoring (TensorFlow.js)
- [ ] Treinar modelo com feedbacks (ContactFeedback)
- [ ] Scoring dinâmico baseado em:
  - Taxa de sucesso histórica por setor
  - Taxa de sucesso por tamanho de empresa
  - Padrões de empresas que convertem
- [ ] Re-scoring automático semanal
- [ ] Explicação do score (why this score?)

**Arquivos a criar**:
- `lib/services/ml-scoring.ts`
- `scripts/train-scoring-model.ts`
- Model: `ScoringModel` no Prisma (guardar versões)

**Benefício**: Priorização 50% mais precisa

---

### Sprint 5 - Integrações & Automação (4-6 dias) 🔗

**Objetivo**: Integrar com ferramentas externas e automatizar workflows

#### 1. Integração CRM (2-3 dias)
**Prioridade**: Alta

**CRMs a integrar**:
- [ ] **HubSpot** (mais popular no Brasil)
- [ ] **Pipedrive**
- [ ] **RD Station CRM**
- [ ] **Salesforce** (opcional)

**Funcionalidades**:
- [ ] Sincronização bidirecional:
  - LeapScout → CRM (criar/atualizar leads)
  - CRM → LeapScout (atualizar status)
- [ ] Mapeamento de campos customizados
- [ ] Sincronização automática (webhook ou polling)
- [ ] Log de sincronização
- [ ] Resolução de conflitos

**Arquivos a criar**:
- `lib/integrations/hubspot.ts`
- `lib/integrations/pipedrive.ts`
- `app/(dashboard)/dashboard/integrations/page.tsx`
- `app/api/integrations/[provider]/sync/route.ts`
- Model: `Integration`, `SyncLog` no Prisma

**Benefício**: Workflow integrado, sem duplicação de trabalho

---

#### 2. Webhook System (1 dia)
**Prioridade**: Média

**O que implementar**:
- [ ] Webhooks outbound:
  - `lead.created` (quando novo lead é criado)
  - `lead.updated` (quando status muda)
  - `lead.qualified` (quando lead é qualificado)
  - `scraping.completed` (quando scraping termina)
- [ ] Configuração de webhooks no dashboard
- [ ] Retry automático (3 tentativas)
- [ ] Log de deliveries
- [ ] Assinatura HMAC para segurança

**Arquivos a criar**:
- `lib/services/webhook-service.ts`
- Model: `Webhook`, `WebhookDelivery` no Prisma
- `app/api/webhooks/route.ts`

**Benefício**: Integrações customizadas infinitas

---

#### 3. Zapier/Make Integration (1 dia)
**Prioridade**: Média

**O que fazer**:
- [ ] Criar app no Zapier
- [ ] Triggers:
  - New Lead
  - Lead Updated
  - Lead Qualified
- [ ] Actions:
  - Create Lead
  - Update Lead Status
  - Add Note
- [ ] Searches:
  - Find Lead by Company
  - Find Company by CNPJ

**Benefício**: 5.000+ integrações prontas

---

#### 4. Automações (1-2 dias)
**Prioridade**: Alta

**O que implementar**:
- [ ] Regras de automação (if-then):
  - SE lead tem score > 80 → Atribuir para vendedor X
  - SE empresa tem > 500 funcionários → Marcar como "Enterprise"
  - SE lead está em NEW por > 3 dias → Enviar notificação
  - SE empresa detecta evento → Aumentar prioridade
- [ ] Editor visual de workflows
- [ ] Execução assíncrona (queue)
- [ ] Log de execuções

**Arquivos a criar**:
- Model: `Automation`, `AutomationExecution` no Prisma
- `lib/services/automation-engine.ts`
- `app/(dashboard)/dashboard/automations/page.tsx`

**Benefício**: Time comercial foca em vender, não em processos

---

### Sprint 6 - Performance & Escalabilidade (3-5 dias) ⚡

**Objetivo**: Preparar sistema para 10.000+ leads

#### 1. Database Optimization (1-2 dias)
**Prioridade**: Alta

**O que fazer**:
- [ ] Adicionar índices compostos:
  ```prisma
  @@index([status, priorityScore])
  @@index([companyId, createdAt])
  @@index([status, assignedToId])
  ```
- [ ] Particionar tabela de leads por data (PostgreSQL partitioning)
- [ ] Implementar soft delete (em vez de delete físico)
- [ ] Arquivamento automático de leads antigos (> 1 ano)
- [ ] VACUUM e ANALYZE automáticos
- [ ] Connection pooling otimizado (Prisma + PgBouncer)

**Scripts a criar**:
- `scripts/analyze-query-performance.ts`
- `scripts/archive-old-leads.ts`
- `scripts/optimize-db.ts`

**Benefício**: Queries 10-50x mais rápidas

---

#### 2. Caching Strategy (1 dia)
**Prioridade**: Média

**O que implementar**:
- [ ] Redis para cache de queries frequentes:
  - Dashboard stats (TTL: 5 minutos)
  - Lista de leads (TTL: 1 minuto)
  - Filtros disponíveis (TTL: 1 hora)
- [ ] Cache-aside pattern
- [ ] Invalidação inteligente (quando dados mudam)
- [ ] Cache warming (pré-carregar dados importantes)

**Arquivos a criar**:
- `lib/cache/redis-client.ts`
- `lib/cache/cache-keys.ts`
- `lib/cache/cache-wrapper.ts`

**Benefício**: Dashboard 5x mais rápido

---

#### 3. Background Jobs (1-2 dias)
**Prioridade**: Alta

**O que implementar**:
- [ ] Queue system (BullMQ + Redis):
  - Scraping jobs (baixa prioridade)
  - Enrichment jobs (média prioridade)
  - Email sending (alta prioridade)
- [ ] Worker processes separados
- [ ] Retry automático com exponential backoff
- [ ] Dead letter queue para jobs falhados
- [ ] Dashboard de monitoring de jobs

**Arquivos a criar**:
- `lib/queue/queue-manager.ts`
- `lib/queue/workers/scraping-worker.ts`
- `lib/queue/workers/enrichment-worker.ts`
- `app/api/jobs/route.ts` (monitor)

**Benefício**: Sistema nunca trava, processa assincronamente

---

#### 4. CDN & Asset Optimization (4-6 horas)
**Prioridade**: Baixa

**O que fazer**:
- [ ] Configurar Vercel CDN
- [ ] Image optimization (Next.js Image)
- [ ] Lazy loading de componentes pesados
- [ ] Code splitting otimizado
- [ ] Minificação e compression (gzip/brotli)

**Benefício**: Load time < 2s

---

### Sprint 7 - Segurança & Compliance (3-4 dias) 🔒

**Objetivo**: Garantir segurança e conformidade LGPD

#### 1. Segurança (2 dias)
**Prioridade**: Crítica

**O que implementar**:
- [ ] **Auth melhorado**:
  - 2FA (TOTP)
  - Sessões com expiração
  - Logout de todos dispositivos
  - Histórico de logins
  - Detecção de login suspeito (IP/localização)
- [ ] **RBAC** (Role-Based Access Control):
  - Roles: Admin, Manager, Salesperson, Viewer
  - Permissions granulares
  - Auditoria de ações
- [ ] **API Security**:
  - Rate limiting por IP/usuário
  - API keys para integrações
  - CORS configurado
  - CSP headers
- [ ] **Data Security**:
  - Encrypt dados sensíveis at rest (CNPJ, telefones)
  - Sanitização de inputs
  - SQL injection protection (Prisma já faz)
  - XSS protection

**Arquivos a criar**:
- `lib/auth/rbac.ts`
- `lib/auth/2fa.ts`
- Model: `AuditLog`, `ApiKey` no Prisma
- Middleware: `rate-limit.ts`

**Benefício**: Sistema seguro para dados sensíveis

---

#### 2. LGPD Compliance (1-2 dias)
**Prioridade**: Crítica

**O que implementar**:
- [ ] **Consentimento**:
  - Termo de uso e política de privacidade
  - Aceite obrigatório no primeiro login
  - Histórico de aceites
- [ ] **Direitos do Titular**:
  - Exportar todos dados (JSON)
  - Deletar conta + todos dados
  - Retificar dados incorretos
  - Revogar consentimento
- [ ] **Anonimização**:
  - Anonimizar leads antigos (> 2 anos sem atividade)
  - Remover PII após exclusão
- [ ] **Auditoria**:
  - Log de quem acessou quais dados
  - Log de exportações
  - Log de exclusões
- [ ] **Data Processing Agreement** (DPA):
  - Documento legal para clientes

**Arquivos a criar**:
- `app/(dashboard)/dashboard/privacy/page.tsx`
- `app/api/gdpr/export/route.ts`
- `app/api/gdpr/delete/route.ts`
- `scripts/anonymize-old-data.ts`
- Model: `ConsentLog`, `DataAccessLog` no Prisma

**Benefício**: Compliance legal, evita multas ANPD

---

### Sprint 8 - DevOps & Deploy (2-3 dias) 🚢

**Objetivo**: Pipeline de deploy profissional

#### 1. CI/CD (1 dia)
**Prioridade**: Alta

**O que configurar**:
- [ ] **GitHub Actions**:
  - Workflow de testes (rodar `npm test` em todo PR)
  - Lint automático
  - Build verification
  - Deploy automático (staging + production)
- [ ] **Environments**:
  - Development (local)
  - Staging (Vercel preview)
  - Production (Vercel production)
- [ ] **Database Migrations**:
  - Rodar migrations em CI
  - Rollback automático se falhar
- [ ] **Smoke Tests**:
  - Testar endpoints críticos após deploy

**Arquivos a criar**:
- `.github/workflows/ci.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`
- `scripts/smoke-test.ts`

**Benefício**: Deploys seguros e automáticos

---

#### 2. Monitoring & Observability (1 dia)
**Prioridade**: Alta

**O que configurar**:
- [ ] **Uptime Monitoring**:
  - UptimeRobot ou Pingdom
  - Alertas quando site cai
- [ ] **APM** (Application Performance Monitoring):
  - Sentry Performance
  - New Relic (opcional)
- [ ] **Logs Centralizados**:
  - Vercel Logs
  - Datadog ou Logtail
- [ ] **Dashboards**:
  - Grafana + Prometheus (opcional)
  - Vercel Analytics (built-in)

**Benefício**: Detectar problemas antes dos usuários

---

#### 3. Backup & Disaster Recovery (1 dia)
**Prioridade**: Alta

**O que configurar**:
- [ ] **Database Backups**:
  - Backup automático diário (Neon faz isso)
  - Backup manual antes de migrations
  - Testar restore regularmente
- [ ] **Disaster Recovery Plan**:
  - Procedimento de rollback
  - Backup de environment variables
  - Backup de código (Git já faz)
- [ ] **Incident Response**:
  - Runbook para problemas comuns
  - Contatos de emergência

**Scripts a criar**:
- `scripts/backup-db.ts`
- `scripts/restore-db.ts`
- `INCIDENT_RESPONSE.md`

**Benefício**: Recuperação rápida de falhas

---

### Sprint 9 - Documentação & Onboarding (2-3 dias) 📚

**Objetivo**: Documentação completa para usuários e desenvolvedores

#### 1. Documentação de Usuário (1 dia)
**Prioridade**: Média

**O que criar**:
- [ ] **Help Center** (in-app):
  - Como adicionar leads manualmente
  - Como usar filtros
  - Como exportar dados
  - FAQ
- [ ] **Video Tutorials**:
  - Onboarding (5 min)
  - Features principais (10 min)
- [ ] **Tooltips** contextuais (em features complexas)

**Arquivos a criar**:
- `app/(dashboard)/dashboard/help/page.tsx`
- `components/ui/tooltip-help.tsx`

---

#### 2. Documentação Técnica (1 dia)
**Prioridade**: Baixa (mas importante)

**O que criar**:
- [ ] API Documentation (Swagger/OpenAPI)
- [ ] Architecture Diagram (C4 Model)
- [ ] Database Schema Diagram (ERD)
- [ ] Contributing Guide
- [ ] Code Style Guide

**Arquivos a criar**:
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CONTRIBUTING.md`

---

#### 3. Onboarding Interativo (1 dia)
**Prioridade**: Baixa

**O que implementar**:
- [ ] Tour guiado no primeiro login (Intro.js ou Shepherd.js)
- [ ] Checklist de setup:
  - ✅ Configure scraping
  - ✅ Adicione primeiro lead
  - ✅ Conecte CRM
  - ✅ Convide time
- [ ] Sample data para explorar

**Benefício**: Usuários entendem produto 3x mais rápido

---

## 📊 Resumo dos Sprints

| Sprint | Foco | Duração | Prioridade | Status |
|--------|------|---------|------------|--------|
| Sprint 1 | Estabilização | 5-8 dias | Crítica | ✅ Completo |
| Sprint 2 | Qualidade de Dados | 5-7 dias | Crítica | ✅ Completo |
| Sprint 3 | UX & Features | 5-7 dias | Alta | 🔄 Próximo |
| Sprint 4 | Analytics & Insights | 3-5 dias | Alta | ⏳ Pendente |
| Sprint 5 | Integrações & Automação | 4-6 dias | Alta | ⏳ Pendente |
| Sprint 6 | Performance & Escalabilidade | 3-5 dias | Média | ⏳ Pendente |
| Sprint 7 | Segurança & Compliance | 3-4 dias | Crítica | ⏳ Pendente |
| Sprint 8 | DevOps & Deploy | 2-3 dias | Alta | ⏳ Pendente |
| Sprint 9 | Documentação & Onboarding | 2-3 dias | Média | ⏳ Pendente |

**Total estimado**: 32-48 dias (~6-10 semanas)

---

## 🎯 Mínimo Viável para Produção (MVP Launch)

Se quiser lançar mais rápido, este é o **mínimo necessário**:

### Obrigatório (Não pode ir pra produção sem isso):
- ✅ Sprint 1 - Estabilização (**COMPLETO**)
- ✅ Sprint 2 - Qualidade de Dados (**COMPLETO**)
- 🔄 Sprint 3 (parcial) - Apenas filtros básicos + bulk actions (2 dias)
- 🔄 Sprint 7 - Segurança & Compliance (4 dias)
- 🔄 Sprint 8 - DevOps & Deploy (3 dias)

**Total MVP**: ~9 dias adicionais

### Recomendado (para lançamento sólido):
- Adicionar Sprint 4 (Analytics) - 3 dias
- Adicionar Sprint 5 (Integração HubSpot) - 2 dias

**Total Recomendado**: ~14 dias adicionais

---

## 🚀 Estratégia de Lançamento

### Fase 1: Beta Fechado (2 semanas)
- MVP Launch (Sprints 1, 2, 3 parcial, 7, 8)
- 5-10 clientes beta
- Coletar feedback intenso
- Corrigir bugs críticos

### Fase 2: Beta Aberto (1 mês)
- Adicionar Sprints 4 e 5
- 50-100 clientes
- Melhorar baseado em métricas de uso
- Adicionar features mais pedidas

### Fase 3: Produção (Ongoing)
- Adicionar Sprints 6 e 9
- Escalar para 1000+ clientes
- Iteração contínua

---

## 💡 Próximos Passos

**Você tem 3 opções:**

### Opção 1: MVP Rápido (Recomendado) 🏃
Completar apenas o essencial e lançar em 2 semanas:
- Sprint 3 (parcial) - 2 dias
- Sprint 7 - 4 dias
- Sprint 8 - 3 dias

**Resultado**: Sistema funcional em produção em 9 dias úteis

### Opção 2: Lançamento Sólido 🎯
Adicionar analytics e integrações:
- Sprint 3 (parcial) - 2 dias
- Sprint 4 - 3 dias
- Sprint 5 (HubSpot) - 2 dias
- Sprint 7 - 4 dias
- Sprint 8 - 3 dias

**Resultado**: Sistema robusto em 14 dias úteis

### Opção 3: Produção Completa 🚀
Fazer todos os sprints:
- Sprints 3-9 completos
- **Resultado**: Sistema enterprise-grade em 6-10 semanas

---

**Qual caminho você quer seguir?**

1. MVP Rápido (Sprint 3 parcial + 7 + 8)
2. Lançamento Sólido (Sprint 3 + 4 + 5 parcial + 7 + 8)
3. Produção Completa (Todos sprints)
4. Focar em algo específico primeiro
