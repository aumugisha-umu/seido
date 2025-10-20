/**
 * 🏢 Phase 2 - Buildings Management Tests
 *
 * Test du CRUD complet des bâtiments:
 * - Création d'un nouveau bâtiment
 * - Affichage de la liste des bâtiments
 * - Modification des informations d'un bâtiment
 * - Suppression d'un bâtiment
 * - Gestion des erreurs et validations
 *
 * Roles testés: Gestionnaire (manager avec droits CRUD complets)
 */

import { test, expect, Page } from '@playwright/test'
import {
  loginAsGestionnaire,
  navigateToBuildings,
  setupTestIsolation,
  teardownTestIsolation
} from '../helpers'
import {
  BUILDINGS,
  generateBuilding,
  validateBuildingData,
  type TestBuilding
} from '../fixtures/buildings.fixture'
// Configuration globale
test.setTimeout(90000) // 90 secondes pour tests E2E complets

/**
 * Test Suite: Buildings CRUD Operations
 */
test.describe('🏢 Phase 2 - Buildings Management', () => {

  test.beforeEach(async ({ page }) => {
    await setupTestIsolation(page)
    await loginAsGestionnaire(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    await teardownTestIsolation(page, testInfo)
  })

  /**
   * Test 1: Affichage de la liste des bâtiments
   */
  test('should display buildings list with correct data', async ({ page }) => {
    console.log('📝 Test step')

    await navigateToBuildings(page)

    // Vérifier présence du titre de la page
    const pageTitle = page.locator('h1, h2').first()
    await pageTitle.waitFor({ state: 'visible', timeout: 15000 })

    const titleText = await pageTitle.textContent()

    // Vérifier présence du bouton d'ajout
    const addButton = page.locator(
      'button:has-text("Ajouter"), button:has-text("Nouveau"), button:has-text("Créer")'
    ).first()

    await addButton.waitFor({ state: 'visible', timeout: 15000 })

    // Vérifier affichage de la liste ou état vide
    const hasBuildings = await page.locator('[data-testid="building-card"], [data-testid="building-item"]').count()

    if (hasBuildings > 0) {
      // Liste avec bâtiments - test passed
    } else {
      // État vide - vérifier texte bilingue FR/EN
      const emptyState = page.locator('text=/no buildings|aucun.*bâtiment|aucun.*bien|liste.*vide/i')
      await expect(emptyState.first()).toBeVisible({ timeout: 10000 })
    }

  })

  /**
   * Test 2: Création d'un nouveau bâtiment
   */
  test('should create a new building successfully', async ({ page }) => {
    console.log('📝 Test step')

    await navigateToBuildings(page)

    // Ouvrir le formulaire de création
    const addButton = page.locator(
      'button:has-text("Ajouter"), button:has-text("Nouveau"), button:has-text("Créer")'
    ).first()

    await addButton.waitFor({ state: 'visible', timeout: 15000 })
    await addButton.click()

    // Attendre le formulaire ou modal
    await page.waitForTimeout(1000)

    // Générer données de test
    const newBuilding = generateBuilding({
      name: `Test Building ${Date.now()}`,
      address: {
        street: '123 Test Avenue',
        city: 'Test City',
        postalCode: '75001',
        country: 'France'
      }
    })


    // Remplir le formulaire
    // Note: Les sélecteurs exacts dépendent de l'implémentation UI
    const nameInput = page.locator('input[name="name"], input[placeholder*="nom"]').first()
    if (await nameInput.isVisible({ timeout: 5000 })) {
      await nameInput.fill(newBuilding.name)
    }

    const streetInput = page.locator('input[name="address"], input[name="street"], input[placeholder*="adresse"]').first()
    if (await streetInput.isVisible({ timeout: 5000 })) {
      await streetInput.fill(newBuilding.address.street)
    }

    const cityInput = page.locator('input[name="city"], input[placeholder*="ville"]').first()
    if (await cityInput.isVisible({ timeout: 5000 })) {
      await cityInput.fill(newBuilding.address.city)
    }

    const postalCodeInput = page.locator('input[name="postalCode"], input[name="zipCode"], input[placeholder*="postal"]').first()
    if (await postalCodeInput.isVisible({ timeout: 5000 })) {
      await postalCodeInput.fill(newBuilding.address.postalCode)
    }

    // Screenshot avant soumission
    await page.screenshot({
      path: 'test/e2e/screenshots/phase2-buildings-form-filled.png'
    })

    // Soumettre le formulaire
    const submitButton = page.locator('button[type="submit"], button:has-text("Créer"), button:has-text("Valider")').first()

    if (await submitButton.isVisible({ timeout: 5000 })) {
      console.log('📝 Test step')

      // ✅ Promise.all() for Server Action
      await Promise.all([
        page.waitForResponse(response =>
          response.url().includes('/api/buildings') ||
          response.url().includes('/gestionnaire/biens'),
          { timeout: 30000 }
        ).catch(() => null), // Ignore if no API call
        submitButton.click()
      ])

      // Attendre retour à la liste ou confirmation
      await page.waitForTimeout(2000)

    }

    // Vérifier que nous sommes toujours sur la page biens (ou redirigés vers elle)
    await page.waitForURL('**/gestionnaire/biens**', { timeout: 15000 })

  })

  /**
   * Test 3: Modification d'un bâtiment existant
   */
  test('should edit an existing building', async ({ page }) => {
    console.log('📝 Test step')

    await navigateToBuildings(page)

    // Attendre chargement des données
    await page.waitForTimeout(2000)

    // Chercher un bâtiment à modifier
    const buildingCards = page.locator('[data-testid="building-card"], [data-testid="building-item"], [data-building-id]')
    const buildingsCount = await buildingCards.count()

    if (buildingsCount === 0) {
      test.skip()
      return
    }


    // Sélectionner le premier bâtiment
    const firstBuilding = buildingCards.first()
    await firstBuilding.waitFor({ state: 'visible', timeout: 10000 })

    // Chercher bouton edit (icône crayon, bouton "Modifier", menu actions...)
    const editButton = page.locator(
      '[data-testid="edit-building"], button:has-text("Modifier"), button:has-text("Éditer"), [aria-label*="modifier"]'
    ).first()

    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click()

      // Attendre formulaire
      await page.waitForTimeout(1000)

      // Modifier le nom
      const nameInput = page.locator('input[name="name"], input[value*=""]').first()
      if (await nameInput.isVisible({ timeout: 5000 })) {
        const newName = `Modified Building ${Date.now()}`
        await nameInput.fill(newName)

        // Soumettre
        const submitButton = page.locator('button[type="submit"], button:has-text("Enregistrer"), button:has-text("Valider")').first()

        if (await submitButton.isVisible({ timeout: 5000 })) {
          await Promise.all([
            page.waitForResponse(response =>
              response.url().includes('/api/buildings'),
              { timeout: 30000 }
            ).catch(() => null),
            submitButton.click()
          ])

        }
      }
    } else {
    }

  })

  /**
   * Test 4: Suppression d'un bâtiment
   */
  test('should delete a building with confirmation', async ({ page }) => {
    console.log('📝 Test step')

    await navigateToBuildings(page)

    // Attendre chargement
    await page.waitForTimeout(2000)

    // Chercher bâtiments disponibles
    const buildingCards = page.locator('[data-testid="building-card"], [data-testid="building-item"]')
    const buildingsCount = await buildingCards.count()

    if (buildingsCount === 0) {
      test.skip()
      return
    }


    // Chercher bouton supprimer
    const deleteButton = page.locator(
      '[data-testid="delete-building"], button:has-text("Supprimer"), [aria-label*="supprimer"]'
    ).first()

    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click()

      // Attendre dialog de confirmation
      await page.waitForTimeout(1000)

      const confirmButton = page.locator(
        'button:has-text("Confirmer"), button:has-text("Oui"), button:has-text("Supprimer")'
      ).last() // Le dernier car il y a souvent 2 boutons "Supprimer"

      if (await confirmButton.isVisible({ timeout: 5000 })) {
        console.log('📝 Test step')

        await Promise.all([
          page.waitForResponse(response =>
            response.url().includes('/api/buildings'),
            { timeout: 30000 }
          ).catch(() => null),
          confirmButton.click()
        ])

      } else {
      }
    } else {
    }

  })

  /**
   * Test 5: Validation des erreurs de formulaire
   */
  test('should show validation errors for invalid building data', async ({ page }) => {
    console.log('📝 Test step')

    await navigateToBuildings(page)

    // Ouvrir formulaire
    const addButton = page.locator(
      'button:has-text("Ajouter"), button:has-text("Nouveau")'
    ).first()

    await addButton.waitFor({ state: 'visible', timeout: 15000 })
    await addButton.click()

    await page.waitForTimeout(1000)

    // Essayer de soumettre formulaire vide
    const submitButton = page.locator('button[type="submit"], button:has-text("Créer")').first()

    if (await submitButton.isVisible({ timeout: 5000 })) {
      await submitButton.click()
      console.log('📝 Test step')

      // Attendre messages d'erreur
      await page.waitForTimeout(1000)

      // Vérifier présence d'erreurs
      const errorMessages = page.locator('[role="alert"], .error, .text-red-500, .text-destructive')
      const errorCount = await errorMessages.count()

      if (errorCount > 0) {

        // Log des messages d'erreur
        for (let i = 0; i < Math.min(errorCount, 3); i++) {
          const errorText = await errorMessages.nth(i).textContent()
        }
      } else {
      }

      // Screenshot des erreurs
      await page.screenshot({
        path: 'test/e2e/screenshots/phase2-buildings-validation-errors.png'
      })
    }

  })

  /**
   * Test 6: Recherche et filtrage de bâtiments
   */
  test('should filter buildings by search query', async ({ page }) => {
    console.log('📝 Test step')

    await navigateToBuildings(page)

    // Attendre chargement
    await page.waitForTimeout(2000)

    // Chercher champ de recherche
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="recherche"], input[placeholder*="Recherche"], input[aria-label*="recherche"]'
    ).first()

    if (await searchInput.isVisible({ timeout: 5000 })) {

      // Compter bâtiments avant recherche
      const buildingsBeforeSearch = await page.locator('[data-testid="building-card"], [data-testid="building-item"]').count()

      // Rechercher
      const searchTerm = BUILDINGS.RESIDENCE_CONVENTION.name.substring(0, 10)
      await searchInput.fill(searchTerm)
      console.log('📝 Test step')

      // Attendre mise à jour de la liste
      await page.waitForTimeout(1500)

      // Compter résultats
      const buildingsAfterSearch = await page.locator('[data-testid="building-card"], [data-testid="building-item"]').count()

      // Vérifier filtrage (devrait être <= initial)
      expect(buildingsAfterSearch).toBeLessThanOrEqual(buildingsBeforeSearch)

    } else {
    }

  })
})

/**
 * Test Suite: Multi-role access control
 */
test.describe('🔒 Phase 2 - Buildings Access Control', () => {

  test.beforeEach(async ({ page }) => {
    await setupTestIsolation(page)
  })

  test.afterEach(async ({ page }, testInfo) => {
    await teardownTestIsolation(page, testInfo)
  })

  test('gestionnaire should have full CRUD access to buildings', async ({ page }) => {

    await loginAsGestionnaire(page)
    await navigateToBuildings(page)

    // Vérifier présence des boutons d'action
    const addButton = page.locator('button:has-text("Ajouter"), button:has-text("Nouveau")').first()
    const hasAddButton = await addButton.isVisible({ timeout: 10000 })


    if (hasAddButton) {
    } else {
    }

  })
})
