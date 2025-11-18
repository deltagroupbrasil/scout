@echo off
echo 📤 Instalando Vercel CLI...
npm install -g vercel

echo.
echo 🔐 Fazendo login no Vercel...
vercel login

echo.
echo 📝 Fazendo link com o projeto...
vercel link

echo.
echo 📤 Enviando variáveis de ambiente...
vercel env pull
vercel env add NEXTAUTH_URL production < nul
echo https://leapscout.vercel.app

vercel env add NEXTAUTH_SECRET production < nul
echo sZ1U0dKg9rHILK434GGY/ZJ3UAFyLALO22vw5b8NRvI=

echo.
echo ✅ Pronto! Agora vá ao Vercel e faça Redeploy
pause
