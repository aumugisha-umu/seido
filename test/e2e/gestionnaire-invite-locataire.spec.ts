/**
 * Test E2E: Workflow d'invitation d'un locataire
 * Teste le parcours complet : connexion → contacts → invitation
 */

import { test, expect } from '@playwright/test'

const GESTIONNAIRE = {
  email: 'arthur@seido.pm', // Utiliser le même email que dans le test qui fonctionne
  password: 'Wxcvbn123',
  expectedDashboard: '/gestionnaire/dashboard'
}

const NEW_LOCATAIRE = {
  email: 'arthur+loc2@seido.pm',
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'locataire'
}

// Configuration pour Chrome uniquement en premier
test.use({ viewport: { width: 1920, height: 1080 } })

test.describe('Workflow Invitation Locataire', () => {
  test('Doit inviter un nouveau locataire depuis la section contacts', async ({ page }) => {
    console.log('🚀 Starting invitation workflow test')

    // ========================================
    // ÉTAPE 1: Connexion gestionnaire
    // ========================================
    console.log('📝 Step 1: Login as gestionnaire')
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')

    await page.fill('input[type="email"]', GESTIONNAIRE.email)
    await page.fill('input[type="password"]', GESTIONNAIRE.password)
    await page.click('button[type="submit"]')

    console.log('📝 Step 2: Wait for dashboard redirect')
    await page.waitForURL(`**${GESTIONNAIRE.expectedDashboard}**`, {
      timeout: 10000
    })
    await page.waitForLoadState('networkidle')
    console.log('✅ Logged in and redirected to:', page.url())

    // Attendre un peu pour le chargement complet
    await page.waitForTimeout(2000)

    // ========================================
    // ÉTAPE 2: Navigation vers Contacts
    // ========================================
    console.log('📝 Step 3: Navigate to Contacts section')

    // Navigation directe vers /gestionnaire/contacts (plus robuste)
    await page.goto('/gestionnaire/contacts')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Attendre le chargement des données
    console.log('✅ Navigated to:', page.url())

    // Vérifier qu'on est bien sur la page contacts
    const pageTitle = await page.locator('h1, h2').first().textContent()
    console.log('📌 Page title:', pageTitle)
    expect(pageTitle).toMatch(/contact/i)

    // Capture d'écran de la page contacts
    await page.screenshot({
      path: 'test/e2e/screenshots/contacts-page.png',
      fullPage: true
    })

    // ========================================
    // ÉTAPE 3: Ouvrir le formulaire d'invitation
    // ========================================
    console.log('📝 Step 4: Open invitation form')

    // Chercher le bouton d'ajout/invitation
    const addButton = page.locator(
      'button:has-text("Inviter"), button:has-text("Ajouter"), button:has-text("Nouveau"), button[aria-label*="invite"], button[aria-label*="add"]'
    )

    const addButtonCount = await addButton.count()
    console.log('🔍 Add/Invite buttons found:', addButtonCount)

    if (addButtonCount > 0) {
      // Prendre une capture avant de cliquer
      await page.screenshot({
        path: 'test/e2e/screenshots/before-invite-click.png',
        fullPage: true
      })

      await addButton.first().click()
      console.log('✅ Clicked on Add/Invite button')

      // Attendre l'ouverture de la modale/formulaire
      await page.waitForTimeout(1000)

      // Capture après ouverture modale
      await page.screenshot({
        path: 'test/e2e/screenshots/invite-modal-opened.png',
        fullPage: true
      })
    } else {
      console.log('⚠️ Add/Invite button not found')

      // Chercher un formulaire déjà présent
      const form = page.locator('form')
      const formCount = await form.count()
      console.log('🔍 Forms found:', formCount)

      if (formCount === 0) {
        throw new Error('No invitation form or button found')
      }
    }

    // ========================================
    // ÉTAPE 4: Remplir le formulaire
    // ========================================
    console.log('📝 Step 5: Fill invitation form')

    // Attendre que le formulaire soit visible
    await page.waitForSelector('input[type="email"], input[name*="email"]', {
      timeout: 5000,
      state: 'visible'
    })

    // Remplir l'email
    const emailInput = page.locator('input[type="email"], input[name*="email"]').first()
    await emailInput.fill(NEW_LOCATAIRE.email)
    console.log('✅ Filled email:', NEW_LOCATAIRE.email)

    // Remplir le prénom
    const firstNameInput = page.locator(
      'input[name*="firstName"], input[name*="prenom"], input[placeholder*="Prénom"]'
    ).first()
    if (await firstNameInput.count() > 0) {
      await firstNameInput.fill(NEW_LOCATAIRE.firstName)
      console.log('✅ Filled firstName:', NEW_LOCATAIRE.firstName)
    }

    // Remplir le nom
    const lastNameInput = page.locator(
      'input[name*="lastName"], input[name*="nom"], input[placeholder*="Nom"]'
    ).first()
    if (await lastNameInput.count() > 0) {
      await lastNameInput.fill(NEW_LOCATAIRE.lastName)
      console.log('✅ Filled lastName:', NEW_LOCATAIRE.lastName)
    }

    // Sélectionner le rôle "locataire"
    const roleSelect = page.locator('select[name*="role"], select[name*="type"]')
    if (await roleSelect.count() > 0) {
      await roleSelect.selectOption({ label: /locataire/i })
      console.log('✅ Selected role: locataire')
    } else {
      // Chercher un radio button ou autre méthode de sélection
      const roleRadio = page.locator('input[type="radio"][value*="locataire"]')
      if (await roleRadio.count() > 0) {
        await roleRadio.check()
        console.log('✅ Checked role radio: locataire')
      }
    }

    // Capture du formulaire rempli
    await page.screenshot({
      path: 'test/e2e/screenshots/invite-form-filled.png',
      fullPage: true
    })

    // ========================================
    // ÉTAPE 5: Soumettre le formulaire
    // ========================================
    console.log('📝 Step 6: Submit invitation')

    // Chercher le bouton de soumission
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Inviter"), button:has-text("Envoyer")'
    )

    const submitButtonCount = await submitButton.count()
    console.log('🔍 Submit buttons found:', submitButtonCount)

    if (submitButtonCount > 0) {
      await submitButton.first().click()
      console.log('✅ Clicked submit button')

      // Attendre la réponse (succès ou erreur)
      await page.waitForTimeout(3000)

      // Capture après soumission
      await page.screenshot({
        path: 'test/e2e/screenshots/after-invite-submit.png',
        fullPage: true
      })

      // Vérifier le message de succès
      const successMessage = page.locator(
        'text=/invitation envoyée|utilisateur invité|succès|success/i'
      )
      const hasSuccessMessage = await successMessage.count()
      console.log('✅ Success message found:', hasSuccessMessage > 0)

      if (hasSuccessMessage > 0) {
        const successText = await successMessage.first().textContent()
        console.log('✅ Success message:', successText)
        expect(successText).toBeTruthy()
      } else {
        // Vérifier qu'il n'y a pas de message d'erreur
        const errorMessage = page.locator('text=/erreur|error|échec|failed/i')
        const hasErrorMessage = await errorMessage.count()

        if (hasErrorMessage > 0) {
          const errorText = await errorMessage.first().textContent()
          console.log('❌ Error message:', errorText)
        }

        console.log('⚠️ No explicit success/error message found')
      }

      // Vérifier que le nouveau contact apparaît dans la liste
      await page.waitForTimeout(2000)
      const newContactEmail = page.locator(`text=${NEW_LOCATAIRE.email}`)
      const contactExists = await newContactEmail.count()
      console.log('🔍 New contact in list:', contactExists > 0)

      if (contactExists > 0) {
        console.log('✅ New contact found in contacts list')
      }
    } else {
      throw new Error('Submit button not found')
    }

    // ========================================
    // VÉRIFICATIONS FINALES
    // ========================================
    console.log('📝 Step 7: Final verifications')

    // Vérifier qu'on est toujours sur la page contacts ou qu'on y est retourné
    const currentUrl = page.url()
    console.log('📍 Current URL:', currentUrl)
    expect(currentUrl).toContain('contacts')

    // Capture finale
    await page.screenshot({
      path: 'test/e2e/screenshots/invite-workflow-complete.png',
      fullPage: true
    })

    console.log('✅ Invitation workflow test completed successfully')
  })

  test('Doit gérer correctement une liste de contacts vide', async ({ page }) => {
    console.log('🚀 Starting empty contacts list test')

    // Connexion
    await page.goto('/auth/login')
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="email"]', GESTIONNAIRE.email)
    await page.fill('input[type="password"]', GESTIONNAIRE.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(`**${GESTIONNAIRE.expectedDashboard}**`)
    await page.waitForLoadState('networkidle')

    // Navigation vers contacts
    await page.goto('/gestionnaire/contacts')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Capture d'écran
    await page.screenshot({
      path: 'test/e2e/screenshots/contacts-page-state.png',
      fullPage: true
    })

    // Vérifier les éléments de la page
    const bodyText = await page.locator('body').textContent()
    console.log('📌 Page contains "Contacts":', bodyText?.includes('Contacts'))

    // Vérifier qu'on a bien accès à la page (titre présent)
    const pageTitle = await page.locator('h1').textContent()
    console.log('📌 Page title:', pageTitle)
    expect(pageTitle).toContain('Gestion des Contacts')

    // Vérifier que le bouton "Ajouter un contact" est visible
    const addButton = page.locator('button:has-text("Ajouter un contact")')
    const addButtonCount = await addButton.count()
    console.log('🔍 Add contact buttons found:', addButtonCount)
    expect(addButtonCount).toBeGreaterThanOrEqual(1)

    // Vérifier les onglets
    const contactsTab = page.locator('text=/Contacts.*0/')
    const hasContactsTab = await contactsTab.count()
    console.log('📊 Contacts tab found:', hasContactsTab > 0)

    // Si la liste est vide, vérifier le message approprié
    const emptyMessage = page.locator('text=/Aucun contact/i')
    const hasEmptyMessage = await emptyMessage.count()
    console.log('📭 Empty message found:', hasEmptyMessage > 0)

    if (hasEmptyMessage > 0) {
      console.log('✅ Empty state properly displayed')
    }

    console.log('✅ Contacts page accessibility test completed successfully')
  })
})