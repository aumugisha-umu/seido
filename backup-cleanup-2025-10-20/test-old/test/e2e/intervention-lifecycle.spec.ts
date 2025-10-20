import { test, expect } from '@playwright/test'

test.describe('Intervention Lifecycle E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/')
  })

  test('complete intervention workflow from tenant to provider', async ({
    page,
    context
  }) => {
    // 1. Locataire se connecte et crée une demande
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'sophie.tenant@email.fr')
    await page.fill('[name="password"]', 'demo123')
    await page.click('button[type="submit"]')

    // Verify successful login
    await expect(page).toHaveURL(/\/locataire/)

    // Navigate to new intervention form
    await page.goto('/locataire/interventions/nouvelle')

    // Fill intervention form
    await page.selectOption('[name="type"]', 'plomberie')
    await page.selectOption('[name="urgency"]', 'haute')
    await page.fill('[name="title"]', 'Fuite urgente salle de bain')
    await page.fill('[name="description"]', 'Fuite importante au niveau du lavabo')
    await page.fill('[name="location_details"]', 'Salle de bain principale')

    // Submit intervention
    await page.click('button[type="submit"]')

    // Wait for success confirmation
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

    // Capture intervention reference
    const interventionRef = await page.textContent('[data-testid="intervention-reference"]')
    expect(interventionRef).toBeTruthy()

    // 2. Gestionnaire se connecte et approuve la demande
    const gestionnaireContext = await context.browser()?.newContext()
    const gestionnairePage = await gestionnaireContext!.newPage()

    await gestionnairePage.goto('/auth/login')
    await gestionnairePage.fill('[name="email"]', 'pierre.martin@seido.fr')
    await gestionnairePage.fill('[name="password"]', 'demo123')
    await gestionnairePage.click('button[type="submit"]')

    // Verify gestionnaire dashboard
    await expect(gestionnairePage).toHaveURL(/\/gestionnaire/)

    // Navigate to interventions
    await gestionnairePage.goto('/gestionnaire/interventions')

    // Find and click on the new intervention
    await gestionnairePage.click(`[data-intervention-ref="${interventionRef}"]`)

    // Approve the intervention
    await gestionnairePage.click('button[data-action="approve"]')
    await gestionnairePage.fill('[name="internalComment"]', 'Intervention approuvée - urgente')
    await gestionnairePage.click('button[type="submit"]')

    // Verify status change
    await expect(gestionnairePage.locator('[data-status="approuvee"]')).toBeVisible()

    // Schedule the intervention
    await gestionnairePage.click('button[data-action="schedule"]')
    await gestionnairePage.selectOption('[name="schedulingOption"]', 'direct')
    await gestionnairePage.fill('[name="date"]', '2024-09-26')
    await gestionnairePage.fill('[name="startTime"]', '09:00')
    await gestionnairePage.fill('[name="endTime"]', '12:00')
    await gestionnairePage.click('button[type="submit"]')

    // Verify scheduling
    await expect(gestionnairePage.locator('[data-status="planifiee"]')).toBeVisible()

    // 3. Prestataire se connecte et traite l'intervention
    const prestataireContext = await context.browser()?.newContext()
    const prestatairePage = await prestataireContext!.newPage()

    await prestatairePage.goto('/auth/login')
    await prestatairePage.fill('[name="email"]', 'jean.plombier@services.fr')
    await prestatairePage.fill('[name="password"]', 'demo123')
    await prestatairePage.click('button[type="submit"]')

    // Verify prestataire dashboard
    await expect(prestatairePage).toHaveURL(/\/prestataire/)

    // Navigate to interventions
    await prestatairePage.goto('/prestataire/interventions')

    // Find the assigned intervention
    await prestatairePage.click(`[data-intervention-ref="${interventionRef}"]`)

    // Start the intervention
    await prestatairePage.click('button[data-action="start"]')
    await prestatairePage.fill('[name="executionComment"]', 'Début de l\'intervention, réparation de la fuite')
    await prestatairePage.click('button[type="submit"]')

    // Verify intervention started
    await expect(prestatairePage.locator('[data-status="en-cours"]')).toBeVisible()

    // Complete the intervention
    await prestatairePage.click('button[data-action="complete"]')
    await prestatairePage.fill('[name="completionComment"]', 'Intervention terminée, fuite réparée')
    await prestatairePage.fill('[name="finalAmount"]', '150.00')
    await prestatairePage.click('button[type="submit"]')

    // Verify completion
    await expect(prestatairePage.locator('[data-status="paiement-a-recevoir"]')).toBeVisible()

    // 4. Verify tenant can see the progress
    await page.goto('/locataire/interventions')
    await page.click(`[data-intervention-ref="${interventionRef}"]`)

    // Verify final status visible to tenant
    await expect(page.locator('[data-status="paiement-a-recevoir"]')).toBeVisible()
    await expect(page.locator('[data-testid="completion-comment"]')).toContainText('Intervention terminée')

    // Cleanup contexts
    await gestionnaireContext?.close()
    await prestataireContext?.close()
  })

  test('tenant can track intervention status updates', async ({ page }) => {
    // Login as tenant
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'sophie.tenant@email.fr')
    await page.fill('[name="password"]', 'demo123')
    await page.click('button[type="submit"]')

    // Navigate to interventions
    await page.goto('/locataire/interventions')

    // Check for existing interventions with different statuses
    const interventions = page.locator('[data-testid="intervention-card"]')
    await expect(interventions).toHaveCount.greaterThanOrEqual(1)

    // Click on first intervention to see details
    await interventions.first().click()

    // Verify intervention details are visible
    await expect(page.locator('[data-testid="intervention-title"]')).toBeVisible()
    await expect(page.locator('[data-testid="intervention-status"]')).toBeVisible()
    await expect(page.locator('[data-testid="intervention-timeline"]')).toBeVisible()
  })

  test('role-based access control works correctly', async ({ page, context }) => {
    // Test that locataire cannot access gestionnaire pages
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'sophie.tenant@email.fr')
    await page.fill('[name="password"]', 'demo123')
    await page.click('button[type="submit"]')

    // Try to access gestionnaire dashboard
    await page.goto('/gestionnaire/dashboard')

    // Should be redirected or show unauthorized
    await expect(page).not.toHaveURL(/\/gestionnaire\/dashboard/)

    // Test that gestionnaire cannot access admin pages
    const gestionnaireContext = await context.browser()?.newContext()
    const gestionnairePage = await gestionnaireContext!.newPage()

    await gestionnairePage.goto('/auth/login')
    await gestionnairePage.fill('[name="email"]', 'pierre.martin@seido.fr')
    await gestionnairePage.fill('[name="password"]', 'demo123')
    await gestionnairePage.click('button[type="submit"]')

    // Try to access admin dashboard
    await gestionnairePage.goto('/admin/dashboard')

    // Should be redirected or show unauthorized
    await expect(gestionnairePage).not.toHaveURL(/\/admin\/dashboard/)

    await gestionnaireContext?.close()
  })

  test('mobile responsiveness for all dashboards', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Test each role dashboard on mobile
    const roles = [
      { email: 'marie.dubois@seido.fr', path: '/admin' },
      { email: 'pierre.martin@seido.fr', path: '/gestionnaire' },
      { email: 'jean.plombier@services.fr', path: '/prestataire' },
      { email: 'sophie.tenant@email.fr', path: '/locataire' }
    ]

    for (const role of roles) {
      await page.goto('/auth/login')
      await page.fill('[name="email"]', role.email)
      await page.fill('[name="password"]', 'demo123')
      await page.click('button[type="submit"]')

      // Verify dashboard loads on mobile
      await expect(page).toHaveURL(new RegExp(role.path))

      // Check mobile navigation is accessible
      const mobileMenu = page.locator('[data-testid="mobile-menu"]')
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click()
        await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible()
      }

      // Logout for next iteration
      await page.goto('/auth/logout')
    }
  })
})
