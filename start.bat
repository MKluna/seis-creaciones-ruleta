@echo off
title Seis Creaciones - Ruleta
echo.
echo  ==========================================
echo   Seis Creaciones - Iniciando servidores
echo  ==========================================
echo.

:: Liberar puertos si estaban ocupados
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr LISTENING') do (
  echo  Liberando puerto 3001 (PID %%a)...
  taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr LISTENING') do (
  echo  Liberando puerto 5173 (PID %%a)...
  taskkill /PID %%a /F >nul 2>&1
)

echo.
echo  Backend  : http://localhost:3001  (nodemon - auto-restart)
echo  Frontend : http://localhost:5173  (Vite - hot reload)
echo.

npm run dev

pause
