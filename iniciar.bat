@echo off
echo Iniciando App Store...
start "API" cmd /k "node server.js"
timeout /t 2 >nul
start "Frontend" cmd /k "npm run dev"
timeout /t 3 >nul
start http://localhost:5173
