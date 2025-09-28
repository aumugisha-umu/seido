import { Page, TestInfo } from '@playwright/test'
import path from 'path'

/**
 * Helper pour la gestion des captures d'écran dans les tests
 */
export class ScreenshotHelper {
  private screenshotCounter = 0

  constructor(
    private page: Page,
    private testInfo: TestInfo
  ) {}

  /**
   * Prend une capture d'écran avec un nom descriptif
   */
  async capture(name: string, options?: {
    fullPage?: boolean
    clip?: { x: number; y: number; width: number; height: number }
    animations?: 'disabled' | 'allow'
  }) {
    this.screenshotCounter++

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const testName = this.testInfo.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const fileName = `${testName}-${this.screenshotCounter}-${name}-${timestamp}.png`

    const screenshotPath = path.join('test', 'screenshots', fileName)

    await this.page.screenshot({
      path: screenshotPath,
      fullPage: options?.fullPage ?? true,
      clip: options?.clip,
      animations: options?.animations ?? 'disabled',
    })

    // Attacher la capture au rapport de test
    await this.testInfo.attach(name, {
      body: await this.page.screenshot({
        fullPage: options?.fullPage ?? true,
        clip: options?.clip,
        animations: options?.animations ?? 'disabled',
      }),
      contentType: 'image/png'
    })

    console.log(`📸 Screenshot capturé: ${fileName}`)
    return screenshotPath
  }

  /**
   * Prend plusieurs captures d'écran d'une séquence
   */
  async captureSequence(steps: Array<{
    name: string
    action?: () => Promise<void>
    wait?: number
  }>) {
    const screenshots: string[] = []

    for (const step of steps) {
      if (step.action) {
        await step.action()
      }

      if (step.wait) {
        await this.page.waitForTimeout(step.wait)
      }

      const path = await this.capture(step.name)
      screenshots.push(path)
    }

    return screenshots
  }

  /**
   * Capture un élément spécifique
   */
  async captureElement(selector: string, name: string) {
    const element = await this.page.locator(selector)
    await element.waitFor({ state: 'visible' })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const testName = this.testInfo.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const fileName = `${testName}-element-${name}-${timestamp}.png`

    const screenshotPath = path.join('test', 'screenshots', fileName)

    await element.screenshot({
      path: screenshotPath,
      animations: 'disabled',
    })

    // Attacher au rapport
    await this.testInfo.attach(`element-${name}`, {
      body: await element.screenshot({
        animations: 'disabled',
      }),
      contentType: 'image/png'
    })

    console.log(`📸 Element screenshot: ${fileName}`)
    return screenshotPath
  }

  /**
   * Capture avant et après une action
   */
  async captureBeforeAfter(
    name: string,
    action: () => Promise<void>
  ) {
    const before = await this.capture(`${name}-before`)
    await action()
    const after = await this.capture(`${name}-after`)

    return { before, after }
  }

  /**
   * Compare deux captures d'écran (pour tests de régression visuelle)
   */
  async compareScreenshots(name: string) {
    const screenshot = await this.page.screenshot({
      fullPage: true,
      animations: 'disabled',
    })

    // Utilise la fonctionnalité native de Playwright pour la comparaison
    await expect(screenshot).toMatchSnapshot(`${name}.png`, {
      maxDiffPixels: 100,
      threshold: 0.2,
    })
  }

  /**
   * Capture l'état de tous les formulaires de la page
   */
  async captureFormStates(formSelector = 'form') {
    const forms = await this.page.locator(formSelector).all()
    const screenshots: string[] = []

    for (let i = 0; i < forms.length; i++) {
      await forms[i].scrollIntoViewIfNeeded()
      const path = await this.captureElement(
        `${formSelector}:nth-of-type(${i + 1})`,
        `form-${i + 1}`
      )
      screenshots.push(path)
    }

    return screenshots
  }

  /**
   * Capture les erreurs affichées
   */
  async captureErrors() {
    const errorSelectors = [
      '[role="alert"]',
      '.error',
      '.error-message',
      '[data-error]',
      '.text-red-500',
      '.text-destructive'
    ]

    const screenshots: string[] = []

    for (const selector of errorSelectors) {
      const elements = await this.page.locator(selector).all()
      if (elements.length > 0) {
        for (let i = 0; i < elements.length; i++) {
          try {
            await elements[i].scrollIntoViewIfNeeded()
            const path = await this.captureElement(
              `${selector}:nth-of-type(${i + 1})`,
              `error-${selector.replace(/[\[\]\.]/g, '')}-${i + 1}`
            )
            screenshots.push(path)
          } catch (e) {
            // Ignorer si l'élément n'est pas visible
          }
        }
      }
    }

    if (screenshots.length === 0) {
      // Capture la page entière s'il n'y a pas d'erreur spécifique
      const path = await this.capture('no-errors-found')
      screenshots.push(path)
    }

    return screenshots
  }

  /**
   * Génère un rapport visuel des captures
   */
  async generateVisualReport() {
    const reportData = {
      testName: this.testInfo.title,
      project: this.testInfo.project.name,
      status: this.testInfo.status,
      duration: this.testInfo.duration,
      screenshotCount: this.screenshotCounter,
      timestamp: new Date().toISOString(),
    }

    const reportPath = path.join(
      'test',
      'reports',
      `visual-${this.testInfo.title.replace(/[^a-z0-9]/gi, '-')}.json`
    )

    // Le rapport sera écrit par Playwright
    console.log('📊 Visual report data:', reportData)
    return reportData
  }
}

/**
 * Factory function pour créer un helper de screenshot
 */
export function createScreenshotHelper(page: Page, testInfo: TestInfo) {
  return new ScreenshotHelper(page, testInfo)
}
