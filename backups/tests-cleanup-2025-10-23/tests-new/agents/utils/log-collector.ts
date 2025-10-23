/**
 * 📊 LOG COLLECTOR - Collecte de logs multi-sources
 *
 * Collecte et centralise tous les logs de test :
 * - Console browser
 * - Console server
 * - Logs Supabase
 * - Logs Pino (structurés)
 * - Network requests
 */

import { Page, ConsoleMessage } from '@playwright/test'
import * as fs from 'fs/promises'
import * as path from 'path'
import { getLogPaths } from '../../config/test-config'

export interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  source: 'console' | 'server' | 'supabase' | 'pino' | 'network'
  message: string
  metadata?: Record<string, unknown>
}

export interface NetworkLog {
  timestamp: string
  method: string
  url: string
  status?: number
  duration?: number
  requestBody?: unknown
  responseBody?: unknown
}

export class LogCollector {
  private logs: LogEntry[] = []
  private networkLogs: NetworkLog[] = []
  private testName: string
  private logPaths: ReturnType<typeof getLogPaths>
  private page?: Page

  constructor(testName: string) {
    this.testName = testName
    this.logPaths = getLogPaths(testName)
  }

  /**
   * Initialiser la collecte de logs
   */
  async initialize(page: Page): Promise<void> {
    this.page = page

    // Créer les répertoires de logs
    await this.ensureLogDirectories()

    // Capturer les logs console du browser
    page.on('console', (msg) => this.handleConsoleMessage(msg))

    // Capturer les erreurs JavaScript
    page.on('pageerror', (error) => {
      this.addLog({
        timestamp: new Date().toISOString(),
        level: 'error',
        source: 'console',
        message: `Page Error: ${error.message}`,
        metadata: {
          stack: error.stack,
        },
      })
    })

    // Capturer les requêtes réseau
    page.on('request', (request) => {
      const startTime = Date.now()
      const networkLog: NetworkLog = {
        timestamp: new Date().toISOString(),
        method: request.method(),
        url: request.url(),
      }

      // Capturer le body de la requête si POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(request.method())) {
        try {
          networkLog.requestBody = request.postDataJSON()
        } catch {
          // Ignorer si pas JSON
        }
      }

      // Attendre la réponse
      request.response().then((response) => {
        if (response) {
          networkLog.status = response.status()
          networkLog.duration = Date.now() - startTime

          // Capturer le body de la réponse si JSON
          response.json().then((json) => {
            networkLog.responseBody = json
          }).catch(() => {
            // Ignorer si pas JSON
          })
        }

        this.networkLogs.push(networkLog)
      }).catch(() => {
        // Ignorer les erreurs réseau (timeout, etc.)
      })
    })

    console.log(`✅ [LOG-COLLECTOR] Initialized for test: ${this.testName}`)
  }

  /**
   * Gérer un message console du browser
   */
  private handleConsoleMessage(msg: ConsoleMessage): void {
    const level = this.mapConsoleType(msg.type())
    const message = msg.text()

    // Détecter les logs Pino (format JSON)
    if (this.isPinoLog(message)) {
      this.parsePinoLog(message)
      return
    }

    // Détecter les logs Supabase
    const source = message.includes('SUPABASE') ? 'supabase' : 'console'

    this.addLog({
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      metadata: {
        location: msg.location(),
      },
    })
  }

  /**
   * Mapper le type de console Playwright vers niveau de log
   */
  private mapConsoleType(type: string): LogEntry['level'] {
    switch (type) {
      case 'error':
        return 'error'
      case 'warning':
        return 'warn'
      case 'debug':
        return 'debug'
      default:
        return 'info'
    }
  }

  /**
   * Vérifier si un message est un log Pino
   */
  private isPinoLog(message: string): boolean {
    try {
      const parsed = JSON.parse(message)
      return parsed.level !== undefined && parsed.time !== undefined
    } catch {
      return false
    }
  }

  /**
   * Parser un log Pino
   */
  private parsePinoLog(message: string): void {
    try {
      const parsed = JSON.parse(message)

      // Mapper le niveau numérique Pino vers string
      const levelMap: Record<number, LogEntry['level']> = {
        10: 'debug', // trace
        20: 'debug', // debug
        30: 'info',  // info
        40: 'warn',  // warn
        50: 'error', // error
        60: 'error', // fatal
      }

      this.addLog({
        timestamp: new Date(parsed.time).toISOString(),
        level: levelMap[parsed.level] || 'info',
        source: 'pino',
        message: parsed.msg || '',
        metadata: {
          context: parsed.context,
          ...parsed,
        },
      })
    } catch (error) {
      console.error('[LOG-COLLECTOR] Failed to parse Pino log:', error)
    }
  }

  /**
   * Ajouter un log manuellement
   */
  addLog(log: LogEntry): void {
    this.logs.push(log)
  }

  /**
   * Ajouter un log réseau manuellement
   */
  addNetworkLog(log: NetworkLog): void {
    this.networkLogs.push(log)
  }

  /**
   * Récupérer tous les logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * Récupérer les logs réseau
   */
  getNetworkLogs(): NetworkLog[] {
    return [...this.networkLogs]
  }

  /**
   * Récupérer les logs par source
   */
  getLogsBySource(source: LogEntry['source']): LogEntry[] {
    return this.logs.filter((log) => log.source === source)
  }

  /**
   * Récupérer les logs par niveau
   */
  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter((log) => log.level === level)
  }

  /**
   * Récupérer les erreurs
   */
  getErrors(): LogEntry[] {
    return this.getLogsByLevel('error')
  }

  /**
   * Sauvegarder tous les logs dans des fichiers
   */
  async saveLogs(): Promise<void> {
    try {
      // Sauvegarder logs console
      await this.saveLogsToFile(
        this.logPaths.console,
        this.getLogsBySource('console')
      )

      // Sauvegarder logs server
      await this.saveLogsToFile(
        this.logPaths.server,
        this.getLogsBySource('server')
      )

      // Sauvegarder logs Supabase
      await this.saveLogsToFile(
        this.logPaths.supabase,
        this.getLogsBySource('supabase')
      )

      // Sauvegarder logs Pino
      await this.saveLogsToFile(
        this.logPaths.pino,
        this.getLogsBySource('pino')
      )

      // Sauvegarder logs réseau
      await this.saveNetworkLogs()

      console.log(`✅ [LOG-COLLECTOR] Logs saved to: ${this.logPaths.baseDir}`)
    } catch (error) {
      console.error('[LOG-COLLECTOR] Failed to save logs:', error)
    }
  }

  /**
   * Sauvegarder des logs dans un fichier
   */
  private async saveLogsToFile(
    filePath: string,
    logs: LogEntry[]
  ): Promise<void> {
    const content = logs
      .map(
        (log) =>
          `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}${
            log.metadata ? '\n' + JSON.stringify(log.metadata, null, 2) : ''
          }`
      )
      .join('\n\n')

    await fs.writeFile(filePath, content, 'utf-8')
  }

  /**
   * Sauvegarder les logs réseau
   */
  private async saveNetworkLogs(): Promise<void> {
    const filePath = path.join(this.logPaths.baseDir, 'network.log')
    const content = this.networkLogs
      .map((log) => {
        const parts = [
          `[${log.timestamp}] ${log.method} ${log.url}`,
          log.status ? ` → ${log.status}` : '',
          log.duration ? ` (${log.duration}ms)` : '',
        ]

        let result = parts.join('')

        if (log.requestBody) {
          result += '\nRequest Body:\n' + JSON.stringify(log.requestBody, null, 2)
        }

        if (log.responseBody) {
          result += '\nResponse Body:\n' + JSON.stringify(log.responseBody, null, 2)
        }

        return result
      })
      .join('\n\n')

    await fs.writeFile(filePath, content, 'utf-8')
  }

  /**
   * Créer les répertoires de logs
   */
  private async ensureLogDirectories(): Promise<void> {
    await fs.mkdir(this.logPaths.baseDir, { recursive: true })
    await fs.mkdir(this.logPaths.screenshots, { recursive: true })
    await fs.mkdir(this.logPaths.emails, { recursive: true })
  }

  /**
   * Générer un rapport Markdown
   */
  async generateReport(testResult: {
    passed: boolean
    duration: number
    error?: string
    healingAttempts?: number
  }): Promise<void> {
    const errors = this.getErrors()
    const networkErrors = this.networkLogs.filter((log) => log.status && log.status >= 400)

    const report = `# Test Report: ${this.testName}

## Summary

- **Status**: ${testResult.passed ? '✅ PASSED' : '❌ FAILED'}
- **Duration**: ${testResult.duration}ms
- **Healing Attempts**: ${testResult.healingAttempts || 0}
${testResult.error ? `- **Error**: ${testResult.error}` : ''}

## Statistics

- **Total Logs**: ${this.logs.length}
- **Errors**: ${errors.length}
- **Network Requests**: ${this.networkLogs.length}
- **Network Errors**: ${networkErrors.length}

## Errors

${
  errors.length > 0
    ? errors
        .map(
          (err) => `### ${err.timestamp}
\`\`\`
${err.message}
\`\`\`
${err.metadata ? '**Metadata**:\n```json\n' + JSON.stringify(err.metadata, null, 2) + '\n```' : ''}
`
        )
        .join('\n')
    : '_No errors recorded_'
}

## Network Errors

${
  networkErrors.length > 0
    ? networkErrors
        .map(
          (net) => `### ${net.method} ${net.url}
- **Status**: ${net.status}
- **Duration**: ${net.duration}ms
${net.responseBody ? '**Response**:\n```json\n' + JSON.stringify(net.responseBody, null, 2) + '\n```' : ''}
`
        )
        .join('\n')
    : '_No network errors_'
}

## Full Logs

See detailed logs in:
- [Console Logs](./console.log)
- [Server Logs](./server.log)
- [Supabase Logs](./supabase.log)
- [Pino Logs](./pino.log)
- [Network Logs](./network.log)
`

    await fs.writeFile(this.logPaths.report, report, 'utf-8')
    console.log(`📄 [LOG-COLLECTOR] Report generated: ${this.logPaths.report}`)
  }

  /**
   * Nettoyer les ressources
   */
  async cleanup(): Promise<void> {
    if (this.page) {
      this.page.removeAllListeners('console')
      this.page.removeAllListeners('pageerror')
      this.page.removeAllListeners('request')
    }
  }
}

/**
 * Factory pour créer un LogCollector
 */
export const createLogCollector = (testName: string): LogCollector => {
  return new LogCollector(testName)
}

export default LogCollector
