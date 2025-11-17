# 🚀 MVP Rápido - Guia de Implementação

## ✅ O Que Já Está Pronto

### Sprint 1 & 2 - COMPLETO ✅
- ✅ PostgreSQL com JSON nativo
- ✅ Validação de emails (DNS + disposable check)
- ✅ Validação de telefones brasileiros
- ✅ Retry logic + Circuit breakers
- ✅ Error tracking (Sentry)
- ✅ Deduplicação de empresas
- ✅ Cache de enriquecimento
- ✅ 68+ testes unitários

### Sprint 3 Parcial - EM ANDAMENTO 🔄
- ✅ **Filtros avançados implementados**:
  - Receita (6 faixas)
  - Funcionários (5 faixas)
  - Prioridade (5 níveis)
  - Fonte (LinkedIn, Gupy, Catho, etc)
  - Setor (8 categorias)

**Arquivo criado**: `components/dashboard/advanced-filters.tsx`
**API atualizada**: `app/api/leads/route.ts` com todos filtros

---

## 📋 Tarefas Restantes para MVP (6 dias) 🔥

### ~~DIA 1-2~~: Finalizar Sprint 3 ✅ COMPLETO
- [x] **Bulk Actions** (CONCLUÍDO):
  - ✅ Checkbox multi-seleção
  - ✅ Atualizar status em massa
  - ✅ Atribuir em massa
  - ✅ Exportar selecionados para CSV
  - ✅ Soft delete (marcar como DISCARDED)
  - ✅ Arquivo criado: `components/dashboard/bulk-actions-bar.tsx`
  - ✅ API criada: `PATCH /api/leads/bulk`
  - ✅ Toast notifications com Sonner
  - **Ver**: `BULK_ACTIONS_IMPLEMENTADO.md` para detalhes

### DIA 3-4: Segurança Básica
- [ ] **2FA** (1 dia):
  - TOTP com qrcode
  - Backup codes
  - Lib: `@otplib/preset-default`
- [ ] **RBAC** (1 dia):
  - Roles: Admin, Manager, Salesperson
  - Middleware de permissões
  - Model: Adicionar `role` no User

### DIA 5-6: LGPD Compliance
- [ ] **Consentimento** (1 dia):
  - Termos de uso + aceite
  - Model: `ConsentLog`
- [ ] **Direitos do Titular** (1 dia):
  - Exportar dados (JSON)
  - Deletar conta
  - API: `GET/DELETE /api/gdpr/me`

### DIA 7: CI/CD
- [ ] **GitHub Actions**:
  - `.github/workflows/ci.yml` (testes)
  - `.github/workflows/deploy.yml` (Vercel)
  - Smoke tests

### DIA 8: Deploy & Monitoring
- [ ] **Sentry** (já configurado, só ativar)
- [ ] **Uptime Robot** (configurar ping)
- [ ] **Vercel Deploy** (conectar repo)

---

## 🚀 Quick Commands

```bash
# Desenvolvimento
npm run dev
npm run test
npx prisma studio

# Produção
npm run build
npm start

# Manutenção
npx tsx scripts/deduplicate-companies.ts --auto
npx tsx scripts/maintain-cache.ts --cleanup
```

---

## 🎯 Checklist de Deploy

### Pré-Deploy
- [ ] Todos testes passando (`npm run test`)
- [ ] Build sem erros (`npm run build`)
- [ ] Database migrado para PostgreSQL
- [ ] Variáveis de ambiente configuradas
- [ ] Sentry DSN configurado

### Deploy
- [ ] Conectar repositório no Vercel
- [ ] Configurar environment variables
- [ ] Deploy preview (teste em staging)
- [ ] Deploy production

### Pós-Deploy
- [ ] Smoke test (endpoints críticos funcionam)
- [ ] Configurar Uptime Robot
- [ ] Testar LGPD (export + delete)
- [ ] Testar autenticação

---

## 📦 Dependências Pendentes

```bash
# Para 2FA
npm install @otplib/preset-default qrcode

# Para Charts (Analytics futuro)
npm install recharts

# Para PDF (Relatórios futuro)
npm install jspdf
```

---

## 🔑 Environment Variables Críticas

```env
# Essenciais para MVP
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://seu-dominio.com"
SENTRY_DSN="..."
NEXT_PUBLIC_SENTRY_DSN="..."

# Scraping (pode começar sem)
BRIGHT_DATA_PUPPETEER_URL="..."
BRIGHT_DATA_WEB_UNLOCKER_URL="..."

# AI (pode começar sem)
CLAUDE_API_KEY="..."

# Enrichment (importante)
NOVA_VIDA_TI_USUARIO="..."
NOVA_VIDA_TI_SENHA="..."
NOVA_VIDA_TI_CLIENTE="..."
```

---

## 🎓 Próximos Passos Após MVP

Uma vez em produção, priorize:

1. **Sprint 4 - Analytics** (3 dias)
   - Dashboard com métricas
   - Gráficos de conversão

2. **Sprint 5 - HubSpot Integration** (2 dias)
   - Sincronização bidirecional
   - Auto-sync de status

3. **Sprint 6 - Performance** (3 dias)
   - Redis cache
   - Background jobs (BullMQ)

---

## 💡 Dicas

### Performance
- Use `npm run build` localmente antes de deployar
- Test em preview environment primeiro
- Monitor Sentry para erros em produção

### Segurança
- Nunca commitar `.env`
- Usar secrets do Vercel para env vars
- Rotate API keys regularmente

### Dados
- Backup manual do DB antes de migrations grandes
- Test deduplicação em staging primeiro
- Monitor custos Nova Vida TI

---

**MVP Launch em 8 dias úteis! 🎉**

Continue de onde paramos chamando: **"Continuar Sprint 3"**
