@echo off
title Minha Voz - enviar para o GitHub
cd /d "%~dp0"
rem Repositorio de destino (troque aqui se um dia mudar):
set REPO=https://github.com/AnaDevv24/minha-voz.git

where git >nul 2>nul || (echo Falta instalar o Git: https://git-scm.com & pause & exit /b 1)

git config user.name >nul 2>nul || (
  set /p NOME=Seu usuario do GitHub: 
  call git config --global user.name "%%NOME%%"
)
git config user.email >nul 2>nul || (
  set /p EMAIL=Seu e-mail do GitHub: 
  call git config --global user.email "%%EMAIL%%"
)

if not exist .git (
  echo Ligando esta pasta ao repositorio %REPO% ...
  git init -q
  git branch -M main
  git remote add origin %REPO%
  git fetch -q origin main && git reset -q origin/main
)

git add -A
git status --short
echo.
set MSG=Atualizacao do Minha Voz
set /p MSG=Descreva o que mudou (ou so Enter): 
git commit -q -m "%MSG%" || echo Nada novo para enviar.
git push -u origin main && (
  echo.
  echo Enviado! O site atualiza sozinho em 1 a 2 minutos ^(aba Actions no GitHub^).
)
pause
