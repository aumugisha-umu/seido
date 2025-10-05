@echo off
echo Restarting Next.js dev server...

REM Kill all node processes
echo Killing Node.js processes...
taskkill /F /IM node.exe /T 2>nul
if errorlevel 1 (
    echo No Node processes to kill
) else (
    echo Node processes killed
)

timeout /T 2 /NOBREAK > nul

REM Delete .next cache
echo Deleting .next cache...
if exist ".next" (
    rd /s /q ".next"
    echo Cache deleted
) else (
    echo No cache to delete
)

REM Start dev server
echo Starting Next.js dev server...
start /B cmd /c "npm run dev"

timeout /T 5 /NOBREAK > nul

echo.
echo ========================================
echo Server should be running on port 3000
echo ========================================
