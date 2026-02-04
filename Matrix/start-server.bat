@echo off
title TIESSE Matrix Network Server v3.2.0
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║     TIESSE Matrix Network Server v3.2.0              ║
echo  ╠══════════════════════════════════════════════════════╣
echo  ║                                                      ║
echo  ║  Local:   http://localhost:8080/                     ║
echo  ║  Rede:    http://SEU-IP:8080/                        ║
echo  ║                                                      ║
echo  ║  Pressione Ctrl+C para parar o servidor              ║
echo  ║                                                      ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

REM Navega para o diretorio do script (onde esta o index.html)
cd /d "%~dp0"

REM Inicia o servidor PHP embutido
REM Se php.exe estiver na mesma pasta:
IF EXIST "%~dp0php\php.exe" (
    "%~dp0php\php.exe" -S 0.0.0.0:8080
) ELSE (
    REM Se PHP estiver no PATH do sistema:
    php -S 0.0.0.0:8080
)

pause
