# 🚀 LeapScout - Quickstart Guide

## ✅ Status Atual

**Servidor rodando em:** http://localhost:3000

### 🎉 O que está funcionando:

- ✅ **Claude AI** - Gerando insights reais com IA!
- ✅ **Hunter.io** - Configurado para buscar e-mails
- ✅ **BrasilAPI** - Busca de CNPJs funcional (grátis)
- ✅ **Dashboard** - 100% funcional
- ✅ **Sistema de notas** - Funcionando
- ✅ **Filtros e busca** - OK

---

## 📋 Acesso Rápido

**Login:** http://localhost:3000/login

```
Email: admin@leapsolutions.com.br
Senha: admin123
```

---

## 🤖 APIs Configuradas

### ✅ Claude AI (Anthropic)
- **Status:** ✅ FUNCIONANDO
- **Modelo:** claude-3-5-haiku-20241022
- **Uso:** Geração de decisores e gatilhos

**Teste:**
```bash
cd leapscout
npx tsx scripts/test-ai-insights.ts
```

### ✅ Hunter.io
- **Status:** ✅ CONFIGURADO
- **Limite:** 50 buscas/mês
- **Uso:** Buscar e-mails corporativos

### ✅ BrasilAPI (Receita Federal)
- **Status:** ✅ FUNCIONANDO
- **Custo:** GRÁTIS
- **Uso:** Buscar dados de CNPJ

### ⏳ Bright Data
- **Status:** ⏳ Não disponível no momento
- **Alternativa:** Usar scraping manual via `/api/scrape`

---

## 📊 Dados Atuais

### Empresas no Sistema:
1. **Ambev S.A.** (com IA real)
   - Decisores gerados por Claude AI
   - Gatilhos contextualizados

---

## 🔧 Scripts Úteis

### Testar Claude AI
```bash
npx tsx scripts/test-ai-insights.ts
```

### Regenerar insights com IA
```bash
npx tsx scripts/regenerate-leads-with-ai.ts
```

### Ver dados no Prisma Studio
```bash
npm run db:studio
```

### Rodar seed novamente
```bash
npm run db:seed
```

---

## 🎯 Próximos Passos

### 1. Testar Dashboard
- Acesse: http://localhost:3000
- Faça login
- Veja o lead da Ambev com insights de IA real!

### 2. Adicionar Mais Leads
Rode o seed para adicionar mais empresas:
```bash
# Resetar banco e adicionar tudo de novo
npx prisma migrate reset --force
npm run db:seed
npx tsx scripts/regenerate-leads-with-ai.ts
```

### 3. Deploy na Vercel
Quando estiver pronto:
```bash
git init
git add .
git commit -m "LeapScout MVP completo"
git push origin main
```

Depois:
1. Conecte ao Vercel
2. Adicione variáveis de ambiente
3. Deploy automático!

---

## 💡 Dicas

### Ver logs do servidor
O servidor está rodando em background. Para ver logs:
```bash
# O servidor já está rodando
# Acesse http://localhost:3000
```

### Testar API de Scraping Manual
```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"query": "Controller São Paulo"}'
```

### Ver estrutura do banco
```bash
npx prisma studio
# Abre interface visual do banco
```

---

## 🐛 Problemas Comuns

### Porta 3000 em uso
```bash
cd leapscout
npx kill-port 3000
npm run dev
```

### Erro no Prisma
```bash
npx prisma generate
npx prisma db push
```

### Reset completo
```bash
rm prisma/dev.db
npx prisma db push
npm run db:seed
```

---

## 📚 Documentação Completa

- **README.md** - Documentação geral
- **API_DOCS.md** - Documentação das APIs
- **SETUP.md** - Guia de instalação detalhado

---

## 🎉 Status Final

✅ **MVP 100% Funcional**
✅ **IA Real Funcionando** (Claude API)
✅ **Hunter.io Configurado**
✅ **BrasilAPI OK**
✅ **Dashboard Completo**
✅ **Pronto para Deploy**

**Última atualização:** 11/11/2025
