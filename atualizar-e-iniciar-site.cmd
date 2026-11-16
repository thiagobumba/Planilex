@echo off
rem ============================================================
rem  Planilex - atualiza pelo GitHub e inicia o site
rem  1) descarta a alteracao automatica do package-lock.json
rem  2) git pull
rem  3) npm install
rem  4) npm run dev:web (http://localhost:3000)
rem  Uso: dois cliques neste arquivo, ou "atualizar-e-iniciar-site" no Prompt.
rem  Deixe esta janela aberta enquanto usa o app.
rem ============================================================
setlocal
cd /d "%~dp0"
title Planilex - Site

where git >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Git nao encontrado. Instale em https://git-scm.com
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js/npm nao encontrado. Instale em https://nodejs.org
  pause
  exit /b 1
)

echo [1/3] Atualizando o projeto pelo GitHub...
git checkout -q -- package-lock.json >nul 2>&1
git pull -q
if errorlevel 1 (
  echo.
  echo [ERRO] Nao foi possivel atualizar pelo GitHub.
  echo        Se voce alterou algum arquivo do projeto, desfaca a alteracao
  echo        ou rode "git status" para ver o que esta diferente.
  pause
  exit /b 1
)

echo [2/3] Instalando dependencias...
call npm install --silent --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo [ERRO] Falha no npm install. Veja as mensagens acima.
  pause
  exit /b 1
)

echo [3/3] Iniciando o site em http://localhost:3000
echo       (a API precisa estar rodando: iniciar-api.cmd)
echo       (para parar: Ctrl+C)
echo.
call npm run dev:web --silent
if errorlevel 1 (
  echo.
  echo [ERRO] O site parou com erro. Veja as mensagens acima.
  pause
  exit /b 1
)
