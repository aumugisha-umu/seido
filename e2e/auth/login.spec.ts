/**
 * E2E Test: Authentification - Login
 * Test du flow complet de connexion pour un gestionnaire
 * @see https://nextjs.org/docs/app/building-your-application/testing/playwright
 */
import { test, expect } from '@playwright/test'
import { getTestUser } from '../fixtures/test-users'

test.describe('Authentification - Login', () => {
  test.beforeEach(async ({ page }) => {
    // Naviguer vers la page de login
    await page.goto('/auth/login')
  })

  test('devrait afficher le formulaire de connexion', async ({ page }) => {
    // Vérifier que les éléments du formulaire sont présents
    await expect(page.getByRole('heading', { name: /connexion/i })).toBeVisible()
    await expect(page.getByLabel(/adresse email/i)).toBeVisible()
    await expect(page.getByLabel(/mot de passe/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible()
  })

  test('devrait afficher une erreur avec des identifiants invalides', async ({ page }) => {
    // Remplir le formulaire avec des identifiants invalides
    await page.getByLabel(/adresse email/i).fill('wrong@example.com')
    await page.getByLabel(/mot de passe/i).fill('wrongpassword')

    // Cliquer sur le bouton de connexion
    await page.getByRole('button', { name: /se connecter/i }).click()

    // Vérifier qu'une erreur est affichée
    await expect(page.getByText(/identifiants invalides|erreur/i)).toBeVisible({ timeout: 10000 })
  })

  test('devrait connecter un gestionnaire avec succès', async ({ page }) => {
    const user = getTestUser('gestionnaire')

    // Remplir le formulaire avec les identifiants valides
    await page.getByLabel(/adresse email/i).fill(user.email)
    await page.getByLabel(/mot de passe/i).fill(user.password)

    // Cliquer sur le bouton de connexion
    await page.getByRole('button', { name: /se connecter/i }).click()

    // Attendre la redirection vers le dashboard gestionnaire
    await expect(page).toHaveURL(/\/gestionnaire/, { timeout: 15000 })

    // Vérifier que l'utilisateur est bien connecté (présence d'éléments du dashboard)
    await expect(page.getByRole('heading', { name: /dashboard|tableau de bord/i })).toBeVisible({ timeout: 10000 })
  })

  test('devrait pouvoir se déconnecter après connexion', async ({ page }) => {
    const user = getTestUser('gestionnaire')

    // Se connecter
    await page.getByLabel(/adresse email/i).fill(user.email)
    await page.getByLabel(/mot de passe/i).fill(user.password)
    await page.getByRole('button', { name: /se connecter/i }).click()

    // Attendre la redirection
    await expect(page).toHaveURL(/\/gestionnaire/, { timeout: 15000 })

    // Trouver et cliquer sur le bouton de déconnexion
    // Note: Adapter le sélecteur selon votre UI (menu utilisateur, bouton logout, etc.)
    await page.getByRole('button', { name: /déconnexion|logout/i }).click()

    // Vérifier la redirection vers la page de login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('devrait conserver la session après un rafraîchissement de page', async ({ page }) => {
    const user = getTestUser('gestionnaire')

    // Se connecter
    await page.getByLabel(/adresse email/i).fill(user.email)
    await page.getByLabel(/mot de passe/i).fill(user.password)
    await page.getByRole('button', { name: /se connecter/i }).click()

    // Attendre la redirection
    await expect(page).toHaveURL(/\/gestionnaire/, { timeout: 15000 })

    // Rafraîchir la page
    await page.reload()

    // Vérifier que l'utilisateur est toujours connecté
    await expect(page).toHaveURL(/\/gestionnaire/)
    await expect(page.getByRole('heading', { name: /dashboard|tableau de bord/i })).toBeVisible({ timeout: 10000 })
  })
})
