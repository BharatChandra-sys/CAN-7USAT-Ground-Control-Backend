@echo off
echo ========================================
echo CAN-7USAT Full System Test
echo ========================================
echo.

echo [1/3] Checking backend...
curl -s http://localhost:8000/api/health > nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Backend not running!
    echo Please start backend first: backend\run_server.bat
    pause
    exit /b 1
)
echo Backend: OK

echo.
echo [2/3] Checking frontend...
curl -s http://localhost:5173 > nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Frontend not running!
    echo Please start frontend: cd frontend && npm run dev
    pause
    exit /b 1
)
echo Frontend: OK

echo.
echo [3/3] Getting system status...
curl -s http://localhost:8000/api/status

echo.
echo ========================================
echo System Status: ALL SYSTEMS OPERATIONAL
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Open http://localhost:5173 in your browser
echo.
pause
