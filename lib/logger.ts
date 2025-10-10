import type { BaseLogger } from './logger-types'
import { clientLogger } from './logger-client'

// Sélection d'implémentation sans importer Pino côté client
const isBrowser = typeof window !== 'undefined'
let serverLoggerCache: BaseLogger | null = null

const getServerLogger = (): BaseLogger => {
  if (!serverLoggerCache) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createServerLogger } = require('./logger-server') as typeof import('./logger-server')
    serverLoggerCache = createServerLogger()
  }
  return serverLoggerCache
}

// Logger principal
export const logger: BaseLogger = isBrowser ? clientLogger : getServerLogger()

// Loggers spécialisés pour différents contextes
export const createContextLogger = (context: string) => (isBrowser ? clientLogger.child({ context }) : getServerLogger().child({ context }))

// Loggers spécialisés pour les différents domaines de l'application
export const authLogger = createContextLogger('auth')
export const supabaseLogger = createContextLogger('supabase')
export const interventionLogger = createContextLogger('intervention')
export const dashboardLogger = createContextLogger('dashboard')
export const testLogger = createContextLogger('test')

// Fonctions utilitaires pour les logs courants
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logUserAction = (action: string, userId?: string, metadata?: Record<string, any>) => {
  logger.info({
    type: 'user_action',
    action,
    userId,
    metadata
  }, `👤 User action: ${action}`)
}

export const logApiCall = (method: string, endpoint: string, statusCode?: number, duration?: number) => {
  logger.info({
    type: 'api_call',
    method,
    endpoint,
    statusCode,
    duration
  }, `🌐 API ${method} ${endpoint} ${statusCode ? `(${statusCode})` : ''}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logError = (error: Error, context?: string, metadata?: Record<string, any>) => {
  logger.error({
    type: 'error',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    context,
    metadata
  }, `❌ Error${context ? ` in ${context}` : ''}: ${error.message}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logSupabaseOperation = (operation: string, table: string, success: boolean, metadata?: Record<string, any>) => {
  const emoji = success ? '✅' : '❌'
  const payload = {
    type: 'supabase_operation',
    operation,
    table,
    success,
    metadata
  }
  if (success) {
    logger.info(payload, `${emoji} Supabase ${operation} on ${table}`)
  } else {
    logger.error(payload, `${emoji} Supabase ${operation} on ${table}`)
  }
}

// Hook pour capturer les erreurs non gérées
export const setupGlobalErrorHandling = () => {
  if (typeof window !== 'undefined') {
    // Erreurs JavaScript non capturées
    window.addEventListener('error', (event) => {
      logError(new Error(event.message), 'global_error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
    })

    // Promesses rejetées non capturées
    window.addEventListener('unhandledrejection', (event) => {
      logError(new Error(event.reason), 'unhandled_promise_rejection', {
        reason: event.reason
      })
    })
  }
}

// Types pour TypeScript
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
export type LogContext = 'auth' | 'supabase' | 'intervention' | 'dashboard' | 'test' | 'api' | 'ui'

export default logger

