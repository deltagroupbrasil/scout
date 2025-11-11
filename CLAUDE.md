# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LeapScout is a B2B lead intelligence system that automates prospecting for companies hiring in Controladoria (controllership) and BPO Financial roles. It scrapes job listings, enriches company data, generates AI insights, and provides a CRM dashboard.

## Essential Commands

### Development
```bash
npm run dev              # Start Next.js dev server (http://localhost:3000)
npm run build            # Production build
npm run lint             # Run ESLint
```

### Database
```bash
npx prisma db push       # Sync schema to database (dev, no migrations)
npx prisma migrate dev   # Create and apply migration
npx prisma generate      # Regenerate Prisma Client
npx prisma studio        # Open database GUI
npm run db:seed          # Seed database with example data
```

### Testing & Scripts
```bash
npx tsx scripts/test-ai-insights.ts           # Test Claude AI integration
npx tsx scripts/regenerate-leads-with-ai.ts   # Regenerate lead insights with AI
```

### API Testing
```bash
# Test manual scraping
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{"query": "Controller São Paulo"}'

# Test cron job (requires CRON_SECRET in dev)
curl http://localhost:3000/api/cron/scrape-leads
```

## Architecture

### Data Flow: Lead Generation Pipeline

The core value proposition is automated lead enrichment through this pipeline:

```
LinkedIn Job (Bright Data)
  → CNPJ Identification
  → Company Enrichment (BrasilAPI - Receita Federal)
  → AI Insights Generation (Claude API)
  → Email Enrichment (Hunter.io)
  → Save to Database
```

Orchestrated by: `lib/services/lead-orchestrator.ts`

### Service Layer Architecture

All external API integrations are abstracted in `lib/services/`:

- **`linkedin-scraper.ts`**: Bright Data API wrapper (base implementation, requires API key)
- **`company-enrichment.ts`**: BrasilAPI integration for CNPJ data (functional, free)
- **`ai-insights.ts`**: Claude AI for generating suggested contacts and approach triggers (functional)
- **`email-finder.ts`**: Hunter.io integration for corporate emails (configured, 50 searches/month)
- **`lead-orchestrator.ts`**: Coordinates entire pipeline, handles errors, manages API rate limits

**Key Pattern**: Each service is a class with singleton export. Services handle their own API keys from environment variables and gracefully degrade if keys are missing.

### Authentication & Session Management

- **NextAuth v4** (not v5 beta) with credentials provider
- Session strategy: JWT (no database sessions)
- Protected routes use `getServerSession(authOptions)` in layouts
- Auth config: `lib/auth.ts`
- Route handler: `app/api/auth/[...nextauth]/route.ts`

### Database Architecture

**SQLite for development**, PostgreSQL for production (Prisma handles both).

**Core Models**:
- `User` → `Note` (many notes per user)
- `Company` → `Lead` (one company, many leads/jobs)
- `Lead` → `Note` (many notes per lead)
- `ScrapeLog` (standalone, tracks cron job executions)

**Critical Fields**:
- `Lead.suggestedContacts`: JSON string (Array of contact objects with name, role, email, linkedin)
- `Lead.triggers`: JSON string (Array of approach trigger strings)
- `Lead.status`: Enum (NEW, CONTACTED, QUALIFIED, DISCARDED)
- `Lead.isNew`: Boolean flag for leads < 48 hours

**Why JSON strings**: SQLite doesn't have native JSON type. When migrating to PostgreSQL, change these to `Json` type in schema.

### Route Organization

Next.js 14 App Router with route groups:

- `app/(auth)/` - Public routes (login, password reset)
- `app/(dashboard)/` - Protected routes, checked in layout
- `app/api/` - API routes

**API Routes Structure**:
```
/api/leads         GET (list with filters),
/api/leads/[id]    GET (detail), PATCH (update status)
/api/notes         POST (create note)
/api/scrape        POST (manual scraping trigger)
/api/cron/scrape-leads  GET (automated daily scraping, 6am via Vercel Cron)
```

### Environment Variables

Required for full functionality:
```
DATABASE_URL           # SQLite: file:./dev.db, Postgres: postgresql://...
NEXTAUTH_URL           # http://localhost:3000 (prod: your domain)
NEXTAUTH_SECRET        # Min 32 chars, generate with: openssl rand -base64 32
CRON_SECRET            # Protects cron endpoint
CLAUDE_API_KEY         # Anthropic API key (claude-3-5-haiku-20241022)
HUNTER_IO_API_KEY      # Hunter.io for email finding
BRIGHT_DATA_API_KEY    # Optional, for LinkedIn scraping
```

## Critical Implementation Details

### AI Insights Generation

The Claude API integration (`lib/services/ai-insights.ts`) uses a carefully crafted prompt to generate Brazilian-realistic contact names and contextual triggers.

**Model**: `claude-3-5-haiku-20241022` (cheaper, works well)
**Fallback**: If API fails, returns generic insights based on job title pattern matching.

The AI response is parsed as JSON. If parsing fails, falls back to defaults. Always test with `scripts/test-ai-insights.ts` after modifying the prompt.

### Cron Job Configuration

Automated scraping configured in `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/scrape-leads",
    "schedule": "0 6 * * *"
  }]
}
```

In development, call the endpoint manually. In production on Vercel, it runs automatically at 6am daily. The endpoint checks `Authorization: Bearer ${CRON_SECRET}` header (skipped in dev).

### CNPJ Enrichment

BrasilAPI (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) is free and functional. The service (`company-enrichment.ts`) estimates revenue and employees from returned `capital_social` and `porte` fields using heuristics.

**Important**: CNPJ must be 14 digits, no formatting. Clean with `cnpj.replace(/\D/g, '')`.

### Lead Status Management

Status transitions are managed client-side (no validation). Expected flow:
```
NEW → CONTACTED → QUALIFIED
                → DISCARDED (can happen at any stage)
```

The `isNew` flag is set to `false` when status changes, preventing the "NEW" badge from persisting after first interaction.

## Common Pitfalls

1. **Prisma Client out of sync**: After schema changes, run `npx prisma generate`. If dev server is running, restart it.

2. **JSON parsing in leads**: Always use `JSON.parse()` on `suggestedContacts` and `triggers`. They're stored as strings in SQLite.

3. **NextAuth session types**: Custom types are in `types/next-auth.d.ts`. Make sure session.user.id exists in callbacks.

4. **Port conflicts**: If port 3000 is busy, use `npx kill-port 3000` before `npm run dev`.

5. **Database locks**: SQLite locks on concurrent writes. If Prisma Client hangs during generate/migrate, stop dev server first.

## Development Workflow

### Adding a New External API Integration

1. Create service class in `lib/services/your-service.ts`
2. Follow singleton pattern: `export const yourService = new YourService()`
3. Handle missing API keys gracefully (console.warn, return null/fallback)
4. Add to `lead-orchestrator.ts` pipeline if part of lead enrichment
5. Add environment variable to `.env.example`
6. Document in `API_DOCS.md`

### Adding a New API Endpoint

1. Create route handler in `app/api/your-route/route.ts`
2. Check authentication with `getServerSession(authOptions)` if protected
3. Return `NextResponse.json()` with consistent error format: `{ error: string }`
4. Add TypeScript types in `types/index.ts` if needed

### Modifying the Data Model

1. Update `prisma/schema.prisma`
2. Run `npx prisma db push` (dev) or `npx prisma migrate dev --name your_migration` (prod)
3. Regenerate client: `npx prisma generate`
4. Update TypeScript types in `types/index.ts` if exposing via API
5. Update seed script if needed: `prisma/seed.ts`

## Documentation

- **README.md** - General overview and setup
- **API_DOCS.md** - Complete API reference, external API setup guides
- **QUICKSTART.md** - Fast getting started guide
- **SETUP.md** - Detailed installation instructions
