# 🚀 Guia de Setup - LeapScout

## Setup Rápido (5 minutos)

### 1. Pré-requisitos

Certifique-se de ter instalado:
- ✅ Node.js 20+ ([Download](https://nodejs.org/))
- ✅ PostgreSQL 14+ ([Download](https://www.postgresql.org/download/))
- ✅ Git

### 2. Configuração do Banco de Dados

#### Opção A: PostgreSQL Local

1. Crie o banco de dados:
```bash
psql -U postgres
CREATE DATABASE leapscout;
\q
```

2. Atualize o `.env`:
```env
DATABASE_URL="postgresql://postgres:sua-senha@localhost:5432/leapscout?schema=public"
```

#### Opção B: Supabase (Recomendado para Deploy)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um novo projeto
3. Vá em Settings > Database > Connection String
4. Copie a Connection String (modo Transaction)
5. Atualize o `.env`:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres"
```

### 3. Instalação

```bash
# 1. Entre na pasta do projeto
cd leapscout

# 2. Instale dependências
npm install

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# 4. Execute migrations do Prisma
npx prisma migrate dev --name init

# 5. Popule o banco com dados de exemplo
npm run db:seed

# 6. Inicie o servidor
npm run dev
```

### 4. Acesso

- **URL**: http://localhost:3000
- **Email**: admin@leapsolutions.com.br
- **Senha**: admin123

## 🔧 Comandos Úteis

### Banco de Dados
```bash
# Ver dados no Prisma Studio (UI visual)
npm run db:studio

# Criar nova migration
npm run db:migrate

# Sync schema sem migration (dev)
npm run db:push

# Re-popular banco
npm run db:seed

# Resetar banco de dados
npx prisma migrate reset
```

### Desenvolvimento
```bash
# Iniciar servidor dev
npm run dev

# Build de produção
npm run build

# Rodar produção local
npm run build && npm start

# Linting
npm run lint
```

## 🐛 Troubleshooting

### Erro: "Environment variable not found: DATABASE_URL"

**Solução**: Crie o arquivo `.env` na raiz:
```bash
cp .env.example .env
```
Edite o arquivo com suas credenciais.

### Erro: "connect ECONNREFUSED 127.0.0.1:5432"

**Causa**: PostgreSQL não está rodando.

**Solução**:
- Windows: Inicie o serviço PostgreSQL no Services
- Mac: `brew services start postgresql`
- Linux: `sudo systemctl start postgresql`

### Erro: "prisma migrate dev" falha

**Solução**:
```bash
# Limpe e recrie o banco
npx prisma migrate reset
npx prisma migrate dev --name init
npm run db:seed
```

### Erro: "Invalid `prisma.user.create()`"

**Causa**: Prisma Client desatualizado.

**Solução**:
```bash
npx prisma generate
```

### Página de login não carrega estilos

**Solução**: Limpe o cache do Next.js:
```bash
rm -rf .next
npm run dev
```

## 📦 Estrutura de Pastas

```
leapscout/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Rotas de autenticação
│   │   └── login/         # Página de login
│   ├── (dashboard)/       # Rotas protegidas
│   ├── api/               # API Routes
│   └── layout.tsx         # Layout raiz
├── components/            # Componentes React
│   ├── ui/               # Componentes shadcn/ui
│   └── providers/        # Context providers
├── lib/                  # Utilitários
│   ├── auth.ts          # Configuração NextAuth
│   └── prisma.ts        # Prisma client
├── prisma/              # Schema e migrations
│   ├── schema.prisma    # Modelo de dados
│   └── seed.ts          # Dados iniciais
├── types/               # TypeScript types
├── .env                 # Variáveis de ambiente (não commitar!)
└── .env.example         # Template de variáveis
```

## 🌐 Deploy em Produção

### Deploy no Vercel

1. Faça push para GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/seu-usuario/leapscout.git
git push -u origin main
```

2. Importe no Vercel:
   - Acesse [vercel.com](https://vercel.com)
   - New Project > Import do GitHub
   - Selecione o repositório

3. Configure variáveis de ambiente no Vercel:
   - Settings > Environment Variables
   - Adicione todas as variáveis do `.env`
   - **IMPORTANTE**: Mude `NEXTAUTH_SECRET` para um valor seguro:
     ```bash
     openssl rand -base64 32
     ```

4. Deploy automático:
   - Vercel detecta automaticamente Next.js
   - Build e deploy acontecem automaticamente

### Configurar Supabase

1. No dashboard do Supabase:
   - Copie a Connection String
   - Cole como `DATABASE_URL` no Vercel

2. Execute migrations remotamente:
```bash
# Com a DATABASE_URL do Supabase no .env
npx prisma db push
npm run db:seed
```

## 🔐 Segurança

### Antes de ir para produção:

1. ✅ Mude `NEXTAUTH_SECRET` para valor aleatório seguro
2. ✅ Use uma database URL de produção (não localhost)
3. ✅ Adicione `.env` ao `.gitignore` (já feito)
4. ✅ Remova o usuário admin padrão ou mude a senha
5. ✅ Configure rate limiting nas APIs

### Gerar NEXTAUTH_SECRET seguro:
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# OpenSSL
openssl rand -base64 32
```

## 📞 Suporte

Encontrou um problema?

1. Consulte a seção [Troubleshooting](#-troubleshooting)
2. Veja as [Issues no GitHub](https://github.com/seu-usuario/leapscout/issues)
3. Entre em contato: dev@leapsolutions.com.br

---

**Bom desenvolvimento! 🎉**
