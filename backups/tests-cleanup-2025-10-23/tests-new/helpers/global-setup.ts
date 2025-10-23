/**
 * 🔧 GLOBAL SETUP - Configuration globale avant tous les tests
 */

import { promptBrowserMode } from './test-runner'
import * as fs from 'fs/promises'
import { TEST_CONFIG } from '../config/test-config'
import * as dotenv from 'dotenv'
import * as path from 'path'

export default async function globalSetup() {
  console.log('\n🚀 Global Setup - Tests E2E Auto-Healing\n')

  // ✅ Charger les variables d'environnement depuis .env.local
  const envPath = path.resolve(process.cwd(), '.env.local')
  console.log('📄 Loading environment from:', envPath)

  const result = dotenv.config({ path: envPath })

  if (result.error) {
    console.warn('⚠️ Failed to load .env.local:', result.error.message)
  } else {
    console.log('✅ Environment variables loaded')
    console.log('  NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('  SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  }

  // Prompt pour le mode de navigateur
  const browserMode = await promptBrowserMode()

  // Sauvegarder le choix dans une variable d'environnement
  process.env.BROWSER_MODE = browserMode

  // Si headless, définir la variable Playwright
  if (browserMode === 'headless') {
    process.env.PWTEST_HEADED = 'false'
  } else {
    process.env.PWTEST_HEADED = 'true'
  }

  // Créer les répertoires de logs
  await fs.mkdir(TEST_CONFIG.logging.logDir, { recursive: true })
  await fs.mkdir(TEST_CONFIG.screenshots.directory, { recursive: true })
  await fs.mkdir(TEST_CONFIG.email.emailsDir, { recursive: true })

  console.log('✅ Global setup complete\n')
}
