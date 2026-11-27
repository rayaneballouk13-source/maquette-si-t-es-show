@echo off
title Site SI T ES SHOW - serveur local
cd /d "%~dp0"
where node >NUL 2>&1
if errorlevel 1 (
  echo Node.js n'est pas installe : https://nodejs.org
  pause
  exit /b 1
)
start "" "http://localhost:5174"
node outils\serveur-local.js
pause
