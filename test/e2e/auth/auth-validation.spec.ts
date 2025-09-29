import { test, expect } from '@playwright/test'

const TEST_ACCOUNTS = [
  { email: 'admin@seido.pm', password: 'password123', role: 'admin' },
  { email: 'arthur@umumentum.com', password: 'password123', role: 'gestionnaire' },
  { email: 'arthur+prest@seido.pm', password: 'password123', role: 'prestataire' },
  { email: 'arthur+loc@seido.pm', password: 'password123', role: 'locataire' }
]

test.describe('PHASE 1 - Validation Auth SEIDO', () => {
  test.describe.configure({ mode: 'serial' })

  for (const account of TEST_ACCOUNTS) {
    test(`Login ${account.role}`, async ({ page }) => {
      console.log(`\n🧪 Testing ${account.role} login...`)
      const startTime = Date.now()

      // 1. Aller à la page de login
      await page.goto('/auth/login')
      await expect(page).toHaveURL(/.*\/auth\/login/)

      // 2. Remplir le formulaire
      await page.fill('#email', account.email)
      await page.fill('#password', account._password)

      // 3. Cliquer sur le bouton de connexion
      await Promise.all([
        page.waitForURL(`**/${account.role}/dashboard`, { timeout: 10000 }),
        page.click('button[type="submit"]')
      ])

      const authTime = Date.now() - startTime
      console.log(`⏱️ Auth time: ${authTime}ms`)

      // 4. Vérifier la redirection
      await expect(page).toHaveURL(new RegExp(`/${account.role}/dashboard`))

      // 5. Vérifier que le dashboard est chargé
      await expect(page.locator('h1')).toBeVisible({ timeout: 5000 })

      // 6. Vérifier les temps de performance
      expect(authTime).toBeLessThan(3000)

      console.log(`✅ ${account.role} login successful in ${authTime}ms`)
    })
  }

  test('Performance moyenne < 3s', async ({ page }) => {
    const times: number[] = []

    for (let i = 0; i < 3; i++) {
      const startTime = Date.now()

      await page.goto('/auth/login')
      await page.fill('#email', 'arthur@umumentum.com')
      await page.fill('#password', 'password123')

      await Promise.all([
        page.waitForURL('**/gestionnaire/dashboard'),
        page.click('button[type="submit"]')
      ])

      const authTime = Date.now() - startTime
      times.push(authTime)

      // Logout pour le prochain test
      await page.goto('/auth/logout')
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    console.log(`📊 Average auth time: ${avgTime}ms`)

    expect(avgTime).toBeLessThan(3000)
  })
})
