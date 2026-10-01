@echo off
cd /d "%~dp0"
echo Conectando VIVIA con tu proyecto de Supabase...
> .env echo VITE_SUPABASE_URL=https://yjokpdxlhwfkbawztbkh.supabase.co
>> .env echo VITE_SUPABASE_ANON_KEY=sb_publishable_G3vksmvmv7G1HfUSQ3q3Kw_93TjQhw1
echo Listo. Abriendo VIVIA en tu navegador. NO cierres esta ventana mientras uses VIVIA.
start "" http://localhost:5173
call npm run dev
pause
