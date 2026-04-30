@echo off
echo ========================================
echo CAN-7USAT Frontend Setup
echo ========================================
echo.

cd frontend

echo Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the frontend:
echo   cd frontend
echo   npm run dev
echo.
echo Frontend will run at: http://localhost:5173
echo Backend must be running at: http://localhost:8000
echo.
pause
