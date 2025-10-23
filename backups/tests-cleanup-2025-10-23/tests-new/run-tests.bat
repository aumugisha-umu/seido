@echo off
REM Script Batch pour lancer les tests E2E Auto-Healing

echo.
echo ====================================
echo   SEIDO - E2E Tests Auto-Healing
echo ====================================
echo.

REM Lancer le script PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0run-tests.ps1" %*
