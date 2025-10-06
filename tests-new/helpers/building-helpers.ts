/**
 * 🏢 BUILDING HELPERS - Helpers pour la création d'immeubles
 *
 * Helpers réutilisables pour les tests E2E de création d'immeubles :
 * - Navigation vers le formulaire de création
 * - Remplissage des différentes étapes
 * - Validation et vérification
 */

import { Page, expect } from '@playwright/test'

/**
 * Navigate to building creation page
 */
export const navigateToBuildingCreation = async (page: Page): Promise<void> => {
  console.log('📍 Navigating to building creation page...')

  // Option 1: Direct URL
  await page.goto('http://localhost:3000/gestionnaire/biens/immeubles/nouveau')

  // Wait for page to load
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)  // Give React time to hydrate

  console.log('✅ Building creation page loaded')
}

/**
 * Fill building information (Step 1)
 */
export const fillBuildingInfo = async (
  page: Page,
  building: {
    name?: string  // Optional - if empty, will use auto-generated name
    address: string
    city: string
    postalCode: string
    country?: string  // Default: 'Belgique'
    constructionYear?: string
    description?: string
  }
): Promise<void> => {
  console.log('📝 Filling building info...', { building })

  // Fill building name (optional)
  if (building.name) {
    const nameInput = page.locator('input[name="name"]')
    await nameInput.fill(building.name)
  }

  // Fill address (required)
  const addressInput = page.locator('input[name="address"]')
  await addressInput.fill(building.address)

  // Fill city (required)
  const cityInput = page.locator('input[name="city"]')
  await cityInput.fill(building.city)

  // Fill postal code (required)
  const postalCodeInput = page.locator('input[name="postalCode"]')
  await postalCodeInput.fill(building.postalCode)

  // Select country (default: Belgique)
  if (building.country) {
    // Open the select/combobox
    const countryButton = page.locator('button:has-text("' + (building.country || 'Belgique') + '")')
    await countryButton.click()

    // Click the option
    const countryOption = page.locator(`[role="option"]:has-text("${building.country}")`)
    await countryOption.click()
  }

  // Fill construction year (optional)
  if (building.constructionYear) {
    const yearInput = page.locator('input[name="constructionYear"]')
    await yearInput.fill(building.constructionYear)
  }

  // Fill description (optional)
  if (building.description) {
    const descriptionInput = page.locator('textarea[name="description"]')
    await descriptionInput.fill(building.description)
  }

  await page.waitForTimeout(500)  // Wait for React state
  console.log('✅ Building info filled')
}

/**
 * Add a lot (Step 2)
 */
export const addLot = async (
  page: Page,
  lot: {
    reference: string
    floor?: string
    doorNumber?: string
    category?: string  // Default: 'appartement'
  }
): Promise<void> => {
  console.log('📝 Adding lot...', { lot })

  // Click "Ajouter un lot" button
  const addLotButton = page.locator('button:has-text("Ajouter un lot")')
  await expect(addLotButton).toBeVisible({ timeout: 5000 })
  await addLotButton.click()
  await page.waitForTimeout(500)

  // Fill lot reference (should be auto-generated, but we can override)
  const referenceInput = page.locator('input[placeholder*="Référence"]').last()
  await referenceInput.fill(lot.reference)

  // Fill floor (optional)
  if (lot.floor) {
    const floorInput = page.locator('input[placeholder*="Étage"]').last()
    await floorInput.fill(lot.floor)
  }

  // Fill door number (optional)
  if (lot.doorNumber) {
    const doorInput = page.locator('input[placeholder*="Numéro de porte"]').last()
    await doorInput.fill(lot.doorNumber)
  }

  // Select category (default: appartement)
  if (lot.category && lot.category !== 'appartement') {
    // Open category select
    const categoryButton = page.locator('button:has-text("Appartement")').last()
    await categoryButton.click()

    // Click the option
    const categoryOption = page.locator(`[role="option"]:has-text("${lot.category}")`)
    await categoryOption.click()
  }

  await page.waitForTimeout(500)
  console.log('✅ Lot added:', lot.reference)
}

/**
 * Go to next step
 */
export const goToNextStep = async (page: Page): Promise<void> => {
  console.log('➡️ Going to next step...')

  const nextButton = page.locator('button:has-text("Suivant")')
  await expect(nextButton).toBeVisible({ timeout: 5000 })
  await nextButton.click()

  await page.waitForTimeout(1000)  // Wait for step transition
  console.log('✅ Next step loaded')
}

/**
 * Skip contacts step (Step 3)
 */
export const skipContactsStep = async (page: Page): Promise<void> => {
  console.log('⏭️ Skipping contacts step...')

  // Just click "Suivant" without adding contacts
  await goToNextStep()

  console.log('✅ Contacts step skipped')
}

/**
 * Submit building creation (Step 4 - Confirmation)
 */
export const submitBuildingCreation = async (page: Page): Promise<void> => {
  console.log('✅ Submitting building creation...')

  const submitButton = page.locator('button:has-text("Confirmer la création")')
  await expect(submitButton).toBeVisible({ timeout: 5000 })
  await submitButton.click()

  console.log('✅ Building creation submitted')
}

/**
 * Wait for building creation success
 */
export const waitForBuildingCreated = async (page: Page, timeout = 10000): Promise<void> => {
  console.log('⏳ Waiting for building created...')

  // Wait for redirect to buildings list
  await page.waitForURL(/\/gestionnaire\/biens/, { timeout })

  console.log('✅ Building created successfully')
}

/**
 * Expect error message
 */
export const expectErrorMessage = async (page: Page, errorText: string): Promise<void> => {
  console.log(`🔍 Looking for error: "${errorText}"`)

  const errorElement = page.locator(`text="${errorText}"`).first()
  await expect(errorElement).toBeVisible({ timeout: 5000 })

  console.log(`✅ Error message found: "${errorText}"`)
}

/**
 * Expect validation error with specific text
 */
export const expectValidationError = async (page: Page, partialText: string): Promise<void> => {
  console.log(`🔍 Looking for validation error containing: "${partialText}"`)

  // Look for error div with text
  const errorElement = page.locator('[class*="error"], [class*="alert"]').filter({ hasText: partialText })
  await expect(errorElement).toBeVisible({ timeout: 5000 })

  console.log(`✅ Validation error found`)
}
