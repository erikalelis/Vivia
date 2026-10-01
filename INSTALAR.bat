@echo off
cd /d "%~dp0"
echo Instalando VIVIA, puede tardar unos minutos...
call npm install
echo.
echo Probando la logica...
call npm run test
echo.
echo Listo. Copia lo que dice arriba y mandaselo a Claude.
pause
