/**
 * Helper pour la capture d'écran automatique dans les tests SEIDO
 * Gère les screenshots, annotations et sauvegarde organisée par rôle
 * Structure: test/screenshots/{role}/
 */

import { Page, TestInfo } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { detectRole, UserRole } from './media-organization-helper'

export interface ScreenshotOptions {
  name?: string
  fullPage?: boolean
  clip?: { x: number; y: number; width: number; height: number }
  annotations?: Array<{
    type: 'box' | 'arrow' | 'text'
    x: number
    y: number
    width?: number
    height?: number
    text?: string
    color?: string
  }>
  waitForSelector?: string
  waitForTimeout?: number
  maskSelectors?: string[]
}

export class ScreenshotHelper {
  private page: Page
  private testInfo: TestInfo
  private screenshotDir: string
  private screenshotCounter: number = 0
  private userRole: UserRole

  constructor(page: Page, testInfo: TestInfo) {
    this.page = page
    this.testInfo = testInfo

    // Détecter automatiquement le rôle
    this.userRole = detectRole(testInfo)

    // Créer un dossier organisé par rôle
    const testName = testInfo.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const timestamp = new Date().toISOString().split('T')[0]

    // Structure: test/screenshots/{role}/{date}/{test-name}/
    this.screenshotDir = path.join(
      process.cwd(),
      'test',
      'screenshots',
      this.userRole,
      timestamp,
      testName
    )

    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true })
    }

    console.log(`📸 Screenshots will be saved to: ${this.screenshotDir}`)
    console.log(`🎭 Detected role: ${this.userRole}`)
  }

  /**
   * Capture une screenshot avec options avancées
   */
  async capture(options: ScreenshotOptions = {}): Promise<string> {
    const {
      name,
      fullPage = true,
      clip,
      annotations,
      waitForSelector,
      waitForTimeout,
      maskSelectors = []
    } = options

    // Attendre si nécessaire
    if (waitForSelector) {
      await this.page.waitForSelector(waitForSelector, {
        state: 'visible',
        timeout: 30000
      })
    }

    if (waitForTimeout) {
      await this.page.waitForTimeout(waitForTimeout)
    }

    // Masquer les éléments sensibles
    for (const selector of maskSelectors) {
      await this.page.evaluate((sel) => {
        const elements = document.querySelectorAll(sel)
        elements.forEach((el: any) => {
          el.style.filter = 'blur(5px)'
        })
      }, selector)
    }

    // Ajouter des annotations visuelles si nécessaire
    if (annotations && annotations.length > 0) {
      await this.addAnnotations(annotations)
    }

    // Générer le nom du fichier
    this.screenshotCounter++
    const fileName = name
      ? `${this.screenshotCounter.toString().padStart(2, '0')}-${name}.png`
      : `${this.screenshotCounter.toString().padStart(2, '0')}-screenshot.png`

    const filePath = path.join(this.screenshotDir, fileName)

    // Prendre la capture
    const buffer = await this.page.screenshot({
      path: filePath,
      fullPage,
      clip,
      animations: 'disabled',
      caret: 'hide'
    })

    // Attacher au rapport Playwright
    await this.testInfo.attach(fileName, {
      body: buffer,
      contentType: 'image/png'
    })

    // Logger dans la console
    console.log(`📸 Screenshot: ${filePath}`)

    // Restaurer les éléments masqués
    for (const selector of maskSelectors) {
      await this.page.evaluate((sel) => {
        const elements = document.querySelectorAll(sel)
        elements.forEach((el: any) => {
          el.style.filter = ''
        })
      }, selector)
    }

    return filePath
  }

  /**
   * Capture un élément spécifique
   */
  async captureElement(selector: string, name?: string): Promise<string> {
    const element = await this.page.locator(selector)
    await element.scrollIntoViewIfNeeded()

    const box = await element.boundingBox()
    if (!box) {
      throw new Error(`Element ${selector} not found or not visible`)
    }

    return this.capture({
      name: name || `element-${selector.replace(/[^a-z0-9]/gi, '-')}`,
      clip: box,
      fullPage: false
    })
  }

  /**
   * Capture une séquence d'actions avec screenshots
   */
  async captureSequence(
    actions: Array<{
      name: string
      action: () => Promise<void>
      waitAfter?: number
    }>
  ): Promise<string[]> {
    const screenshots: string[] = []

    for (const step of actions) {
      // Capture avant l'action
      screenshots.push(await this.capture({
        name: `${step.name}-before`
      }))

      // Exécuter l'action
      await step.action()

      // Attendre si nécessaire
      if (step.waitAfter) {
        await this.page.waitForTimeout(step.waitAfter)
      }

      // Capture après l'action
      screenshots.push(await this.capture({
        name: `${step.name}-after`
      }))
    }

    return screenshots
  }

  /**
   * Compare deux états visuels
   */
  async captureComparison(
    beforeAction: () => Promise<void>,
    afterAction: () => Promise<void>,
    name: string
  ): Promise<{ before: string; after: string }> {
    // État initial
    await beforeAction()
    const beforePath = await this.capture({
      name: `${name}-before`
    })

    // Action
    await afterAction()
    const afterPath = await this.capture({
      name: `${name}-after`
    })

    return { before: beforePath, after: afterPath }
  }

  /**
   * Capture l'état de tous les rôles (multi-dashboard)
   */
  async captureAllRoles(
    roles: Array<{ name: string; loginFn: () => Promise<void> }>
  ): Promise<Map<string, string>> {
    const screenshots = new Map<string, string>()

    for (const role of roles) {
      // Se connecter avec ce rôle
      await role.loginFn()

      // Capturer le dashboard
      const screenshotPath = await this.capture({
        name: `dashboard-${role.name}`,
        waitForSelector: '[data-testid="dashboard-content"]'
      })

      screenshots.set(role.name, screenshotPath)
    }

    return screenshots
  }

  /**
   * Capture les erreurs avec contexte
   */
  async captureError(error: Error, context?: string): Promise<string> {
    // Ajouter un overlay d'erreur sur la page
    await this.page.evaluate((errorMsg) => {
      const overlay = document.createElement('div')
      overlay.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #dc3545;
        color: white;
        padding: 15px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        max-width: 400px;
        z-index: 999999;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      `
      overlay.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 10px;">❌ ERROR DETECTED</div>
        <div>${errorMsg}</div>
      `
      document.body.appendChild(overlay)
    }, error.message)

    // Prendre la capture avec l'erreur visible
    const screenshotPath = await this.capture({
      name: `error-${context || 'unknown'}`,
      fullPage: true
    })

    // Log l'erreur
    console.error(`❌ Error captured: ${error.message}`)
    console.error(`   Screenshot: ${screenshotPath}`)

    return screenshotPath
  }

  /**
   * Capture l'état du réseau (requêtes en cours)
   */
  async captureNetworkState(): Promise<void> {
    const requests: any[] = []

    // Collecter les requêtes
    this.page.on('request', (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        timestamp: Date.now()
      })
    })

    // Attendre un peu pour collecter
    await this.page.waitForTimeout(2000)

    // Sauvegarder dans un fichier JSON
    const networkFile = path.join(this.screenshotDir, 'network-state.json')
    fs.writeFileSync(networkFile, JSON.stringify(requests, null, 2))

    console.log(`🌐 Network state saved: ${networkFile}`)
  }

  /**
   * Ajoute des annotations visuelles sur la page
   */
  private async addAnnotations(annotations: any[]): Promise<void> {
    await this.page.evaluate((annots) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 999998;
      `

      annots.forEach(annotation => {
        if (annotation.type === 'box') {
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
          rect.setAttribute('x', annotation.x.toString())
          rect.setAttribute('y', annotation.y.toString())
          rect.setAttribute('width', (annotation.width || 100).toString())
          rect.setAttribute('height', (annotation.height || 50).toString())
          rect.setAttribute('stroke', annotation.color || 'red')
          rect.setAttribute('stroke-width', '3')
          rect.setAttribute('fill', 'none')
          svg.appendChild(rect)
        } else if (annotation.type === 'arrow') {
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
          line.setAttribute('x1', annotation.x.toString())
          line.setAttribute('y1', annotation.y.toString())
          line.setAttribute('x2', (annotation.x + 50).toString())
          line.setAttribute('y2', (annotation.y + 50).toString())
          line.setAttribute('stroke', annotation.color || 'red')
          line.setAttribute('stroke-width', '3')
          line.setAttribute('marker-end', 'url(#arrowhead)')
          svg.appendChild(line)
        } else if (annotation.type === 'text' && annotation.text) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
          text.setAttribute('x', annotation.x.toString())
          text.setAttribute('y', annotation.y.toString())
          text.setAttribute('fill', annotation.color || 'red')
          text.setAttribute('font-size', '16')
          text.setAttribute('font-weight', 'bold')
          text.textContent = annotation.text
          svg.appendChild(text)
        }
      })

      document.body.appendChild(svg)
    }, annotations)
  }

  /**
   * Génère un rapport de screenshots
   */
  async generateReport(): Promise<void> {
    const screenshots = fs.readdirSync(this.screenshotDir)
      .filter(f => f.endsWith('.png'))

    const reportPath = path.join(this.screenshotDir, 'index.html')
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Screenshot Report - ${this.testInfo.title}</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .screenshot { margin: 20px 0; border: 1px solid #ddd; padding: 10px; }
        img { max-width: 100%; height: auto; }
        h1 { color: #333; }
        .metadata { background: #f5f5f5; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <h1>📸 Screenshot Report: ${this.testInfo.title}</h1>
    <div class="metadata">
        <p><strong>Test:</strong> ${this.testInfo.title}</p>
        <p><strong>File:</strong> ${this.testInfo.file}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Total Screenshots:</strong> ${screenshots.length}</p>
    </div>
    ${screenshots.map(screenshot => `
        <div class="screenshot">
            <h3>${screenshot}</h3>
            <img src="${screenshot}" alt="${screenshot}" />
        </div>
    `).join('')}
</body>
</html>`

    fs.writeFileSync(reportPath, html)
    console.log(`📊 Screenshot report: ${reportPath}`)
  }
}

/**
 * Factory function pour créer un helper
 */
export function createScreenshotHelper(page: Page, testInfo: TestInfo): ScreenshotHelper {
  return new ScreenshotHelper(page, testInfo)
}
