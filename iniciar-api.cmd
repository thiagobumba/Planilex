@echo off
rem ============================================================
rem  Planilex - inicia a API (http://localhost:3333)
rem  Uso: dois cliques neste arquivo, ou "iniciar-api" no Prompt.
rem  Deixe esta janela aberta enquanto usa o app.
rem ============================================================
setlocal
cd /d "%~dp0"
title Planilex - API

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js/npm nao encontrado. Instale em https://nodejs.org
  pause
  exit /b 1
)

if not exist ".env" (
  echo [ERRO] Arquivo .env nao encontrado na pasta do projeto.
  echo        Copie o .env.example para .env e preencha com os dados do Supabase.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Instalando dependencias pela primeira vez...
  call npm install --silent --no-audit --no-fund
  if errorlevel 1 goto erro
)

echo Iniciando a API do Planilex em http://localhost:3333
echo (para parar: Ctrl+C)
echo.
call npm run dev:api --silent
if errorlevel 1 goto erro
exit /b 0

:erro
echo.
echo [ERRO] A API parou com erro. Veja as mensagens acima.
pause
exit /b 1
