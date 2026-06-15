@echo off
title GARI GCS - Rocket (868 MHz / Port 8000)
echo.
echo  ============================================================
echo   GARI GCS v2.0 - CAN-7USAT Ground Control Station
echo   Vehicle  : Rocket  (868 MHz XBee, 20 Hz)
echo   Backend  : http://localhost:8000
echo   Frontend : http://localhost:5174
echo  ============================================================
echo.

:: Start backend (if not already running)
start "GARI-Backend-Rocket" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && set ROCKET_MOCK_PROFILE=demo && python -m app.main"

:: Wait for backend
timeout /t 3 /nobreak > nul

:: Start frontend with rocket env
start "GARI-Frontend-Rocket" cmd /k "cd /d %~dp0frontend && copy /y .env.rocket .env.local && npm run dev -- --port 5174"

echo.
echo  Rocket GCS started.
echo  Open http://localhost:5174 in your browser.
echo.
pause
