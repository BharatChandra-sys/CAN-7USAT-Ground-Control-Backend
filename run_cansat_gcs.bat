@echo off
title GARI GCS - CanSat (915 MHz / Port 8000)
echo.
echo  ============================================================
echo   GARI GCS v2.0 - CAN-7USAT Ground Control Station
echo   Vehicle  : CanSat  (915 MHz XBee, 10 Hz)
echo   Backend  : http://localhost:8000
echo   Frontend : http://localhost:5173
echo  ============================================================
echo.

:: Start backend
start "GARI-Backend-CanSat" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && set CANSAT_MOCK_PROFILE=demo && python -m app.main"

:: Wait for backend to start
timeout /t 3 /nobreak > nul

:: Start frontend (CanSat env)
start "GARI-Frontend-CanSat" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo  Both servers started.
echo  Open http://localhost:5173 in your browser.
echo.
pause
