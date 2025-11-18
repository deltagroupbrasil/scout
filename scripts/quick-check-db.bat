@echo off
echo 🔍 Verificando banco de produção...
echo.

REM Substitua pela sua DATABASE_URL real do Vercel
set DATABASE_URL=postgresql://neondb_owner:npg_xxx@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

npx tsx scripts/check-production-db.ts

pause
