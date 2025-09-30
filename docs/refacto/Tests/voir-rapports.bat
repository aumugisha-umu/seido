@echo off
echo ========================================
echo    RAPPORTS TESTS E2E SEIDO
echo ========================================
echo.
echo Rapports disponibles :
echo.
echo [1] Rapport HTML Playwright (interactif)
echo [2] Rapport Agent Debugger (analyse IA)
echo [3] Resultats detailles (Markdown)
echo [4] Tous les rapports
echo [5] Quitter
echo.
set /p choice="Votre choix (1-5) : "

if "%choice%"=="1" (
    echo.
    echo Ouverture du rapport Playwright...
    start http://localhost:58601
    npx playwright show-report
) else if "%choice%"=="2" (
    echo.
    echo Ouverture du rapport Agent Debugger...
    for /f "delims=" %%i in ('dir /b /o-d reports\debugger\analysis-*-report.html 2^>nul') do (
        start reports\debugger\%%i
        goto :done
    )
    echo Aucun rapport trouve.
) else if "%choice%"=="3" (
    echo.
    echo Ouverture des resultats...
    start RESULTATS-TEST-LOGIN.md
) else if "%choice%"=="4" (
    echo.
    echo Ouverture de tous les rapports...
    start http://localhost:58601
    start RESULTATS-TEST-LOGIN.md
    for /f "delims=" %%i in ('dir /b /o-d reports\debugger\analysis-*-report.html 2^>nul') do (
        start reports\debugger\%%i
        goto :continue
    )
    :continue
    npx playwright show-report
) else if "%choice%"=="5" (
    exit
) else (
    echo Choix invalide.
)

:done
echo.
pause