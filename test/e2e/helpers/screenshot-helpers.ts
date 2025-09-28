import { Page, TestInfo } from '@playwright/test'

/**
 * Helper pour captures d'écran étendues avec métadonnées
 */
export class ScreenshotHelper {
  constructor(private page: Page, private testInfo: TestInfo) {}

  /**
   * Capture d'écran avec nom personnalisé et métadonnées
   */
  async captureStep(stepName: string, options?: {
    fullPage?: boolean
    clip?: { x: number; y: number; width: number; height: number }
    annotations?: Array<{ type: string; description: string }>
  }) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const sanitizedStepName = stepName.replace(/[^a-zA-Z0-9\-_]/g, '_')
    const filename = `${timestamp}_${sanitizedStepName}.png`

    // Ajouter des annotations au test
    if (options?.annotations) {
      options.annotations.forEach(annotation => {
        this.testInfo.annotations.push(annotation)
      })
    }

    // Prendre la capture d'écran
    const screenshot = await this.page.screenshot({
      path: undefined, // Playwright gérera le chemin
      fullPage: options?.fullPage ?? true,
      clip: options?.clip,
      animations: 'disabled', // Désactiver animations pour cohérence
    })

    // Attacher la capture au rapport de test
    await this.testInfo.attach(filename, {
      body: screenshot,
      contentType: 'image/png'
    })

    return screenshot
  }

  /**
   * Capture d'écran automatique avant action critique
   */
  async captureBeforeAction(actionDescription: string) {
    await this.captureStep(`before_${actionDescription}`, {
      annotations: [{
        type: 'step',
        description: `Avant: ${actionDescription}`
      }]
    })
  }

  /**
   * Capture d'écran automatique après action critique
   */
  async captureAfterAction(actionDescription: string, success: boolean = true) {
    const status = success ? 'success' : 'failure'
    await this.captureStep(`after_${actionDescription}_${status}`, {
      annotations: [{
        type: success ? 'success' : 'failure',
        description: `Après: ${actionDescription} - ${status}`
      }]
    })
  }

  /**
   * Capture de l'état d'une page avec contexte
   */
  async capturePageState(stateName: string, additionalInfo?: Record<string, any>) {
    // Récupérer des informations contextuelles
    const url = this.page.url()
    const title = await this.page.title()
    const localStorage = await this.page.evaluate(() =>
      JSON.stringify(localStorage)
    )

    await this.captureStep(`page_state_${stateName}`, {
      annotations: [
        { type: 'info', description: `URL: ${url}` },
        { type: 'info', description: `Title: ${title}` },
        { type: 'info', description: `LocalStorage: ${localStorage}` },
        ...(additionalInfo ? Object.entries(additionalInfo).map(([key, value]) => ({
          type: 'info',
          description: `${key}: ${JSON.stringify(value)}`
        })) : [])
      ]
    })
  }

  /**
   * Capture d'écran de comparaison (avant/après)
   */
  async captureComparison(
    beforeAction: () => Promise<void>,
    afterAction: () => Promise<void>,
    comparisonName: string
  ) {
    // Capture avant
    await this.captureStep(`${comparisonName}_before`)

    // Exécuter l'action
    await beforeAction()

    // Capture après
    await this.captureStep(`${comparisonName}_after`)

    // Attendre un peu pour la stabilité
    await this.page.waitForTimeout(500)

    // Exécuter l'action finale
    await afterAction()
  }

  /**
   * Capture d'écran responsive sur différentes tailles
   */
  async captureResponsive(stepName: string, viewports?: Array<{width: number, height: number, name: string}>) {
    const defaultViewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ]

    const viewportsToTest = viewports || defaultViewports

    for (const viewport of viewportsToTest) {
      await this.page.setViewportSize(viewport)
      await this.page.waitForTimeout(500) // Laisser le temps au layout de s'adapter

      await this.captureStep(`${stepName}_${viewport.name}`, {
        annotations: [{
          type: 'viewport',
          description: `${viewport.name}: ${viewport.width}x${viewport.height}`
        }]
      })
    }
  }

  /**
   * Capture d'écran avec masquage d'éléments sensibles
   */
  async captureWithMask(stepName: string, elementsToMask: string[]) {
    // Masquer les éléments sensibles
    const maskStyles = elementsToMask.map(selector => `
      ${selector} {
        background: #000 !important;
        color: #000 !important;
        border: 2px solid #ff0000 !important;
      }
    `).join('\n')

    await this.page.addStyleTag({ content: maskStyles })

    await this.captureStep(`${stepName}_masked`, {
      annotations: [{
        type: 'security',
        description: `Éléments masqués: ${elementsToMask.join(', ')}`
      }]
    })

    // Restaurer les styles
    await this.page.reload()
  }
}

/**
 * Fonction helper pour créer une instance ScreenshotHelper
 */
export function createScreenshotHelper(page: Page, testInfo: TestInfo): ScreenshotHelper {
  return new ScreenshotHelper(page, testInfo)
}

/**
 * Décorateur pour capturer automatiquement les étapes de test
 */
export function withScreenshots(page: Page, testInfo: TestInfo) {
  const helper = new ScreenshotHelper(page, testInfo)

  return {
    async step<T>(name: string, action: () => Promise<T>): Promise<T> {
      await helper.captureBeforeAction(name)

      try {
        const result = await action()
        await helper.captureAfterAction(name, true)
        return result
      } catch (error) {
        await helper.captureAfterAction(name, false)
        throw error
      }
    },

    helper
  }
}
