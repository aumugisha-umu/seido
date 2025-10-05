# Script pour lancer le test signup en mode headed
$env:HEADED = "true"
npx playwright test tests-new/auth/signup.spec.ts --config=tests-new/config/playwright.config.ts --project=chromium-headed
