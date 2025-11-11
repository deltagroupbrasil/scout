# 🚀 LeapScout MVP

Sistema de Inteligência de Leads B2B para Controladoria e BPO Financeiro.

## 📋 Visão Geral

LeapScout é uma plataforma automatizada de prospecção B2B que identifica empresas qualificadas (faturamento >R$ 1M) contratando para áreas de Controladoria e BPO Financeiro, com enriquecimento inteligente de dados para facilitar abordagem comercial.

## ✨ Funcionalidades MVP

- ✅ **Captação Automatizada**: Scraping diário de vagas no LinkedIn
- ✅ **Enriquecimento de Dados**: CNPJ, faturamento, decisores e gatilhos via IA
- ✅ **Dashboard de Leads**: Visualização e filtros avançados
- ✅ **CRM Simplificado**: Status, notas e histórico de interações
- ✅ **Autenticação**: Login seguro com NextAuth

## 🛠️ Stack Tecnológica

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS** + **shadcn/ui**
- **React Query** (cache)

### Backend
- **Next.js API Routes** (serverless)
- **Prisma ORM**
- **PostgreSQL**
- **NextAuth.js**

### APIs Externas
- **Bright Data** - Scraping LinkedIn
- **Claude API** - Insights via IA
- **Receita Federal** - Dados de CNPJ
- **Hunter.io** - E-mails corporativos

## 🚀 Começando

### Pré-requisitos

- Node.js 20+
- PostgreSQL 14+
- npm ou yarn

### Instalação

1. Clone o repositório (ou navegue até a pasta):
```bash
cd leapscout
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/leapscout"
NEXTAUTH_SECRET="sua-chave-secreta-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

4. Execute as migrations do Prisma:
```bash
npx prisma migrate dev --name init
```

5. (Opcional) Crie um usuário inicial:
```bash
npx prisma db seed
```

6. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 📁 Estrutura do Projeto

```
leapscout/
├── app/
│   ├── (auth)/
│   │   └── login/          # Página de login
│   ├── (dashboard)/
│   │   ├── dashboard/      # Dashboard principal
│   │   └── leads/[id]/     # Detalhes do lead
│   ├── api/
│   │   ├── auth/           # NextAuth endpoints
│   │   ├── leads/          # API de leads
│   │   ├── companies/      # API de empresas
│   │   └── notes/          # API de notas
│   └── layout.tsx
├── components/
│   ├── ui/                 # Componentes shadcn/ui
│   └── providers/          # Context providers
├── lib/
│   ├── prisma.ts           # Prisma client
│   └── auth.ts             # NextAuth config
├── prisma/
│   └── schema.prisma       # Database schema
├── types/
│   └── index.ts            # TypeScript types
└── public/
```

## 🗄️ Modelo de Dados

### Principais Modelos

- **User**: Usuários do sistema
- **Company**: Empresas prospectadas
- **Lead**: Oportunidades de negócio
- **Note**: Notas e interações

Ver [schema.prisma](prisma/schema.prisma) para detalhes completos.

## 🔑 Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build
npm start

# Prisma
npx prisma studio          # UI para visualizar dados
npx prisma migrate dev     # Criar migration
npx prisma generate        # Gerar client
npx prisma db push         # Sync schema (dev)

# Linting
npm run lint
```

## 🌐 Deploy

### Vercel (Recomendado)

1. Conecte seu repositório GitHub ao Vercel
2. Configure as variáveis de ambiente no dashboard
3. Deploy automático em cada push

### Supabase (Database)

1. Crie um projeto no [Supabase](https://supabase.com)
2. Copie a Connection String
3. Atualize `DATABASE_URL` no `.env`
4. Execute `npx prisma db push`

## 🔐 Configuração das APIs

### 1. Bright Data (LinkedIn Scraping)

```env
BRIGHT_DATA_API_KEY="sua-chave-api"
```

### 2. Claude API (Anthropic)

```env
CLAUDE_API_KEY="sk-ant-api03-..."
```

### 3. Hunter.io (E-mails)

```env
HUNTER_IO_API_KEY="sua-chave-hunter"
```

## 📊 Roadmap

### ✅ Fase 1 - MVP (4 semanas)
- [x] Setup inicial
- [x] Autenticação
- [ ] Dashboard de leads
- [ ] Página detalhada
- [ ] Sistema de notas
- [ ] Scraping automatizado

### 🔜 Fase 2 (1-2 meses)
- [ ] Scraping Gupy e Catho
- [ ] Exportação CSV
- [ ] Notificações por e-mail
- [ ] Score de prioridade

### 🔮 Fase 3 (3-4 meses)
- [ ] Integração Instagram
- [ ] Busca de eventos
- [ ] Relatórios automáticos
- [ ] Multi-usuário com permissões

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto é privado e confidencial da Leap Solutions.

## 📞 Suporte

Para dúvidas ou problemas:
- Email: dev@leapsolutions.com.br
- Slack: #leapscout-dev

---

**Desenvolvido com ❤️ pela equipe Leap Solutions**
