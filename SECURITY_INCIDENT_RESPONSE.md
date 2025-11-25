# 🚨 INCIDENTE DE SEGURANÇA - API KEYS EXPOSTAS

**Data**: 2025-01-24
**Severidade**: CRÍTICA
**Status**: AÇÃO IMEDIATA NECESSÁRIA

## 📋 Resumo

Múltiplos arquivos com API keys e credenciais de produção foram commitados e pushados para o repositório GitHub público `deltagroupbrasil/scout.git`.

## 🔴 API KEYS E CREDENCIAIS COMPROMETIDAS

### 1. Claude API (Anthropic)
- **Key**: `sk-ant-api03-M3zowUzs-i...` (parcialmente ocultada)
- **Ação**: REVOGAR IMEDIATAMENTE
- **Como**: https://console.anthropic.com/ → Settings → API Keys → Revoke → Generate New

### 2. Bright Data (múltiplas keys)
- **SERP Key**: `eaa8204358199b680e57a721be02c161468cc57ad08a550e7aa219f1cbbc42e3`
- **Web Unlocker Key**: `eaa8204358199b680e57a721be02c161468cc57ad08a550e7aa219f1cbbc42e3`
- **Puppeteer URL**: Contém credenciais no formato `wss://brd-customer-...:senha@...`
- **Ação**: REVOGAR TODAS
- **Como**: https://brightdata.com/ → Zones → Regenerate credentials

### 3. Neon PostgreSQL (Database Completo)
- **Connection String**: `postgresql://neondb_owner:npg_PL4yEHAcdvQ5@ep-calm-meadow-ady4ssjy-pooler...`
- **Contém**: Username, senha, host, database name
- **Ação**: RESETAR SENHA DO DATABASE
- **Como**: Neon Dashboard → Database → Settings → Reset Password

### 4. Apollo.io API
- **Key**: `vzSDiook4Vsnwp1acn09cg`
- **Ação**: Revogar e gerar nova
- **Como**: Apollo.io Dashboard → Settings → API

### 5. Hunter.io API
- **Key**: `4519a60ee0fc5bd046325b1da934145875d0ddad`
- **Ação**: Revogar e gerar nova
- **Como**: Hunter.io Dashboard → API

### 6. Nova Vida TI (Credenciais Completas)
- **Usuário**: `regis@delta-mining.com`
- **Senha**: `F2/!!iY%,w`
- **Cliente**: `DELTACOMPUTACAO`
- **Ação**: TROCAR SENHA IMEDIATAMENTE
- **Como**: Contato direto com Nova Vida TI

### 7. NextAuth Secret
- **Secret**: `sZ1U0dKg9rHILK434GGY/ZJ3UAFyLALO22vw5b8NRvI=`
- **Ação**: Gerar novo secret
- **Como**: `openssl rand -base64 32`

### 8. Cron Secret
- **Secret**: `leapscout-cron-2025-secret`
- **Ação**: Gerar novo secret aleatório

## ✅ AÇÕES JÁ TOMADAS (pelo Claude Code)

1. ✅ Removidos arquivos comprometidos do git tracking:
   - `.claude/settings.local.json`
   - `.env.vercel.final`
   - `.env.vercel.production`
   - `.env.vercel.check`
   - `.env.download`

2. ✅ Atualizado `.gitignore` para prevenir futuras exposições:
   ```gitignore
   .env.*
   .env.vercel.*
   .claude/settings.local.json
   ```

## ⚠️ AÇÕES NECESSÁRIAS (pelo usuário)

### Passo 1: TROCAR TODAS AS KEYS IMEDIATAMENTE (próximos 10 minutos)

Siga a lista acima e troque TODAS as keys e credenciais. Não pule nenhuma!

### Passo 2: Atualizar Vercel Production

Após gerar novas keys:

```bash
# Atualizar cada variável no Vercel
vercel env rm CLAUDE_API_KEY production
vercel env add CLAUDE_API_KEY production
# (colar nova key quando solicitado)

# Repetir para cada variável:
# - BRIGHT_DATA_SERP_KEY
# - BRIGHT_DATA_UNLOCKER_KEY
# - BRIGHT_DATA_PUPPETEER_URL
# - DATABASE_URL
# - APOLLO_API_KEY
# - HUNTER_IO_API_KEY
# - NEXTAUTH_SECRET
# - CRON_SECRET
# - NOVA_VIDA_TI_SENHA
```

### Passo 3: Atualizar .env.local (desenvolvimento)

Criar/atualizar `.env.local` com as novas keys (este arquivo NÃO será commitado):

```bash
CLAUDE_API_KEY="nova-key-aqui"
BRIGHT_DATA_SERP_KEY="nova-key-aqui"
# ... etc
```

### Passo 4: Limpar Histórico do Git (CRÍTICO)

As keys antigas ainda existem no histórico do git. Use BFG Repo-Cleaner:

```bash
# 1. Fazer backup do repositório
cd ..
cp -r leapscout leapscout-backup

# 2. Baixar BFG Repo Cleaner
# https://rtyley.github.io/bfg-repo-cleaner/

# 3. Criar arquivo com paths a remover
echo ".claude/settings.local.json" > files-to-remove.txt
echo ".env.vercel.final" >> files-to-remove.txt
echo ".env.vercel.production" >> files-to-remove.txt
echo ".env.vercel.check" >> files-to-remove.txt
echo ".env.download" >> files-to-remove.txt

# 4. Executar BFG
java -jar bfg.jar --delete-files files-to-remove.txt leapscout

# 5. Limpar reflog e forçar garbage collection
cd leapscout
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 6. Force push (CUIDADO!)
git push origin --force --all
git push origin --force --tags
```

**⚠️ IMPORTANTE**: Force push irá reescrever o histórico do GitHub. Avise todos os colaboradores para fazer um novo `git clone` do repositório!

### Passo 5: Verificar Logs de Acesso

Verifique se houve acessos não autorizados:

1. **Anthropic Console**: https://console.anthropic.com/ → Usage
2. **Bright Data**: Dashboard → Activity Logs
3. **Neon**: Database → Logs
4. **Vercel**: Settings → Logs
5. **GitHub**: Settings → Security Log

### Passo 6: Notificar Stakeholders

Se detectar acesso não autorizado:
- Notificar clientes afetados
- Revisar dados acessados
- Considerar rotação de senhas de usuários

## 📚 Lições Aprendidas

### O que NÃO fazer:
❌ Nunca commitar arquivos `.env` com valores reais
❌ Nunca commitar arquivos de configuração com API keys
❌ Nunca usar API keys diretamente em código

### O que FAZER:
✅ Sempre usar `.env.local` para desenvolvimento (não commitado)
✅ Usar Vercel Environment Variables para produção
✅ Revisar `.gitignore` antes do primeiro commit
✅ Usar `git secrets` ou pre-commit hooks para prevenir exposição
✅ Rotacionar keys regularmente (a cada 90 dias)

## 🔒 Medidas Preventivas Futuras

### 1. Instalar git-secrets

```bash
# Instalar git-secrets
brew install git-secrets  # macOS
# ou baixar do GitHub: https://github.com/awslabs/git-secrets

# Configurar no repositório
cd leapscout
git secrets --install
git secrets --register-aws

# Adicionar patterns customizados
git secrets --add 'sk-ant-api03-[A-Za-z0-9_-]+'
git secrets --add 'postgresql://[^@]+:[^@]+@[^/]+'
git secrets --add 'wss://brd-customer-[^@]+:[^@]+@'
```

### 2. Pre-commit Hook

Criar `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Verificar se há API keys antes de commitar

if git diff --cached --name-only | grep -qE '\.env|settings.*\.json'; then
    echo "❌ BLOCKED: Tentativa de commitar arquivo com possíveis secrets!"
    echo "Arquivos bloqueados:"
    git diff --cached --name-only | grep -E '\.env|settings.*\.json'
    exit 1
fi

# Verificar patterns de API keys no código
if git diff --cached | grep -qE 'sk-ant-api03-|postgresql://.*:.*@|wss://.*:.*@'; then
    echo "❌ BLOCKED: API key detectada no código!"
    exit 1
fi

exit 0
```

### 3. Revisar .gitignore Regularmente

Adicionar ao processo de code review:
- Verificar que nenhum arquivo sensível foi commitado
- Validar que `.gitignore` está atualizado
- Usar ferramentas como `truffleHog` para escanear histórico

## 📞 Contatos de Emergência

- **Anthropic Support**: support@anthropic.com
- **Bright Data Support**: Via dashboard
- **Neon Support**: Via dashboard
- **GitHub Security**: security@github.com

---

**Criado em**: 2025-01-24
**Última atualização**: 2025-01-24
**Criado por**: Claude Code (Security Audit)
