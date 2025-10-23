# Script PowerShell pour lancer les tests E2E Auto-Healing

Write-Host "🧪 SEIDO - E2E Tests Auto-Healing" -ForegroundColor Cyan
Write-Host ""

# Vérifier que Node.js est installé
$nodeVersion = node --version 2>$null
if (!$nodeVersion) {
    Write-Host "❌ Node.js n'est pas installé" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green

# Vérifier que les dépendances sont installées
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
    npm install
}

# Parser les arguments
$testFile = $args[0]
$headed = $args -contains "--headed"
$headless = $args -contains "--headless"
$debug = $args -contains "--debug"

# Définir les variables d'environnement
if ($headed) {
    $env:HEADED = "true"
    Write-Host "🎭 Mode: Headed (navigateur visible)" -ForegroundColor Yellow
} elseif ($headless) {
    $env:HEADLESS = "true"
    Write-Host "🎭 Mode: Headless (navigateur caché)" -ForegroundColor Yellow
}

if ($debug) {
    $env:DEBUG = "pw:api"
    Write-Host "🐛 Mode debug activé" -ForegroundColor Yellow
}

# Configuration des chemins
$env:NODE_ENV = "test"
$configPath = "tests-new/config/playwright.config.ts"

Write-Host ""
Write-Host "📂 Configuration: $configPath" -ForegroundColor Cyan
Write-Host "📁 Test directory: tests-new/" -ForegroundColor Cyan
Write-Host ""

# Lancer les tests
if ($testFile) {
    Write-Host "🚀 Lancement du test: $testFile" -ForegroundColor Green
    Write-Host ""
    npx playwright test $testFile --config=$configPath
} else {
    Write-Host "🚀 Lancement de tous les tests" -ForegroundColor Green
    Write-Host ""
    npx playwright test --config=$configPath
}

# Afficher les résultats
$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "✅ ✅ ✅ TOUS LES TESTS SONT PASSÉS ✅ ✅ ✅" -ForegroundColor Green
} else {
    Write-Host "❌ CERTAINS TESTS ONT ÉCHOUÉ" -ForegroundColor Red
    Write-Host ""
    Write-Host "📄 Consultez les rapports détaillés dans:" -ForegroundColor Yellow
    Write-Host "   - tests-new/logs/" -ForegroundColor Cyan
    Write-Host "   - tests-new/logs/playwright-report/" -ForegroundColor Cyan
}

Write-Host ""

exit $exitCode
