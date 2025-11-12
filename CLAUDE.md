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
# AI & Enrichment
npx tsx scripts/test-ai-insights.ts           # Test Claude AI integration
npx tsx scripts/regenerate-leads-with-ai.ts   # Regenerate lead insights with AI

# Scraping & APIs
npx tsx scripts/test-linkedin-scraper.ts      # Test LinkedIn scraper (Puppeteer + Bright Data)
npx tsx scripts/test-serp-api.ts              # Test SERP API (Google search)
npx tsx scripts/test-web-unlocker.ts          # Test Web Unlocker (Gupy, Catho, InfoJobs)
npx tsx scripts/test-multi-source-scraping.ts # Test all scrapers together

# Database & Enrichment
npx tsx scripts/recalculate-priority-scores.ts # Recalculate priority scores for all leads
npx tsx scripts/populate-db.ts                 # Populate database with test data
npx tsx scripts/clear-leads.ts                 # Clear all leads and companies from database
npx tsx scripts/check-companies.ts             # Check companies data (CNPJ, revenue, employees)
npx tsx scripts/enrich-companies.ts            # Enrich companies with CNPJ using Receita Federal API
npx tsx scripts/test-cnpj-finder.ts            # Test CNPJ finder service
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

**Scraping Services:**
- **`linkedin-scraper.ts`**: Bright Data Puppeteer for LinkedIn job scraping (real browser automation)
- **`serp-api.ts`**: Bright Data SERP API for Google search results (multi-source discovery)
- **`web-unlocker.ts`**: Bright Data Web Unlocker for Brazilian sites (Gupy, Catho, InfoJobs)
- **`gupy-scraper.ts`**: Mock Gupy scraper (ready for real integration)
- **`catho-scraper.ts`**: Mock Catho scraper (ready for real integration)

**Enrichment Services:**
- **`company-enrichment.ts`**: BrasilAPI integration for CNPJ data (functional, free)
- **`ai-insights.ts`**: Claude AI for generating suggested contacts and approach triggers (functional)
- **`email-finder.ts`**: Hunter.io integration for corporate emails (configured, 50 searches/month)
- **`priority-score.ts`**: Smart priority scoring algorithm (0-100 points)

**Orchestration:**
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
```bash
# Database
DATABASE_URL="file:./dev.db"  # SQLite for dev, PostgreSQL for prod

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
CRON_SECRET="your-cron-secret"

# Bright Data - Scraping APIs
BRIGHT_DATA_PUPPETEER_URL="wss://brd-customer-hl_xxxxx:password@brd.superproxy.io:9222"
BRIGHT_DATA_UNLOCKER_KEY="your-api-key"     # Web Unlocker (Gupy, Catho, InfoJobs)
BRIGHT_DATA_SERP_KEY="your-api-key"         # SERP API (Google search)

# AI & Enrichment
CLAUDE_API_KEY="sk-ant-api03-..."           # Claude AI (insights generation)
HUNTER_IO_API_KEY="your-hunter-key"         # Email finder
```

## Critical Implementation Details

### AI Insights Generation

The Claude API integration (`lib/services/ai-insights.ts`) uses a carefully crafted prompt to generate Brazilian-realistic contact names and contextual triggers.

**Model**: `claude-3-5-haiku-20241022` (cheaper, works well)
**Fallback**: If API fails, returns generic insights based on job title pattern matching.

The AI response is parsed as JSON. If parsing fails, falls back to defaults. Always test with `scripts/test-ai-insights.ts` after modifying the prompt.

### CNPJ Finder & Company Enrichment

The system automatically enriches company data using CNPJ (Brazilian tax ID) lookups via Receita Federal API.

**Implementation**: `lib/services/cnpj-finder.ts` + `lib/services/company-enrichment.ts`

**How it works**:
1. **CNPJ Lookup**: When a new company is found, the system searches for its CNPJ:
   - First checks local database of 30+ known companies (Magazine Luiza, Petrobras, Vale, etc.)
   - Falls back to null if not found (APIs públicas têm rate limiting)

2. **Data Enrichment**: With CNPJ, fetches from Brasil API (Receita Federal):
   - Capital social → Estimated revenue (capital_social × 5)
   - Porte (ME/EPP/DEMAIS) → Estimated employees (10/50/500)
   - CNAE fiscal → Company sector
   - Email domain → Company website

**Rate Limiting**:
- Brasil API: Free, but has rate limits (403/429 errors)
- System includes 3-second delays between requests
- Graceful fallback: saves CNPJ but skips revenue/employees if rate limited

**Scripts**:
```bash
# Test CNPJ finder with known companies
npx tsx scripts/test-cnpj-finder.ts

# Check which companies have data
npx tsx scripts/check-companies.ts

# Enrich existing companies that have CNPJ but no revenue
npx tsx scripts/enrich-companies.ts
```

**Adding new known CNPJs**:
Edit `lib/services/cnpj-finder.ts` and add to `KNOWN_CNPJS` object:
```typescript
const KNOWN_CNPJS: Record<string, string> = {
  'company name': '12345678000190',  // 14 digits, no formatting
  // ...
}
```

### Bright Data Integration

LeapScout uses 3 different Bright Data APIs for comprehensive job scraping:

#### 1. **Puppeteer Browser** (LinkedIn, complex sites)
**Use case**: LinkedIn job scraping via real browser automation
**Endpoint**: WebSocket connection to remote Chrome browser
**Features**:
- Full JavaScript rendering
- Automatic anti-bot bypass
- IP rotation (15,000 req/min limit)
- Handles dynamic content

**Implementation**: `lib/services/linkedin-scraper.ts`
```typescript
const browser = await puppeteer.connect({
  browserWSEndpoint: process.env.BRIGHT_DATA_PUPPETEER_URL
})
```

**Rate Limits**: 15,000 requests/minute (shared across account)
**Cost**: ~$0.001-0.003 per page load

#### 2. **SERP API** (Google search)
**Use case**: Multi-source job discovery via Google search
**Endpoint**: `https://api.brightdata.com/request` (zone: serp_api1)
**Features**:
- Extract Google search results as JSON
- Find jobs across multiple platforms
- Bypass Google's anti-scraping

**Implementation**: `lib/services/serp-api.ts`
```typescript
await serpApi.searchJobs('Controller São Paulo', 'linkedin.com/jobs')
```

**Response format**: `{ status_code, headers, body }` where body contains HTML
**Note**: Currently returns HTML instead of structured JSON. Consider using Puppeteer for parsing or switching to another SERP provider.

#### 3. **Web Unlocker** (Brazilian job sites)
**Use case**: Scraping Gupy, Catho, InfoJobs with anti-bot bypass
**Endpoint**: `https://api.brightdata.com/request` (zone: web_unlocker1)
**Features**:
- Automatic CAPTCHA solving
- IP rotation and geo-targeting
- Returns raw HTML for parsing

**Implementation**: `lib/services/web-unlocker.ts`
```typescript
const html = await webUnlocker.fetchPage('https://portal.gupy.io/...')
const $ = cheerio.load(html)
// Parse with cheerio selectors
```

**Best Practices**:
- Use Puppeteer for sites requiring full browser (LinkedIn)
- Use Web Unlocker for simpler sites (Gupy, Catho, InfoJobs)
- Use SERP API for discovery (finding new job sources)
- Implement delays between requests to avoid rate limits
- Cache responses when possible
- Handle rate limit errors gracefully (implement retry with exponential backoff)

**MCP Integration**:
Bright Data MCP server is configured in `.claude/mcp.json` for direct API access during development.

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

### Priority Score System

Leads have a `priorityScore` field (0-100) calculated automatically based on 5 factors:

1. **Revenue** (0-35 points): Higher revenue = higher priority
2. **Employees** (0-25 points): Larger companies = higher priority
3. **Recency** (0-20 points): Newer job posts = higher priority
4. **Candidate Count** (0-10 points): Fewer candidates = more urgent
5. **AI Triggers** (0-10 points): More triggers = better qualified

Score calculation happens automatically in `lead-orchestrator.ts` when creating leads. To recalculate for existing leads:
```bash
npx tsx scripts/recalculate-priority-scores.ts
```

The dashboard displays priority badges (Muito Alta, Alta, Média, Baixa, Muito Baixa) with color coding.

### Multi-Source Scraping

The system now supports scraping from multiple job platforms:
- **LinkedIn**: Via Bright Data (requires API key)
- **Gupy**: Brazilian recruitment platform (mock implementation)
- **Catho**: Largest Brazilian job board (mock implementation)

All sources are scraped in parallel in `lead-orchestrator.ts`. To add a new source:
1. Create `lib/services/[source]-scraper.ts`
2. Implement `scrapeJobs(query)` method returning `LinkedInJobData[]`
3. Add to `scrapeAndProcessLeads()` in lead-orchestrator

### CSV Export

Leads can be exported to CSV via `/api/leads/export`:
- Respects same filters as dashboard (status, date range, search)
- Includes all lead and company data
- Formats revenue as "R$ X.XM"
- Escapes special characters properly

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
