@echo off
echo ================================================================================
echo    SEIDO AUTO-HEALING SYSTEM - DEMO
echo ================================================================================
echo.
echo Ce script va demarer le test de login avec auto-correction automatique
echo.
echo Fonctionnement:
echo   1. Le test tente de se connecter en tant qu'admin
echo   2. Si la redirection echoue (timeout), le systeme auto-healing s'active
echo   3. L'agent analyze l'erreur et applique une correction
echo   4. Le test est relance automatiquement (max 3 tentatives)
echo.
echo ================================================================================
echo.

pause

echo.
echo [1/2] Verifying dev server is running...
curl -s http://localhost:3000 > nul 2>&1
if errorlevel 1 (
    echo.
    echo ^[ERROR^] Dev server not running!
    echo Please start it first with: npm run dev
    echo.
    pause
    exit /b 1
)
echo ^[OK^] Dev server is running
echo.

echo [2/2] Starting Auto-Healing Demo Test...
echo.
npx playwright test docs/refacto/Tests/auto-healing/demo-login-test.spec.ts --reporter=list --headed --timeout=120000

echo.
echo ================================================================================
echo    TEST COMPLETE
echo ================================================================================
echo.
echo Artifacts generated in:
echo   docs/refacto/Tests/auto-healing-artifacts/
echo.
echo Check reports:
echo   - Error contexts: auto-healing-artifacts/^<testId^>/error-context.json
echo   - Screenshots: auto-healing-artifacts/^<testId^>/error-screenshot.png
echo   - Healing report: auto-healing-artifacts/reports/auto-healing-*.json
echo.

pause