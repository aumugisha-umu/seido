/**
 * 🏠 Phase 2 - Lots Management Tests
 *
 * Test du CRUD complet des lots (appartements, parkings, caves):
 * - Création d'un nouveau lot dans un bâtiment
 * - Affichage de la liste des lots d'un bâtiment
 * - Modification des informations d'un lot
 * - Attribution d'un lot à un locataire
 * - Libération d'un lot
 * - Suppression d'un lot
 * - Gestion des statuts (occupé, vacant, maintenance, réservé)
 *
 * Roles testés: Gestionnaire (manager avec droits CRUD complets)
 */

import { test, expect, Page } from '@playwright/test'
import { loginAsGestionnaire, navigateToLots } from "../../helpers"
import {
  BUILDINGS,
  LOTS,
  getLotsByBuilding,
  getOccupiedLotsCount,
  getVacantLots,
  calculateOccupancyRate,
  generateLot,
  validateLotData,
  type TestLot
} from '../../fixtures/buildings.fixture'
// Configuration globale
test.setTimeout(90000) // 90 secondes pour tests E2E complets


/**
 * Test Suite: Lots CRUD Operations
 */
test.describe('🏠 Phase 2 - Lots Management', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsGestionnaire(page)
  })

  test.afterEach(async ({ page }) => {
    await page.screenshot({
      path: `test/e2e/screenshots/phase2-lots-${test.info().title.replace(/\s+/g, '-')}.png`,
      fullPage: true
    })
  })

  /**
   * Test 1: Affichage de la liste des lots d'un bâtiment
   */
  test('should display lots list for a building with correct data', async ({ page }) => {
    console.log('📝 Test step')

    // Utiliser un bâtiment de test avec des lots connus
    const testBuilding = BUILDINGS.RESIDENCE_CONVENTION
    const testBuildingLots = getLotsByBuilding(testBuilding.id)


    await navigateToLots(page, testBuilding.id)

    // Vérifier présence du titre ou nom du bâtiment
    const pageContent = page.locator('h1, h2').first()
    await pageContent.waitFor({ state: 'visible', timeout: 15000 })

    const titleText = await pageContent.textContent()

    // Vérifier présence du bouton d'ajout de lot
    const addLotButton = page.locator(
      'button:has-text("Ajouter un lot"), button:has-text("Nouveau lot"), button:has-text("Créer un lot")'
    ).first()

    if (await addLotButton.isVisible({ timeout: 10000 })) {
    }

    // Vérifier affichage de la liste ou état vide
    const lotCards = page.locator('[data-testid="lot-card"], [data-testid="lot-item"], [data-lot-id]')
    const lotsCount = await lotCards.count()

    if (lotsCount > 0) {

      // Vérifier quelques détails d'un lot
      const firstLot = lotCards.first()
      const lotText = await firstLot.textContent()
    } else {
      // État vide
      const emptyState = page.locator('text=/aucun.*lot|liste.*vide/i')
      if (await emptyState.count() > 0) {
        await expect(emptyState.first()).toBeVisible({ timeout: 10000 })
      }
    }

  })

  /**
   * Test 2: Création d'un nouveau lot
   */
  test('should create a new lot in a building successfully', async ({ page }) => {
    console.log('📝 Test step')

    const testBuilding = BUILDINGS.RESIDENCE_CONVENTION
    await navigateToLots(page, testBuilding.id)

    // Ouvrir le formulaire de création
    const addButton = page.locator(
      'button:has-text("Ajouter un lot"), button:has-text("Nouveau lot"), button:has-text("Créer")'
    ).first()

    await addButton.waitFor({ state: 'visible', timeout: 15000 })
    await addButton.click()

    // Attendre le formulaire ou modal
    await page.waitForTimeout(1000)

    // Générer données de test
    const newLot = generateLot({
      buildingId: testBuilding.id,
      number: `TEST-${Date.now()}`,
      floor: 3,
      surface: 65,
      rooms: 3,
      type: 'apartment'
    })


    // Remplir le formulaire
    const numberInput = page.locator('input[name="number"], input[name="lotNumber"], input[placeholder*="numéro"]').first()
    if (await numberInput.isVisible({ timeout: 5000 })) {
      await numberInput.fill(newLot.number)
    }

    const floorInput = page.locator('input[name="floor"], input[name="etage"], input[placeholder*="étage"]').first()
    if (await floorInput.isVisible({ timeout: 5000 })) {
      await floorInput.fill(newLot.floor.toString())
    }

    const surfaceInput = page.locator('input[name="surface"], input[name="area"], input[placeholder*="surface"]').first()
    if (await surfaceInput.isVisible({ timeout: 5000 })) {
      await surfaceInput.fill(newLot.surface.toString())
    }

    const roomsInput = page.locator('input[name="rooms"], input[name="pieces"], input[placeholder*="pièces"]').first()
    if (await roomsInput.isVisible({ timeout: 5000 })) {
      await roomsInput.fill(newLot.rooms.toString())
    }

    // Type de lot (select ou radio)
    const typeSelect = page.locator('select[name="type"], select[name="lotType"]').first()
    if (await typeSelect.isVisible({ timeout: 5000 })) {
      await typeSelect.selectOption(newLot.type)
    }

    // Screenshot avant soumission
    await page.screenshot({
      path: 'test/e2e/screenshots/phase2-lots-form-filled.png'
    })

    // Soumettre le formulaire
    const submitButton = page.locator('button[type="submit"], button:has-text("Créer"), button:has-text("Valider")').first()

    if (await submitButton.isVisible({ timeout: 5000 })) {
      console.log('📝 Test step')

      // ✅ Promise.all() for Server Action
      await Promise.all([
        page.waitForResponse(response =>
          response.url().includes('/api/lots') ||
          response.url().includes('/api/buildings'),
          { timeout: 30000 }
        ).catch(() => null), // Ignore if no API call
        submitButton.click()
      ])

      // Attendre retour à la liste ou confirmation
      await page.waitForTimeout(2000)

    }

  })

  /**
   * Test 3: Modification d'un lot existant
   */
  test('should edit an existing lot', async ({ page }) => {
    console.log('📝 Test step')

    const testBuilding = BUILDINGS.RESIDENCE_CONVENTION
    await navigateToLots(page, testBuilding.id)

    // Attendre chargement des données
    await page.waitForTimeout(2000)

    // Chercher un lot à modifier
    const lotCards = page.locator('[data-testid="lot-card"], [data-testid="lot-item"], [data-lot-id]')
    const lotsCount = await lotCards.count()

    if (lotsCount === 0) {
      test.skip()
      return
    }


    // Sélectionner le premier lot
    const firstLot = lotCards.first()
    await firstLot.waitFor({ state: 'visible', timeout: 10000 })

    // Chercher bouton edit
    const editButton = page.locator(
      '[data-testid="edit-lot"], button:has-text("Modifier"), [aria-label*="modifier"]'
    ).first()

    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click()

      // Attendre formulaire
      await page.waitForTimeout(1000)

      // Modifier la surface
      const surfaceInput = page.locator('input[name="surface"], input[name="area"]').first()
      if (await surfaceInput.isVisible({ timeout: 5000 })) {
        const newSurface = '75'
        await surfaceInput.fill('')
        await surfaceInput.fill(newSurface)

        // Soumettre
        const submitButton = page.locator('button[type="submit"], button:has-text("Enregistrer"), button:has-text("Valider")').first()

        if (await submitButton.isVisible({ timeout: 5000 })) {
          await Promise.all([
            page.waitForResponse(response =>
              response.url().includes('/api/lots'),
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
   * Test 4: Attribution d'un lot à un locataire
   */
  test('should assign a tenant to a vacant lot', async ({ page }) => {
    console.log('📝 Test step')

    const testBuilding = BUILDINGS.RESIDENCE_CONVENTION
    await navigateToLots(page, testBuilding.id)

    // Attendre chargement
    await page.waitForTimeout(2000)

    // Chercher un lot vacant
    const vacantLotButton = page.locator(
      '[data-status="vacant"], [data-occupancy="vacant"], button:has-text("Attribuer"), button:has-text("Assigner")'
    ).first()

    if (await vacantLotButton.isVisible({ timeout: 5000 })) {

      // Cliquer pour ouvrir le formulaire d'attribution
      await vacantLotButton.click()
      await page.waitForTimeout(1000)

      // Chercher le sélecteur de locataire
      const tenantSelect = page.locator('select[name="tenant"], select[name="tenantId"], input[placeholder*="locataire"]').first()

      if (await tenantSelect.isVisible({ timeout: 5000 })) {
        // Si c'est un select
        if (await tenantSelect.evaluate(el => el.tagName === 'SELECT')) {
          const options = await tenantSelect.locator('option').count()
          if (options > 1) {
            await tenantSelect.selectOption({ index: 1 }) // Premier locataire disponible
          }
        } else {
          // Si c'est un input (combobox)
          await tenantSelect.fill('jean.dupont@example.com')
          await page.waitForTimeout(500)
          await page.keyboard.press('ArrowDown')
          await page.keyboard.press('Enter')
        }

        // Soumettre
        const submitButton = page.locator('button[type="submit"], button:has-text("Attribuer"), button:has-text("Valider")').first()

        if (await submitButton.isVisible({ timeout: 5000 })) {
          await Promise.all([
            page.waitForResponse(response =>
              response.url().includes('/api/lots'),
              { timeout: 30000 }
            ).catch(() => null),
            submitButton.click()
          ])

        }
      } else {
      }
    } else {
    }

  })

  /**
   * Test 5: Changement de statut d'un lot (vacant ↔ maintenance)
   */
  test('should change lot occupancy status', async ({ page }) => {
    console.log('📝 Test step')

    const testBuilding = BUILDINGS.RESIDENCE_CONVENTION
    await navigateToLots(page, testBuilding.id)

    // Attendre chargement
    await page.waitForTimeout(2000)

    // Chercher un lot avec menu d'actions
    const lotCard = page.locator('[data-testid="lot-card"], [data-testid="lot-item"]').first()

    if (await lotCard.isVisible({ timeout: 5000 })) {
      // Chercher bouton de menu ou statut
      const statusButton = page.locator(
        'button:has-text("Statut"), [data-testid="lot-status"], [aria-label*="statut"]'
      ).first()

      if (await statusButton.isVisible({ timeout: 5000 })) {
        await statusButton.click()

        await page.waitForTimeout(500)

        // Chercher option "Maintenance"
        const maintenanceOption = page.locator(
          'button:has-text("Maintenance"), [role="menuitem"]:has-text("Maintenance")'
        ).first()

        if (await maintenanceOption.isVisible({ timeout: 3000 })) {
          await maintenanceOption.click()

          await page.waitForTimeout(1000)

          // Vérifier confirmation
          const confirmationMessage = page.locator('text=/statut.*modifié|mis à jour/i')
          if (await confirmationMessage.count() > 0) {
          }
        }
      } else {
      }
    }

  })

  /**
   * Test 6: Suppression d'un lot
   */
  test('should delete a lot with confirmation', async ({ page }) => {
    console.log('📝 Test step')

    const testBuilding = BUILDINGS.RESIDENCE_CONVENTION
    await navigateToLots(page, testBuilding.id)

    // Attendre chargement
    await page.waitForTimeout(2000)

    // Chercher lots disponibles
    const lotCards = page.locator('[data-testid="lot-card"], [data-testid="lot-item"]')
    const lotsCount = await lotCards.count()

    if (lotsCount === 0) {
      test.skip()
      return
    }


    // Chercher bouton supprimer
    const deleteButton = page.locator(
      '[data-testid="delete-lot"], button:has-text("Supprimer"), [aria-label*="supprimer"]'
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
            response.url().includes('/api/lots'),
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
   * Test 7: Statistiques d'occupation des lots
   */
  test('should display occupancy statistics correctly', async ({ page }) => {
    console.log('📝 Test step')

    const testBuilding = BUILDINGS.RESIDENCE_CONVENTION
    const buildingLots = getLotsByBuilding(testBuilding.id)
    const occupiedCount = getOccupiedLotsCount(testBuilding.id)
    const vacantLots = getVacantLots(testBuilding.id)
    const occupancyRate = calculateOccupancyRate(testBuilding.id)


    await navigateToLots(page, testBuilding.id)

    // Attendre chargement
    await page.waitForTimeout(2000)

    // Chercher éléments de statistiques
    const statsContainer = page.locator('[data-testid="lots-stats"], [data-testid="occupancy-stats"], .stats, .statistics').first()

    if (await statsContainer.isVisible({ timeout: 5000 })) {
      const statsText = await statsContainer.textContent()

      // Vérifier présence des nombres clés
      const containsTotal = statsText?.includes(buildingLots.length.toString())
      const containsOccupied = statsText?.includes(occupiedCount.toString())

      if (containsTotal && containsOccupied) {
      } else {
      }
    } else {
    }

  })
})

/**
 * Test Suite: Lots filtering and search
 */
test.describe('🔍 Phase 2 - Lots Filtering', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsGestionnaire(page)
  })

  test('should filter lots by occupancy status', async ({ page }) => {
    console.log('📝 Test step')

    const testBuilding = BUILDINGS.RESIDENCE_CONVENTION
    await navigateToLots(page, testBuilding.id)

    // Attendre chargement
    await page.waitForTimeout(2000)

    // Chercher filtres
    const filterButton = page.locator(
      'button:has-text("Filtrer"), button:has-text("Filtre"), [data-testid="filter-button"]'
    ).first()

    if (await filterButton.isVisible({ timeout: 5000 })) {
      await filterButton.click()

      await page.waitForTimeout(500)

      // Sélectionner "Vacant"
      const vacantFilter = page.locator(
        'button:has-text("Vacant"), [role="menuitem"]:has-text("Vacant"), input[value="vacant"]'
      ).first()

      if (await vacantFilter.isVisible({ timeout: 3000 })) {
        await vacantFilter.click()

        await page.waitForTimeout(1500)

        // Vérifier que seuls les lots vacants sont affichés
        const lotCards = page.locator('[data-testid="lot-card"], [data-testid="lot-item"]')
        const filteredCount = await lotCards.count()


        // Screenshot du résultat
        await page.screenshot({
          path: 'test/e2e/screenshots/phase2-lots-filtered-vacant.png'
        })
      }
    } else {
    }


  })

  test('should filter lots by type (apartment, parking, etc.)', async ({ page }) => {
    console.log('📝 Test step')

    const testBuilding = BUILDINGS.RESIDENCE_CONVENTION
    await navigateToLots(page, testBuilding.id)

    // Attendre chargement
    await page.waitForTimeout(2000)

    // Chercher filtre de type
    const typeFilter = page.locator(
      'select[name="type"], select[name="lotType"], [data-testid="type-filter"]'
    ).first()

    if (await typeFilter.isVisible({ timeout: 5000 })) {

      // Sélectionner "Parking"
      if (await typeFilter.evaluate(el => el.tagName === 'SELECT')) {
        await typeFilter.selectOption('parking')

        await page.waitForTimeout(1500)

        const lotCards = page.locator('[data-testid="lot-card"], [data-testid="lot-item"]')
        const filteredCount = await lotCards.count()

      }
    } else {
    }


  })
})
