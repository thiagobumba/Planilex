# =====================================================================
#  Planilex - modo automatico (Windows / PowerShell)
#  Sobe a API e o site e fica acompanhando o GitHub. Quando chega uma
#  alteracao nova, atualiza sozinho:
#   - git pull (descartando a alteracao automatica do package-lock.json)
#   - dependencias mudaram  -> npm install e reinicia API e site
#   - pacote do banco mudou -> recompila e reinicia a API
#   - migracao nova         -> aplica no banco (npm run db:deploy)
#   - so telas/rotas        -> nada a fazer (o modo dev recarrega sozinho)
#  Abrir com: iniciar-planilex.cmd   |   Parar: Ctrl+C nesta janela
# =====================================================================
param([int]$Intervalo = 30)

$ErrorActionPreference = "Continue"
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz
$Host.UI.RawUI.WindowTitle = "Planilex - modo automatico"

function Log($texto, $cor = "Gray") {
  Write-Host ("[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $texto) -ForegroundColor $cor
}

function Executar($descricao, [scriptblock]$comando) {
  Log $descricao "Cyan"
  # Out-Host: a saida do git/npm vai para a tela e nao se mistura com o retorno da funcao.
  & $comando | Out-Host
  if ($LASTEXITCODE -ne 0) { Log "Falhou: $descricao (codigo $LASTEXITCODE)" "Red"; return $false }
  return $true
}

function PortaOcupada($porta) {
  return [bool](Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue)
}

$script:api = $null
$script:site = $null

function Parar($proc) {
  if ($proc -and -not $proc.HasExited) { taskkill /PID $proc.Id /T /F *> $null }
}

function IniciarApi {
  Parar $script:api
  Start-Sleep -Seconds 1
  $script:api = Start-Process cmd.exe -ArgumentList "/c title Planilex - API & npm run dev:api --silent" -WorkingDirectory $raiz -WindowStyle Minimized -PassThru
  Log "API iniciada (janela minimizada 'Planilex - API'): http://localhost:3333" "Green"
}

function IniciarSite {
  Parar $script:site
  Start-Sleep -Seconds 1
  $script:site = Start-Process cmd.exe -ArgumentList "/c title Planilex - Site & npm run dev:web --silent" -WorkingDirectory $raiz -WindowStyle Minimized -PassThru
  Log "Site iniciado (janela minimizada 'Planilex - Site'): http://localhost:3000" "Green"
}

# ---------- Conferencias iniciais ----------
foreach ($prog in "git", "npm") {
  if (-not (Get-Command $prog -ErrorAction SilentlyContinue)) { Log "$prog nao encontrado. Instale e tente de novo." "Red"; Read-Host "Enter para sair"; exit 1 }
}
if (-not (Test-Path ".env")) { Log "Arquivo .env nao encontrado. Copie o .env.example para .env e preencha." "Red"; Read-Host "Enter para sair"; exit 1 }
foreach ($porta in 3000, 3333) {
  if (PortaOcupada $porta) {
    Log "A porta $porta ja esta em uso. Feche as janelas antigas da API/site (ou rode este script so uma vez) e abra de novo." "Red"
    Read-Host "Enter para sair"; exit 1
  }
}

# ---------- Primeira atualizacao e inicio ----------
Log "Planilex - modo automatico. Verificando o GitHub a cada $Intervalo segundos. Ctrl+C para parar." "White"
git checkout -q -- package-lock.json 2>$null
if (-not (Executar "Atualizando pelo GitHub (git pull)..." { git pull -q })) { Read-Host "Corrija o problema acima e pressione Enter para sair"; exit 1 }
if (-not (Executar "Instalando dependencias (npm install)..." { npm install --silent --no-audit --no-fund })) { Read-Host "Enter para sair"; exit 1 }
Executar "Aplicando migracoes pendentes no banco (db:deploy)..." { npm run db:deploy --silent } | Out-Null
IniciarApi
IniciarSite
Start-Sleep -Seconds 8
Start-Process "http://localhost:3000"
$scriptOriginal = (Get-FileHash $PSCommandPath).Hash

# ---------- Acompanhamento ----------
try {
  while ($true) {
    Start-Sleep -Seconds $Intervalo

    if ($script:api.HasExited) { Log "A API parou. Reiniciando..." "Yellow"; IniciarApi }
    if ($script:site.HasExited) { Log "O site parou. Reiniciando..." "Yellow"; IniciarSite }

    git fetch -q 2>$null
    if ($LASTEXITCODE -ne 0) { Log "Sem acesso ao GitHub agora (internet?). Tento de novo em $Intervalo s." "DarkYellow"; continue }
    $local = git rev-parse HEAD
    $remoto = git rev-parse "@{u}"
    if ($local -eq $remoto) { continue }

    $arquivos = @(git diff --name-only $local $remoto)
    $titulo = git log -1 --pretty=%s $remoto
    Log "Atualizacao nova: $titulo" "White"

    git checkout -q -- package-lock.json 2>$null
    if (-not (Executar "git pull..." { git pull -q })) { Log "Nao consegui atualizar. Veja a mensagem acima; tento de novo no proximo ciclo." "Red"; continue }

    $mudouDependencias = $arquivos | Where-Object { $_ -match '(^|/)package(-lock)?\.json$' -or $_ -match '^apps/web/next\.config\.ts$' }
    $mudouBanco = $arquivos | Where-Object { $_ -match '^packages/db/' }
    $mudouMigracao = $arquivos | Where-Object { $_ -match '^packages/db/prisma/migrations/' }
    $mudouScript = $arquivos | Where-Object { $_ -match '^scripts/' -or $_ -match '\.cmd$' }

    if ($mudouDependencias) {
      if (Executar "Dependencias mudaram: npm install..." { npm install --silent --no-audit --no-fund }) { IniciarApi; IniciarSite }
    } elseif ($mudouBanco) {
      if (Executar "Pacote do banco mudou: recompilando..." { npm run db:generate --silent }) { IniciarApi }
    } else {
      Log "Telas/rotas atualizadas. O site e a API recarregam sozinhos." "Green"
    }

    if ($mudouMigracao) {
      Executar "Migracao nova: aplicando no banco (db:deploy)..." { npm run db:deploy --silent } | Out-Null
    }

    if ($mudouScript -and (Get-FileHash $PSCommandPath).Hash -ne $scriptOriginal) {
      Log "Este script de atualizacao foi alterado. Feche esta janela e abra iniciar-planilex.cmd de novo para usar a versao nova." "Yellow"
    }
    Log "Atualizado. Recarregue a pagina no navegador (F5) se ela nao mudar sozinha." "Green"
  }
}
finally {
  Log "Encerrando API e site..." "Yellow"
  Parar $script:api
  Parar $script:site
}
