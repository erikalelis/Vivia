@echo off
cd /d "%~dp0"
echo Preparando VIVIA para publicar, puede tardar un minuto...
call npm run build
if errorlevel 1 goto error
>dist\_redirects echo /* /index.html 200
echo.
echo Listo. Se abre la carpeta dist: esa es la que hay que subir.
start "" "%~dp0dist"
pause
exit /b
:error
echo.
echo Hubo un error. Saca una captura de esta ventana y mandasela a Claude.
pause
