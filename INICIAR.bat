@echo off
chcp 65001 >nul
title Minha Voz - iniciar
cd /d "%~dp0"
echo ==============================================
echo   Minha Voz (CAA) - iniciando o app e a API
echo ==============================================
echo.

where node >nul 2>nul || (echo Falta instalar o Node.js: https://nodejs.org & pause & exit /b 1)

set PY=python
where python >nul 2>nul || set PY=py
%PY% --version >nul 2>nul || (echo Falta instalar o Python: https://www.python.org ^(marque "Add python.exe to PATH"^) & pause & exit /b 1)

if not exist node_modules (
  echo [1/4] Instalando as bibliotecas do app ^(so na primeira vez, demora um pouco^)...
  call npm.cmd install || (echo Erro no npm install. & pause & exit /b 1)
) else (
  echo [1/4] Bibliotecas do app: OK
)

echo [2/4] Conferindo as bibliotecas da API...
%PY% -m pip install -q -r backend\requirements.txt || (echo Erro no pip install. & pause & exit /b 1)

if not exist backend\.env (
  echo [3/4] Primeira vez neste computador: configurando o MySQL...
  %PY% backend\configurar.py || (echo. & echo A configuracao do MySQL nao terminou. Veja a mensagem acima. & pause & exit /b 1)
) else (
  echo [3/4] Configuracao do MySQL ^(backend\.env^): OK
)

echo [4/4] Ligando a API ^(janela separada^) e o app...
start "Minha Voz - API (nao feche)" /D "%~dp0backend" cmd /k %PY% app.py
echo.
echo O navegador vai abrir em http://localhost:5173
echo Para desligar tudo: feche esta janela e a janela da API.
echo.
call npm.cmd run dev -- --open
pause
