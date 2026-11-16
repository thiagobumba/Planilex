@echo off
rem ============================================================
rem  Planilex - modo automatico
rem  Sobe a API e o site e atualiza sozinho quando houver
rem  alteracao nova no GitHub. Deixe esta janela aberta.
rem  Para parar tudo: Ctrl+C nesta janela (ou feche-a).
rem ============================================================
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\planilex-automatico.ps1" %*
