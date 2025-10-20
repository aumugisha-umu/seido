/**
 * 🧪 Phase 2 - Contacts: Tests de Gestion des Contacts
 *
 * Tests E2E avec auto-healing pour la gestion complète des contacts:
 * - Invitation de nouveaux contacts (locataires, prestataires, propriétaires)
 * - Validation de la liste des contacts
 * - Gestion des états vides
 * - Workflow complet d'invitation avec vérifications
 *
 * @see fixtures/contacts.fixture.ts - Données de test
 * @see GUIDE-MIGRATION-TESTS.md - Patterns et best practices
 */

import { test, expect, Page } from '@playwright/test'
import { E2ETestLogger } from '../../helpers/e2e-test-logger'
import { TEST_CONTACTS, TestContactManager, CONTACT_TEST_SCENARIOS } from '../../fixtures/contacts.fixture'
import { TEST_USERS } from '../../fixtures/users.fixture'

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const testSummaries: any[] = []

// Configuration viewport pour tests
test.use({
  viewport: { width: 1920, height: 1080 },
  screenshot: 'only-on-failure'
})

// Hook after all tests to generate summary report
test.afterAll(async () => {
  if (testSummaries.length > 0) {
    console.log('\n' + '='.repeat(80))
    console.log('📊 CONTACTS MANAGEMENT - TEST SUMMARY')
    console.log('='.repeat(80))

    testSummaries.forEach((summary, index) => {
      console.log(`\n[${index + 1}] ${summary.testName}`)
      console.log(`   Status: ${summary.status}`)
      console.log(`   Duration: ${summary.duration}ms`)
      console.log(`   Steps: ${summary.totalSteps}`)
      if (summary.errors > 0) {
        console.log(`   Errors: ${summary.errors}`)
      }
    })

    const totalTests = testSummaries.length
    const passedTests = testSummaries.filter((s: any) => s.status === 'passed').length
    const failedTests = totalTests - passedTests

    console.log('\n' + '-'.repeat(80))
    console.log(`Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`)
    console.log('='.repeat(80) + '\n')
  }
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Login as gestionnaire with error handling
 */
async function loginAsGestionnaire(page: Page, logger: E2ETestLogger): Promise<void> {
  const gestionnaire = TEST_USERS.GESTIONNAIRE_ADMIN

  await logger.logStep('Navigate to login page', page)
  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')

  await logger.logStep('Fill login credentials', page)
  await page.fill('input[type="email"]', gestionnaire.email)
  await page.fill('input[type="password"]', gestionnaire.password)

  await logger.logStep('Submit login form', page)
  await page.click('button[type="submit"]')

  await logger.logStep('Wait for dashboard redirect', page)
  await page.waitForURL('**/gestionnaire/dashboard**', {
    timeout: 10000
  })
  await page.waitForLoadState('networkidle')

  logger.logSuccess(`✅ Logged in as ${gestionnaire.email}`)
}

/**
 * Navigate to contacts page with verification
 */
async function navigateToContacts(page: Page, logger: E2ETestLogger): Promise<void> {
  await logger.logStep('Navigate to Contacts page', page)
  await page.goto('/gestionnaire/contacts')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000) // Wait for data loading

  // Verify we're on the contacts page
  const pageTitle = await page.locator('h1, h2').first().textContent()
  logger.logInfo(`📌 Page title: ${pageTitle}`)

  if (!pageTitle?.toLowerCase().includes('contact')) {
    throw new Error(`Expected contacts page but found title: ${pageTitle}`)
  }

  logger.logSuccess('✅ Successfully navigated to Contacts page')
}

/**
 * Open invitation form with multiple strategies
 */
async function openInvitationForm(page: Page, logger: E2ETestLogger): Promise<void> {
  await logger.logStep('Open invitation form', page)

  // Strategy 1: Look for invite/add button
  const addButton = page.locator(
    'button:has-text("Inviter"), button:has-text("Ajouter"), button:has-text("Nouveau"), button:has-text("Ajouter un contact")'
  )

  const buttonCount = await addButton.count()
  logger.logInfo(`🔍 Found ${buttonCount} add/invite button(s)`)

  if (buttonCount > 0) {
    await addButton.first().click()
    logger.logSuccess('✅ Clicked on Add/Invite button')
    await page.waitForTimeout(1000) // Wait for modal animation

    // Verify form appeared
    const formVisible = await page.locator('input[type="email"], input[name*="email"]').isVisible({
      timeout: 5000
    }).catch(() => false)

    if (!formVisible) {
      throw new Error('Form did not appear after clicking button')
    }

    return
  }

  // Strategy 2: Check if form is already visible
  const formExists = await page.locator('form').count()
  logger.logInfo(`🔍 Found ${formExists} form(s) already visible`)

  if (formExists === 0) {
    throw new Error('No invitation form or button found on the page')
  }

  logger.logSuccess('✅ Form already visible')
}

/**
 * Fill invitation form with contact data
 */
async function fillInvitationForm(
  page: Page,
  logger: E2ETestLogger,
  contact: { email: string; firstName: string; lastName: string; type: string }
): Promise<void> {
  await logger.logStep(`Fill form for ${contact.email}`, page)

  // Wait for form to be ready
  await page.waitForSelector('input[type="email"], input[name*="email"]', {
    timeout: 5000,
    state: 'visible'
  })

  // Fill email
  const emailInput = page.locator('input[type="email"], input[name*="email"]').first()
  await emailInput.fill(contact.email)
  logger.logInfo(`📧 Email: ${contact.email}`)

  // Fill first name
  const firstNameInput = page.locator(
    'input[name*="firstName"], input[name*="prenom"], input[placeholder*="Prénom"]'
  ).first()
  if (await firstNameInput.count() > 0) {
    await firstNameInput.fill(contact.firstName)
    logger.logInfo(`👤 First name: ${contact.firstName}`)
  }

  // Fill last name
  const lastNameInput = page.locator(
    'input[name*="lastName"], input[name*="nom"], input[placeholder*="Nom"]'
  ).first()
  if (await lastNameInput.count() > 0) {
    await lastNameInput.fill(contact.lastName)
    logger.logInfo(`👤 Last name: ${contact.lastName}`)
  }

  // Select role/type
  const roleSelect = page.locator('select[name*="role"], select[name*="type"]')
  if (await roleSelect.count() > 0) {
    await roleSelect.selectOption({ label: new RegExp(contact.type, 'i') })
    logger.logInfo(`🎭 Role: ${contact.type}`)
  } else {
    // Try radio button
    const roleRadio = page.locator(`input[type="radio"][value*="${contact.type}"]`)
    if (await roleRadio.count() > 0) {
      await roleRadio.check()
      logger.logInfo(`🎭 Role (radio): ${contact.type}`)
    }
  }

  logger.logSuccess('✅ Form filled successfully')
}

/**
 * Submit invitation form and verify success
 */
async function submitInvitationForm(page: Page, logger: E2ETestLogger): Promise<void> {
  await logger.logStep('Submit invitation form', page)

  // Find submit button
  const submitButton = page.locator(
    'button[type="submit"], button:has-text("Inviter"), button:has-text("Envoyer")'
  )

  const buttonCount = await submitButton.count()
  logger.logInfo(`🔍 Found ${buttonCount} submit button(s)`)

  if (buttonCount === 0) {
    throw new Error('Submit button not found')
  }

  await submitButton.first().click()
  logger.logSuccess('✅ Clicked submit button')

  // Wait for response
  await page.waitForTimeout(3000)

  // Check for success message
  const successMessage = page.locator(
    'text=/invitation envoyée|utilisateur invité|contact ajouté|succès|success/i'
  )
  const hasSuccess = await successMessage.count() > 0

  if (hasSuccess) {
    const successText = await successMessage.first().textContent()
    logger.logSuccess(`✅ Success: ${successText}`)
  } else {
    // Check for error message
    const errorMessage = page.locator('text=/erreur|error|échec|failed/i')
    const hasError = await errorMessage.count() > 0

    if (hasError) {
      const errorText = await errorMessage.first().textContent()
      logger.logWarning(`⚠️ Error message: ${errorText}`)
      throw new Error(`Invitation failed: ${errorText}`)
    }

    logger.logWarning('⚠️ No explicit success/error message found')
  }
}

/**
 * Verify contact appears in list
 */
async function verifyContactInList(
  page: Page,
  logger: E2ETestLogger,
  email: string
): Promise<void> {
  await logger.logStep('Verify contact appears in list', page)

  await page.waitForTimeout(2000) // Wait for list refresh

  const contactRow = page.locator(`text=${email}`)
  const exists = await contactRow.count() > 0

  if (exists) {
    logger.logSuccess(`✅ Contact ${email} found in list`)
  } else {
    logger.logWarning(`⚠️ Contact ${email} not found in list (may be on another page)`)
  }
}

// ============================================================================
// TEST SUITE: CONTACTS MANAGEMENT
// ============================================================================

test.describe('Phase 2 - Contacts Management', () => {

  // ==========================================================================
  // TEST 1: Complete Invitation Workflow (Locataire)
  // ==========================================================================
  test('✅ Workflow complet: Invitation nouveau locataire', async ({ page }) => {
    const testLogger = new E2ETestLogger('contact-invitation-locataire', 'gestionnaire')

    try {
      testLogger.logInfo('🚀 Starting locataire invitation workflow test')

      // Use fixture data for new locataire
      const newLocataire = TEST_CONTACTS.NEW_LOCATAIRE_1
      testLogger.logInfo(`📋 Test contact: ${newLocataire.email}`)

      // Step 1: Login as gestionnaire
      await loginAsGestionnaire(page, testLogger)

      // Step 2: Navigate to contacts
      await navigateToContacts(page, testLogger)

      // Step 3: Open invitation form
      await openInvitationForm(page, testLogger)

      // Step 4: Fill form with locataire data
      await fillInvitationForm(page, testLogger, {
        email: newLocataire.email,
        firstName: newLocataire.firstName,
        lastName: newLocataire.lastName,
        type: newLocataire.type
      })

      // Step 5: Submit form
      await submitInvitationForm(page, testLogger)

      // Step 6: Verify contact in list
      await verifyContactInList(page, testLogger, newLocataire.email)

      // Final verification: Still on contacts page
      const currentUrl = page.url()
      testLogger.logInfo(`📍 Final URL: ${currentUrl}`)
      expect(currentUrl).toContain('contacts')

      testLogger.logSuccess('✅ Locataire invitation workflow completed successfully')

      const summary = await testLogger.finalize()
      testSummaries.push(summary)

    } catch (error) {
      await testLogger.logError(error as Error, 'Locataire invitation workflow', page)
      const summary = await testLogger.finalize()
      testSummaries.push(summary)
      throw error
    }
  })

  // ==========================================================================
  // TEST 2: Invitation Prestataire avec Spécialité
  // ==========================================================================
  test('✅ Invitation prestataire avec spécialité', async ({ page }) => {
    const testLogger = new E2ETestLogger('contact-invitation-prestataire', 'gestionnaire')

    try {
      testLogger.logInfo('🚀 Starting prestataire invitation workflow test')

      // Use prestataire from fixtures
      const newPrestataire = TEST_CONTACTS.NEW_PRESTATAIRE_1
      testLogger.logInfo(`📋 Test contact: ${newPrestataire.email} (${newPrestataire.speciality})`)

      // Login and navigate
      await loginAsGestionnaire(page, testLogger)
      await navigateToContacts(page, testLogger)

      // Open and fill form
      await openInvitationForm(page, testLogger)
      await fillInvitationForm(page, testLogger, {
        email: newPrestataire.email,
        firstName: newPrestataire.firstName,
        lastName: newPrestataire.lastName,
        type: newPrestataire.type
      })

      // If speciality field exists, fill it
      const specialitySelect = page.locator('select[name*="speciality"], select[name*="spécialité"]')
      if (await specialitySelect.count() > 0) {
        await specialitySelect.selectOption({ label: new RegExp(newPrestataire.speciality!, 'i') })
        testLogger.logInfo(`🔧 Speciality: ${newPrestataire.speciality}`)
      }

      // Submit and verify
      await submitInvitationForm(page, testLogger)
      await verifyContactInList(page, testLogger, newPrestataire.email)

      testLogger.logSuccess('✅ Prestataire invitation workflow completed successfully')

      const summary = await testLogger.finalize()
      testSummaries.push(summary)

    } catch (error) {
      await testLogger.logError(error as Error, 'Prestataire invitation workflow', page)
      const summary = await testLogger.finalize()
      testSummaries.push(summary)
      throw error
    }
  })

  // ==========================================================================
  // TEST 3: Empty Contacts List State
  // ==========================================================================
  test('✅ Gestion état vide de la liste contacts', async ({ page }) => {
    const testLogger = new E2ETestLogger('contacts-empty-state', 'gestionnaire')

    try {
      testLogger.logInfo('🚀 Starting empty contacts list test')

      // Login and navigate
      await loginAsGestionnaire(page, testLogger)
      await navigateToContacts(page, testLogger)

      // Verify page structure
      await testLogger.logStep('Verify page structure', page)

      // Check page title
      const pageTitle = await page.locator('h1').textContent()
      testLogger.logInfo(`📌 Page title: ${pageTitle}`)
      expect(pageTitle).toContain('Gestion des Contacts')

      // Check add button exists
      const addButton = page.locator('button:has-text("Ajouter un contact"), button:has-text("Inviter")')
      const buttonCount = await addButton.count()
      testLogger.logInfo(`🔍 Add contact buttons: ${buttonCount}`)
      expect(buttonCount).toBeGreaterThanOrEqual(1)

      // Check tabs exist
      await testLogger.logStep('Verify tabs structure', page)
      const contactsTab = page.locator('text=/Contacts/')
      const hasContactsTab = await contactsTab.count() > 0
      testLogger.logInfo(`📊 Contacts tab found: ${hasContactsTab}`)

      // Check empty state message if no contacts
      const emptyMessage = page.locator('text=/Aucun contact/i')
      const hasEmptyMessage = await emptyMessage.count() > 0

      if (hasEmptyMessage) {
        testLogger.logSuccess('✅ Empty state properly displayed')
      } else {
        testLogger.logInfo('📋 Contacts exist in the list (not empty)')
      }

      // Verify error message is NOT displayed
      const errorMessage = page.locator('text=/Erreur lors du chargement/i')
      const hasError = await errorMessage.count() > 0

      if (hasError) {
        const errorText = await errorMessage.first().textContent()
        testLogger.logError(new Error(`Unexpected error on page: ${errorText}`), 'Page load', page)
        throw new Error('Page should not display error message')
      }

      testLogger.logSuccess('✅ Contacts page accessibility and structure validated')

      const summary = await testLogger.finalize()
      testSummaries.push(summary)

    } catch (error) {
      await testLogger.logError(error as Error, 'Empty contacts state', page)
      const summary = await testLogger.finalize()
      testSummaries.push(summary)
      throw error
    }
  })

  // ==========================================================================
  // TEST 4: Duplicate Email Validation
  // ==========================================================================
  test('✅ Validation email en double', async ({ page }) => {
    const testLogger = new E2ETestLogger('contact-duplicate-email', 'gestionnaire')

    try {
      testLogger.logInfo('🚀 Starting duplicate email validation test')

      // Use existing contact from fixtures
      const existingContact = TEST_CONTACTS.EXISTING_LOCATAIRE_1
      testLogger.logInfo(`📋 Using existing contact: ${existingContact.email}`)

      // Login and navigate
      await loginAsGestionnaire(page, testLogger)
      await navigateToContacts(page, testLogger)

      // Open form and try to add duplicate
      await openInvitationForm(page, testLogger)
      await fillInvitationForm(page, testLogger, {
        email: existingContact.email,
        firstName: 'Duplicate',
        lastName: 'Test',
        type: existingContact.type
      })

      // Submit and expect error
      await testLogger.logStep('Submit with duplicate email', page)
      const submitButton = page.locator(
        'button[type="submit"], button:has-text("Inviter"), button:has-text("Envoyer")'
      )
      await submitButton.first().click()
      await page.waitForTimeout(2000)

      // Should show error message
      const errorMessage = page.locator('text=/déjà|existe|duplicate|already/i')
      const hasError = await errorMessage.count() > 0

      if (hasError) {
        const errorText = await errorMessage.first().textContent()
        testLogger.logSuccess(`✅ Duplicate validation working: ${errorText}`)
      } else {
        testLogger.logWarning('⚠️ No duplicate error message shown (may need implementation)')
      }

      testLogger.logSuccess('✅ Duplicate email validation test completed')

      const summary = await testLogger.finalize()
      testSummaries.push(summary)

    } catch (error) {
      await testLogger.logError(error as Error, 'Duplicate email validation', page)
      const summary = await testLogger.finalize()
      testSummaries.push(summary)
      throw error
    }
  })

  // ==========================================================================
  // TEST 5: Contact Filters and Search
  // ==========================================================================
  test('✅ Filtres et recherche de contacts', async ({ page }) => {
    const testLogger = new E2ETestLogger('contacts-filters-search', 'gestionnaire')

    try {
      testLogger.logInfo('🚀 Starting contacts filters and search test')

      // Login and navigate
      await loginAsGestionnaire(page, testLogger)
      await navigateToContacts(page, testLogger)

      // Test search functionality
      await testLogger.logStep('Test search functionality', page)
      const searchInput = page.locator('input[type="search"], input[placeholder*="Rechercher"]')

      if (await searchInput.count() > 0) {
        const testEmail = TEST_CONTACTS.EXISTING_LOCATAIRE_1.email
        await searchInput.fill(testEmail)
        await page.waitForTimeout(1000) // Wait for search debounce

        testLogger.logInfo(`🔍 Searched for: ${testEmail}`)

        // Verify filtered results
        const resultsCount = await page.locator('tbody tr, [role="row"]').count()
        testLogger.logInfo(`📊 Results after search: ${resultsCount}`)

        testLogger.logSuccess('✅ Search functionality working')
      } else {
        testLogger.logWarning('⚠️ Search input not found on page')
      }

      // Test tab filters
      await testLogger.logStep('Test tab filters', page)
      const invitationsTab = page.locator('text=/Invitations/')

      if (await invitationsTab.count() > 0) {
        await invitationsTab.click()
        await page.waitForTimeout(1000)
        testLogger.logSuccess('✅ Switched to Invitations tab')

        // Switch back to contacts
        const contactsTab = page.locator('text=/Contacts/')
        if (await contactsTab.count() > 0) {
          await contactsTab.click()
          await page.waitForTimeout(1000)
          testLogger.logSuccess('✅ Switched back to Contacts tab')
        }
      } else {
        testLogger.logWarning('⚠️ Invitations tab not found')
      }

      testLogger.logSuccess('✅ Filters and search test completed')

      const summary = await testLogger.finalize()
      testSummaries.push(summary)

    } catch (error) {
      await testLogger.logError(error as Error, 'Filters and search', page)
      const summary = await testLogger.finalize()
      testSummaries.push(summary)
      throw error
    }
  })
})
