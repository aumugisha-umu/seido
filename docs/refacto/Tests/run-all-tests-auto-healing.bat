@echo off
REM ============================================================================
REM 🎯 MASTER TEST RUNNER - Lancement avec Auto-Healing
REM ============================================================================
REM
REM Ce script lance tous les tests E2E avec le système d'auto-healing intelligent
REM
REM Workflow:
REM 1. Lance toutes les suites de tests (auth, contacts, workflows, performance)
REM 2. Sur erreur: Analyse avec Debugger Agent
REM 3. Correction avec agents spécialisés (backend-developer, API-designer, tester)
REM 4. Retry automatique (max 5 cycles)
REM 5. Génère rapport final exhaustif
REM
REM Usage:
REM   run-all-tests-auto-healing.bat [options]
REM
REM Options:
REM   --critical          Lance uniquement les tests critiques
REM   --tag <tag>         Lance les tests avec un tag spécifique
REM   --max-retries <n>   Nombre max de retries (défaut: 5)
REM   --stop-on-failure   Stop au premier échec
REM   --verbose           Affiche tous les logs détaillés
REM   --minimal           Affiche uniquement les résultats finaux
REM
REM Exemples:
REM   run-all-tests-auto-healing.bat
REM   run-all-tests-auto-healing.bat --critical
REM   run-all-tests-auto-healing.bat --tag auth --verbose
REM   run-all-tests-auto-healing.bat --max-retries 3
REM
REM ============================================================================

echo.
echo ========================================================================
echo 🎯 MASTER TEST RUNNER - Auto-Healing System
echo ========================================================================
echo.

REM Vérifier que Node.js est installé
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js n'est pas installé ou n'est pas dans le PATH
    echo    Télécharger depuis: https://nodejs.org
    exit /b 1
)

REM Vérifier que npm est installé
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm n'est pas installé ou n'est pas dans le PATH
    exit /b 1
)

REM Vérifier qu'on est dans le bon répertoire
if not exist "package.json" (
    echo ❌ Erreur: package.json non trouvé
    echo    Ce script doit être exécuté depuis la racine du projet SEIDO
    exit /b 1
)

echo ✅ Environnement vérifié
echo.

REM S'assurer que le dev server tourne
echo 🔍 Vérification du serveur de développement...
netstat -ano | findstr ":3000" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Le serveur de développement ne semble pas tourner sur le port 3000
    echo    Lancement automatique du serveur...
    echo.
    start "SEIDO Dev Server" cmd /c "npm run dev"

    echo ⏳ Attente du démarrage du serveur (30 secondes)...
    timeout /t 30 /nobreak >nul
    echo ✅ Serveur démarré
    echo.
) else (
    echo ✅ Serveur de développement détecté sur le port 3000
    echo.
)

REM Lancer le Master Test Runner avec npx tsx
echo 🚀 Lancement du Master Test Runner...
echo.
echo 📋 Configuration:
echo    - Mode: Tous les tests enabled
echo    - Max retries: 5 cycles d'auto-healing
echo    - Agents: seido-debugger, backend-developer, API-designer, tester
echo    - Rapport: Généré automatiquement
echo.
echo ========================================================================
echo.

REM Exécuter le runner avec les arguments passés
npx tsx docs/refacto/Tests/runners/master-test-runner.ts %*

REM Capturer le code de sortie
set EXIT_CODE=%ERRORLEVEL%

echo.
echo ========================================================================
echo 📊 RÉSULTAT FINAL
echo ========================================================================

if %EXIT_CODE% EQU 0 (
    echo ✅ Tous les tests sont passés avec succès !
    echo.
    echo 📄 Rapport disponible dans: docs/refacto/Tests/reports/
    echo.
    echo 💡 Prochaines étapes:
    echo    1. Vérifier les corrections appliquées
    echo    2. Commiter les changements si appropriés
    echo    3. Consulter le rapport détaillé
) else (
    echo ❌ Des tests ont échoué après les tentatives d'auto-healing
    echo.
    echo 📄 Rapport disponible dans: docs/refacto/Tests/reports/
    echo.
    echo 💡 Actions requises:
    echo    1. Consulter le rapport détaillé
    echo    2. Analyser les erreurs non résolues
    echo    3. Appliquer les corrections manuellement
    echo.
    echo 📝 Consulter les recommandations dans le rapport JSON
)

echo ========================================================================
echo.

REM Proposer d'ouvrir le dossier des rapports
set /p OPEN_REPORTS="Voulez-vous ouvrir le dossier des rapports ? (O/N) : "
if /i "%OPEN_REPORTS%"=="O" (
    start explorer "docs\refacto\Tests\reports"
)

echo.
echo 👋 Master Test Runner terminé
echo.

exit /b %EXIT_CODE%