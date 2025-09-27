/**
 * Helper pour organiser automatiquement les screenshots et videos par rôle
 * Structure: test/screenshots/{role}/ et test/videos/{role}/
 */

import path from 'path'
import { TestInfo, Page } from '@playwright/test'

export type UserRole = 'admin' | 'gestionnaire' | 'prestataire' | 'locataire' | 'auth' | 'general'

/**
 * Détermine le rôle à partir du nom du test, du fichier ou du projet
 */
export function detectRole(testInfo: TestInfo): UserRole {
  const testTitle = testInfo.title.toLowerCase()
  const testFile = testInfo.file.toLowerCase()
  const projectName = testInfo.project.name.toLowerCase()

  // Détection par nom du projet Playwright
  if (projectName.includes('admin')) return 'admin'
  if (projectName.includes('gestionnaire')) return 'gestionnaire'
  if (projectName.includes('prestataire')) return 'prestataire'
  if (projectName.includes('locataire')) return 'locataire'

  // Détection par chemin du fichier
  if (testFile.includes('/admin/') || testFile.includes('\\admin\\')) return 'admin'
  if (testFile.includes('/gestionnaire/') || testFile.includes('\\gestionnaire\\')) return 'gestionnaire'
  if (testFile.includes('/prestataire/') || testFile.includes('\\prestataire\\')) return 'prestataire'
  if (testFile.includes('/locataire/') || testFile.includes('\\locataire\\')) return 'locataire'
  if (testFile.includes('/auth/') || testFile.includes('\\auth\\')) return 'auth'

  // Détection par titre du test
  if (testTitle.includes('admin')) return 'admin'
  if (testTitle.includes('gestionnaire') || testTitle.includes('manager')) return 'gestionnaire'
  if (testTitle.includes('prestataire') || testTitle.includes('provider')) return 'prestataire'
  if (testTitle.includes('locataire') || testTitle.includes('tenant')) return 'locataire'
  if (testTitle.includes('auth') || testTitle.includes('login') || testTitle.includes('logout')) return 'auth'

  // Par défaut
  return 'general'
}

/**
 * Génère le chemin de screenshot organisé par rôle
 */
export function getScreenshotPath(testInfo: TestInfo, name?: string): string {
  const role = detectRole(testInfo)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const sanitizedTitle = testInfo.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const screenshotName = name || `${sanitizedTitle}-${timestamp}`

  return path.join('test', 'screenshots', role, `${screenshotName}.png`)
}

/**
 * Génère le chemin de video organisé par rôle
 */
export function getVideoPath(testInfo: TestInfo, name?: string): string {
  const role = detectRole(testInfo)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const sanitizedTitle = testInfo.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()
  const videoName = name || `${sanitizedTitle}-${timestamp}`

  return path.join('test', 'videos', role, `${videoName}.webm`)
}

/**
 * Prend un screenshot organisé automatiquement par rôle
 */
export async function takeOrganizedScreenshot(
  page: Page,
  testInfo: TestInfo,
  name?: string,
  options?: {
    fullPage?: boolean
    clip?: { x: number; y: number; width: number; height: number }
    animations?: 'disabled' | 'allow'
  }
): Promise<string> {
  const screenshotPath = getScreenshotPath(testInfo, name)

  await page.screenshot({
    path: screenshotPath,
    fullPage: options?.fullPage ?? true,
    clip: options?.clip,
    animations: options?.animations ?? 'disabled',
  })

  // Attacher au rapport de test
  await testInfo.attach(name || 'screenshot', {
    path: screenshotPath,
    contentType: 'image/png'
  })

  return screenshotPath
}

/**
 * Configure automatiquement les chemins de vidéo pour un contexte
 */
export function configureVideoRecording(testInfo: TestInfo) {
  const role = detectRole(testInfo)
  const videoDir = path.join('test', 'videos', role)

  return {
    recordVideo: {
      dir: videoDir,
      size: { width: 1280, height: 720 }
    }
  }
}

/**
 * Génère un nom de fichier unique basé sur le test
 */
export function generateMediaFileName(
  testInfo: TestInfo,
  extension: 'png' | 'webm' | 'json',
  suffix?: string
): string {
  const timestamp = Date.now()
  const sanitizedTitle = testInfo.title
    .substring(0, 50) // Limiter la longueur
    .replace(/[^a-z0-9]/gi, '-')
    .toLowerCase()

  const browserName = testInfo.project.name
  const suffixPart = suffix ? `-${suffix}` : ''

  return `${sanitizedTitle}-${browserName}${suffixPart}-${timestamp}.${extension}`
}

/**
 * Helpers pour générer des rapports organisés
 */
export const MediaReportHelper = {
  /**
   * Crée un index des médias capturés organisé par rôle
   */
  async createMediaIndex(testInfo: TestInfo, medias: Array<{ path: string; type: 'screenshot' | 'video'; description?: string }>) {
    const role = detectRole(testInfo)
    const indexPath = path.join('test', 'reports', `media-index-${role}.json`)

    const index = {
      role,
      test: testInfo.title,
      file: testInfo.file,
      timestamp: new Date().toISOString(),
      medias: medias.map(m => ({
        ...m,
        relativePath: path.relative(process.cwd(), m.path)
      }))
    }

    // Ajouter au rapport de test
    await testInfo.attach('media-index', {
      body: JSON.stringify(index, null, 2),
      contentType: 'application/json'
    })

    return index
  },

  /**
   * Génère un nom de trace organisé
   */
  getTracePath(testInfo: TestInfo): string {
    const role = detectRole(testInfo)
    const timestamp = Date.now()
    const sanitizedTitle = testInfo.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()

    return path.join('test', 'traces', role, `trace-${sanitizedTitle}-${timestamp}.zip`)
  }
}

/**
 * Helper pour capturer l'état complet d'une page
 */
export async function capturePageState(
  page: Page,
  testInfo: TestInfo,
  stateName: string
): Promise<{
  screenshot: string
  console: any[]
  cookies: any[]
  localStorage: any
}> {
  // Capturer screenshot
  const screenshotPath = await takeOrganizedScreenshot(page, testInfo, stateName)

  // Capturer console logs
  const consoleLogs: any[] = []
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    })
  })

  // Capturer cookies
  const cookies = await page.context().cookies()

  // Capturer localStorage
  const localStorage = await page.evaluate(() => {
    const items: Record<string, any> = {}
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key) {
        items[key] = window.localStorage.getItem(key)
      }
    }
    return items
  })

  return {
    screenshot: screenshotPath,
    console: consoleLogs,
    cookies,
    localStorage
  }
}

export default {
  detectRole,
  getScreenshotPath,
  getVideoPath,
  takeOrganizedScreenshot,
  configureVideoRecording,
  generateMediaFileName,
  MediaReportHelper,
  capturePageState
}