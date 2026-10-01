@echo off
cd /d "%~dp0"
echo Paso 1 de 2: instalando piezas...
call npm install
echo.
echo Paso 2 de 2: armando VIVIA para revisar errores...
call npm run build > RESULTADO.txt 2>&1
type RESULTADO.txt
echo.
echo Listo. Saca una captura de esta ventana y mandasela a Claude.
pause
