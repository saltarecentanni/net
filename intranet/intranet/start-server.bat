@echo off
title TIESSE Matrix Network Server v3.0.0
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║     TIESSE Matrix Network Server v3.0.0              ║
echo  ╠══════════════════════════════════════════════════════╣
echo  ║                                                      ║
echo  ║  Local:   http://localhost:8080/                     ║
echo  ║  Rede:    http://10.121.10.101:8080/                 ║
echo  ║                                                      ║
echo  ║  Pressione Ctrl+C para parar o servidor              ║
echo  ║                                                      ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0intranet"
"%~dp0php\php.exe" -S 0.0.0.0:8080

pause
