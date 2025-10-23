/**
 * 📧 EMAIL HELPERS - Helpers pour les emails
 *
 * Fonctionnalités :
 * - Intercepter les emails Resend en mode test
 * - Extraire les liens de confirmation
 * - Vérifier le contenu des emails
 */

import { Page } from '@playwright/test'
import { TEST_CONFIG, getLogPaths } from '../config/test-config'
import * as fs from 'fs/promises'
import * as path from 'path'

export interface CapturedEmail {
  to: string
  from: string
  subject: string
  html: string
  text?: string
  timestamp: string
}

/**
 * Classe pour gérer les emails de test
 */
export class EmailCapture {
  private emails: CapturedEmail[] = []
  private testName: string

  constructor(testName: string) {
    this.testName = testName
  }

  /**
   * Intercepter les appels à l'API Resend
   */
  async setupInterception(page: Page): Promise<void> {
    console.log('📧 Setting up email interception...')

    // Intercepter les requêtes vers l'API Resend
    await page.route('https://api.resend.com/**', async (route, request) => {
      const method = request.method()

      if (method === 'POST' && request.url().includes('/emails')) {
        // Capturer l'email
        try {
          const postData = request.postDataJSON()

          const email: CapturedEmail = {
            to: postData.to,
            from: postData.from,
            subject: postData.subject,
            html: postData.html,
            text: postData.text,
            timestamp: new Date().toISOString(),
          }

          this.emails.push(email)

          console.log(`✅ Email captured: ${email.subject} → ${email.to}`)

          // Sauvegarder l'email
          await this.saveEmail(email)

          // Répondre avec un succès mock
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: `mock-email-${Date.now()}`,
            }),
          })
        } catch (error) {
          console.error('❌ Failed to intercept email:', error)
          await route.continue()
        }
      } else {
        await route.continue()
      }
    })

    console.log('✅ Email interception setup complete')
  }

  /**
   * Sauvegarder un email capturé
   */
  private async saveEmail(email: CapturedEmail): Promise<void> {
    const logPaths = getLogPaths(this.testName)
    const emailDir = logPaths.emails

    await fs.mkdir(emailDir, { recursive: true })

    const filename = `${Date.now()}-${email.subject.replace(/[^a-zA-Z0-9]/g, '-')}.html`
    const filepath = path.join(emailDir, filename)

    await fs.writeFile(filepath, email.html, 'utf-8')

    console.log(`💾 Email saved: ${filepath}`)
  }

  /**
   * Récupérer le dernier email
   */
  getLastEmail(): CapturedEmail | null {
    return this.emails.length > 0 ? this.emails[this.emails.length - 1] : null
  }

  /**
   * Récupérer tous les emails
   */
  getAllEmails(): CapturedEmail[] {
    return [...this.emails]
  }

  /**
   * Récupérer un email par destinataire
   */
  getEmailByRecipient(email: string): CapturedEmail | null {
    return this.emails.find((e) => e.to === email) || null
  }

  /**
   * Récupérer un email par sujet
   */
  getEmailBySubject(subject: string): CapturedEmail | null {
    return this.emails.find((e) => e.subject.includes(subject)) || null
  }

  /**
   * Extraire le lien de confirmation d'un email
   */
  extractConfirmationLink(email: CapturedEmail): string | null {
    // Chercher un lien contenant /auth/confirm
    const match = email.html.match(/href="([^"]*\/auth\/confirm[^"]*)"/i)

    if (match && match[1]) {
      // Décoder les entités HTML si nécessaire
      const link = match[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')

      console.log('🔗 Confirmation link extracted:', link)
      return link
    }

    console.warn('⚠️  No confirmation link found in email')
    return null
  }

  /**
   * Attendre qu'un email arrive
   */
  async waitForEmail(
    predicate: (email: CapturedEmail) => boolean,
    options: { timeout?: number } = {}
  ): Promise<CapturedEmail> {
    const timeout = options.timeout || 10000
    const startTime = Date.now()

    console.log('⏳ Waiting for email...')

    while (Date.now() - startTime < timeout) {
      const email = this.emails.find(predicate)

      if (email) {
        console.log(`✅ Email found: ${email.subject}`)
        return email
      }

      // Attendre 100ms avant de réessayer
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    throw new Error(`Email not received within ${timeout}ms`)
  }

  /**
   * Attendre l'email de confirmation signup
   */
  async waitForSignupConfirmation(email: string): Promise<CapturedEmail> {
    console.log(`⏳ Waiting for signup confirmation email to: ${email}`)

    return this.waitForEmail(
      (e) =>
        e.to === email &&
        e.subject.toLowerCase().includes('confirm')
    )
  }

  /**
   * Attendre l'email de bienvenue
   */
  async waitForWelcomeEmail(email: string): Promise<CapturedEmail> {
    console.log(`⏳ Waiting for welcome email to: ${email}`)

    return this.waitForEmail(
      (e) =>
        e.to === email &&
        e.subject.toLowerCase().includes('bienvenue')
    )
  }

  /**
   * Réinitialiser les emails capturés
   */
  reset(): void {
    this.emails = []
    console.log('🔄 Email capture reset')
  }

  /**
   * Générer un rapport des emails
   */
  generateReport(): string {
    const report = [
      '# Email Report',
      '',
      `**Total emails captured**: ${this.emails.length}`,
      '',
    ]

    if (this.emails.length === 0) {
      report.push('_No emails captured_')
      return report.join('\n')
    }

    report.push('## Emails')

    this.emails.forEach((email, index) => {
      report.push(`### ${index + 1}. ${email.subject}`)
      report.push('')
      report.push(`- **To**: ${email.to}`)
      report.push(`- **From**: ${email.from}`)
      report.push(`- **Timestamp**: ${email.timestamp}`)
      report.push('')

      const confirmLink = this.extractConfirmationLink(email)
      if (confirmLink) {
        report.push(`- **Confirmation Link**: \`${confirmLink}\``)
        report.push('')
      }
    })

    return report.join('\n')
  }
}

/**
 * Factory pour créer un EmailCapture
 */
export const createEmailCapture = (testName: string): EmailCapture => {
  return new EmailCapture(testName)
}

export default EmailCapture
