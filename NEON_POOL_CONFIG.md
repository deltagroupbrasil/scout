# Configuração de Connection Pooling - Neon PostgreSQL

## ⚠️ IMPORTANTE: Configurar no Vercel Environment Variables

Para otimizar o connection pooling no Neon PostgreSQL, adicione os seguintes parâmetros na variável `DATABASE_URL` no **Vercel Dashboard** (Settings → Environment Variables):

```
DATABASE_URL="postgresql://neondb_owner:npg_PL4yEHAcdvQ5@ep-calm-meadow-ady4ssjy-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&connection_limit=10&pool_timeout=30&connect_timeout=15"
```

## Parâmetros Adicionados:

- **`connection_limit=10`**: Máximo de 10 conexões por instância serverless (evita esgotar o pool do Neon Free tier que tem limite de 100 conexões)
- **`pool_timeout=30`**: Aguardar até 30s por uma conexão disponível antes de falhar
- **`connect_timeout=15`**: Timeout de 15s para estabelecer conexão inicial

## Por que não está em .env.production?

O arquivo `.env.production` é para desenvolvimento local simulando produção. As credenciais reais devem estar **apenas no Vercel Environment Variables** por segurança.

## Benefícios:

✅ Reduz "connection pool exhausted" errors
✅ Melhora performance em cargas altas
✅ Previne "too many connections" no Neon
✅ Otimizado para Vercel Serverless (cold starts)

## Como verificar se está funcionando:

```bash
vercel logs --since 10m | grep "connection"
```

Não deve aparecer erros de "too many connections" ou "connection timeout".
